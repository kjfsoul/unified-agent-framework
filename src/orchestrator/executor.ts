import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from '../db/client';
import { registry } from '../registry';
import { taskQueue } from './queue';
import { taskRouter } from './router';
import { AgentLogger } from '../core/logger';
import { TaskExecutionError, TaskNotFoundError, AgentNotFoundError } from '../core/errors';
import { brandConfig } from '../brands';
import { metricsManager } from '../core/metrics';

const logger = new AgentLogger('TaskExecutor');

export class TaskExecutor {
  private db = getSupabaseClient();
  
  constructor() {
    this.setupTaskProcessors();
  }
  
  /**
   * Submit a new task for execution
   */
  public async submitTask(params: {
    taskType: string;
    brand?: string;
    parameters: Record<string, any>;
    priority: string;
    callback?: string;
  }): Promise<string> {
    const { taskType, brand, parameters, priority, callback } = params;
    
    // Generate execution ID
    const executionId = uuidv4();
    
    logger.info(`Submitting task ${taskType}`, {
      executionId,
      taskType,
      brand,
      priority
    });
    
    try {
      // Validate task type
      const taskDefinition = await this.getTaskDefinition(taskType);
      if (!taskDefinition) {
        throw new TaskNotFoundError(taskType);
      }
      
      // Route the task to appropriate agent and apply brand-specific settings
      const { agentId, taskConfig } = await taskRouter.routeTask(taskType, brand);
      
      // Process parameters with brand-specific defaults
      const processedParameters = await taskRouter.processTaskParameters(taskType, parameters, brand);
      
      // Calculate effective priority
      const effectivePriority = priority || taskConfig.priority || 'medium';
      
      // Record task execution in database
      await this.db.from('task_executions').insert({
        id: executionId,
        task_id: taskDefinition.id,
        agent_id: agentId,
        brand: brand || null,
        parameters: processedParameters,
        status: 'pending',
        priority: effectivePriority,
        created_at: new Date().toISOString()
      });
      
      // Add task to queue
      await taskQueue.addTask(taskType, executionId, {
        taskType,
        brand,
        parameters: processedParameters,
        callback,
        priority: effectivePriority,
        config: taskConfig
      }, effectivePriority);
      
      return executionId;
    } catch (error) {
      logger.error(`Failed to submit task: ${(error as Error).message}`, {
        executionId,
        taskType
      });
      
      if (error instanceof TaskNotFoundError || error instanceof AgentNotFoundError) {
        throw error;
      }
      
      throw new TaskExecutionError(`Failed to submit task: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get the status of a task
   */
  public async getTaskStatus(executionId: string): Promise<any> {
    try {
      const { data, error } = await this.db
        .from('task_executions')
        .select('status, created_at, started_at, completed_at')
        .eq('id', executionId)
        .single();
      
      if (error) {
        logger.error(`Failed to get task status: ${error.message}`, { executionId });
        throw new TaskExecutionError(`Failed to get task status: ${error.message}`);
      }
      
      if (!data) {
        throw new TaskNotFoundError(`Task execution not found: ${executionId}`);
      }
      
      return {
        status: data.status,
        createdAt: data.created_at,
        startedAt: data.started_at,
        completedAt: data.completed_at
      };
    } catch (error) {
      if (error instanceof TaskNotFoundError) {
        throw error;
      }
      
      logger.error(`Error getting task status: ${(error as Error).message}`, { executionId });
      throw new TaskExecutionError(`Error getting task status: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get the result of a completed task
   */
  public async getTaskResult(executionId: string): Promise<any> {
    try {
      const { data, error } = await this.db
        .from('task_executions')
        .select('status, result, error, completed_at')
        .eq('id', executionId)
        .single();
      
      if (error) {
        logger.error(`Failed to get task result: ${error.message}`, { executionId });
        throw new TaskExecutionError(`Failed to get task result: ${error.message}`);
      }
      
      if (!data) {
        throw new TaskNotFoundError(`Task execution not found: ${executionId}`);
      }
      
      if (data.status !== 'completed' && data.status !== 'failed') {
        return {
          status: data.status,
          message: 'Task execution is still in progress'
        };
      }
      
      return {
        status: data.status,
        result: data.result,
        error: data.error,
        completedAt: data.completed_at
      };
    } catch (error) {
      if (error instanceof TaskNotFoundError) {
        throw error;
      }
      
      logger.error(`Error getting task result: ${(error as Error).message}`, { executionId });
      throw new TaskExecutionError(`Error getting task result: ${(error as Error).message}`);
    }
  }
  
  /**
   * Cancel a task that is pending or in progress
   */
  public async cancelTask(executionId: string): Promise<boolean> {
    try {
      // Get current task status
      const { data, error } = await this.db
        .from('task_executions')
        .select('status')
        .eq('id', executionId)
        .single();
      
      if (error) {
        logger.error(`Failed to get task: ${error.message}`, { executionId });
        throw new TaskExecutionError(`Failed to get task: ${error.message}`);
      }
      
      if (!data) {
        throw new TaskNotFoundError(`Task execution not found: ${executionId}`);
      }
      
      // Can only cancel pending or running tasks
      if (data.status !== 'pending' && data.status !== 'running') {
        return false;
      }
      
      // Get job ID from task
      const { data: taskData, error: taskError } = await this.db
        .from('agent_logs')
        .select('metadata')
        .eq('execution_id', executionId)
        .eq('message', 'Task added to queue')
        .single();
      
      if (!taskError && taskData && taskData.metadata && taskData.metadata.jobId) {
        // Remove from queue if we have the job ID
        await taskQueue.cancelJob(taskData.metadata.jobId);
      }
      
      // Update task status
      const { error: updateError } = await this.db
        .from('task_executions')
        .update({
          status: 'cancelled',
          completed_at: new Date().toISOString()
        })
        .eq('id', executionId);
      
      if (updateError) {
        logger.error(`Failed to update task status: ${updateError.message}`, { executionId });
        throw new TaskExecutionError(`Failed to update task status: ${updateError.message}`);
      }
      
      logger.info(`Task ${executionId} cancelled successfully`);
      return true;
    } catch (error) {
      if (error instanceof TaskNotFoundError) {
        throw error;
      }
      
      logger.error(`Error cancelling task: ${(error as Error).message}`, { executionId });
      throw new TaskExecutionError(`Error cancelling task: ${(error as Error).message}`);
    }
  }
  
  /**
   * Setup task processors for different task types
   */
  private setupTaskProcessors(): void {
    // Register a generic processor for all task types
    taskQueue.processTask('*', 5, async (job) => {
      const { executionId, taskType, brand, parameters, priority, config } = job.data;
      
      logger.info(`Processing task ${taskType}`, {
        executionId,
        jobId: job.id,
        taskType,
        brand
      });
      
      const startTime = Date.now();
      
      try {
        // Update task status to running
        await this.db
          .from('task_executions')
          .update({
            status: 'running',
            started_at: new Date().toISOString()
          })
          .eq('id', executionId);
        
        // Find an agent that can execute this task
        const agent = registry.findAgentForTask(taskType);
        if (!agent) {
          throw new AgentNotFoundError(`No agent available to execute task type: ${taskType}`);
        }
        
        // Get brand-specific configuration if needed
        let brandData = null;
        if (brand) {
          brandData = await brandConfig.getBrandConfig(brand);
        }
        
        // Execute the task
        const result = await agent.executeTask({
          executionId,
          taskType,
          brand,
          parameters,
          priority: priority || 'medium',
          brandConfig: brandData?.config,
          taskConfig: config
        });
        
        // Update task status to completed
        await this.db
          .from('task_executions')
          .update({
            status: 'completed',
            result,
            completed_at: new Date().toISOString()
          })
          .eq('id', executionId);
        
        // Record metrics
        const duration = Date.now() - startTime;
        metricsManager.recordTaskExecutionTime(taskType, brand, duration);
        metricsManager.recordTaskResult(taskType, brand, true);
        
        logger.info(`Task ${taskType} completed successfully`, {
          executionId,
          jobId: job.id,
          duration
        });
        
        // Send callback if provided
        if (job.data.callback) {
          await this.sendCallback(job.data.callback, {
            executionId,
            status: 'completed',
            result
          });
        }
        
        return result;
      } catch (error) {
        const errorMessage = (error as Error).message;
        
        logger.error(`Task ${taskType} failed: ${errorMessage}`, {
          executionId,
          jobId: job.id,
          error: errorMessage
        });
        
        // Update task status to failed
        await this.db
          .from('task_executions')
          .update({
            status: 'failed',
            error: errorMessage,
            completed_at: new Date().toISOString()
          })
          .eq('id', executionId);
        
        // Record metrics
        const duration = Date.now() - startTime;
        metricsManager.recordTaskExecutionTime(taskType, brand, duration);
        metricsManager.recordTaskResult(taskType, brand, false);
        
        // Send callback if provided
        if (job.data.callback) {
          await this.sendCallback(job.data.callback, {
            executionId,
            status: 'failed',
            error: errorMessage
          });
        }
        
        throw error;
      }
    });
  }
  
  /**
   * Get task definition from database
   */
  private async getTaskDefinition(taskType: string): Promise<any> {
    try {
      const { data, error } = await this.db
        .from('tasks')
        .select('*')
        .eq('type', taskType)
        .single();
      
      if (error) {
        logger.error(`Failed to get task definition: ${error.message}`, { taskType });
        throw new TaskExecutionError(`Failed to get task definition: ${error.message}`);
      }
      
      if (!data) {
        throw new TaskNotFoundError(taskType);
      }
      
      return data;
    } catch (error) {
      if (error instanceof TaskNotFoundError) {
        throw error;
      }
      
      logger.error(`Error getting task definition: ${(error as Error).message}`, { taskType });
      throw new TaskExecutionError(`Error getting task definition: ${(error as Error).message}`);
    }
  }
  
  /**
   * Send callback to notify of task completion
   */
  private async sendCallback(url: string, data: any): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        logger.error(`Failed to send callback to ${url}: ${response.statusText}`);
      } else {
        logger.info(`Sent callback to ${url}`);
      }
    } catch (error) {
      logger.error(`Error sending callback to ${url}: ${(error as Error).message}`);
    }
  }
}

// Export singleton instance
export const taskExecutor = new TaskExecutor();

export default {
  TaskExecutor,
  taskExecutor
};