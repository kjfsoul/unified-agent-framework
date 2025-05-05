import Queue from 'bull';
import { AgentLogger } from '../core/logger';
import { TaskExecutionError } from '../core/errors';

// Initialize logger
const logger = new AgentLogger('TaskQueue');

// Define task priorities
export enum TaskPriority {
  HIGHEST = 1,
  HIGH = 5,
  MEDIUM = 10,
  LOW = 15,
  LOWEST = 20,
}

// Define queue options
const defaultQueueOptions = {
  defaultJobOptions: {
    attempts: Number(process.env.AGENT_MAX_RETRIES) || 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
};

export class TaskQueue {
  private queue: Queue.Queue;
  
  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.queue = new Queue('tasks', redisUrl, defaultQueueOptions);
    
    // Handle queue errors
    this.queue.on('error', (err: Error) => {
      logger.error(`Task queue error: ${err.message}`);
    });
    
    this.queue.on('failed', (job: Queue.Job, err: Error) => {
      logger.error(`Job ${job.id} failed: ${err.message}`, {
        jobId: job.id,
        taskType: job.data.taskType,
        executionId: job.data.executionId,
        error: err.message,
      });
    });
  }
  
  /**
   * Add a task to the queue
   */
  public async addTask(
    taskType: string,
    executionId: string,
    data: any,
    priority: string = 'medium'
  ): Promise<string> {
    try {
      const numericPriority = this.getPriorityValue(priority);
      
      const job = await this.queue.add(
        taskType,
        {
          executionId,
          ...data,
        },
        {
          priority: numericPriority,
        }
      );
      
      logger.info(`Added task ${taskType} to queue with ID ${job.id}`, {
        executionId,
        taskType,
        jobId: job.id,
      });
      
      return job.id as string;
    } catch (error) {
      logger.error(`Failed to add task to queue: ${(error as Error).message}`, {
        executionId,
        taskType,
      });
      
      throw new TaskExecutionError(`Failed to queue task: ${(error as Error).message}`);
    }
  }
  
  /**
   * Process tasks of a specific type
   */
  public processTask(
    taskType: string,
    concurrency: number,
    processor: (job: Queue.Job) => Promise<any>
  ): void {
    this.queue.process(taskType, concurrency, processor);
    logger.info(`Registered processor for task type ${taskType} with concurrency ${concurrency}`);
  }
  
  /**
   * Get a task from the queue by ID
   */
  public async getJob(jobId: string): Promise<Queue.Job | null> {
    return this.queue.getJob(jobId);
  }
  
  /**
   * Get the status of a job
   */
  public async getJobStatus(jobId: string): Promise<string> {
    const job = await this.getJob(jobId);
    
    if (!job) {
      return 'not_found';
    }
    
    const state = await job.getState();
    return state;
  }
  
  /**
   * Cancel a job by ID
   */
  public async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.getJob(jobId);
    
    if (!job) {
      return false;
    }
    
    const state = await job.getState();
    
    if (state === 'completed' || state === 'failed') {
      return false;
    }
    
    await job.remove();
    return true;
  }
  
  /**
   * Convert string priority to numeric value
   */
  private getPriorityValue(priority: string): number {
    switch (priority.toLowerCase()) {
      case 'highest':
        return TaskPriority.HIGHEST;
      case 'high':
        return TaskPriority.HIGH;
      case 'medium':
        return TaskPriority.MEDIUM;
      case 'low':
        return TaskPriority.LOW;
      case 'lowest':
        return TaskPriority.LOWEST;
      default:
        return TaskPriority.MEDIUM;
    }
  }
  
  /**
   * Close the queue (used for cleanup)
   */
  public async close(): Promise<void> {
    await this.queue.close();
    logger.info('Task queue closed');
  }
}

// Export singleton instance
export const taskQueue = new TaskQueue();

export default {
  TaskQueue,
  taskQueue,
  TaskPriority,
};