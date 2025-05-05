import { SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { getSupabaseClient } from '../db/client';
import { AgentLogger } from './logger';

export interface AgentConfig {
  name: string;
  description: string;
  version: string;
  capabilities: string[];
}

export interface TaskContext {
  executionId: string;
  taskType: string;
  brand?: string;
  userId?: string;
  parameters: Record<string, any>;
  priority: string;
  brandConfig?: any;
  taskConfig?: any;
  metadata?: Record<string, any>;
}

export interface TaskResult {
  success: boolean;
  output: Record<string, any>;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

/**
 * Base Agent class that all specific agents should extend
 */
export abstract class BaseAgent {
  protected id: string;
  protected name: string;
  protected description: string;
  protected version: string;
  protected capabilities: string[];
  protected logger: AgentLogger;
  protected db: SupabaseClient;
  
  constructor(config: AgentConfig) {
    this.id = uuidv4();
    this.name = config.name;
    this.description = config.description;
    this.version = config.version;
    this.capabilities = config.capabilities;
    this.logger = new AgentLogger(this.name);
    this.db = getSupabaseClient();
  }
  
  /**
   * Returns agent metadata
   */
  public getInfo() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      version: this.version,
      capabilities: this.capabilities
    };
  }
  
  /**
   * Checks if agent can execute a specific task type
   */
  public canExecute(taskType: string): boolean {
    return this.capabilities.includes(taskType);
  }
  
  /**
   * Validates the incoming task context before execution
   */
  protected async validateTaskContext(context: TaskContext): Promise<void> {
    // Base validation that all agents should perform
    if (!context.taskType) {
      throw new Error('Task type is required');
    }

    if (!context.parameters) {
      throw new Error('Task parameters are required');
    }

    // Each agent implementation should extend this with specific validation
  }
  
  /**
   * Execute a task (must be implemented by derived agents)
   */
  public abstract executeTask(context: TaskContext): Promise<any>;
  
  /**
   * Main entry point for task handling with error handling and metrics
   */
  public async handleTask(context: TaskContext): Promise<TaskResult> {
    // Ensure we have an execution ID
    if (!context.executionId) {
      context.executionId = uuidv4();
    }

    const startTime = Date.now();

    try {
      // Log task start
      this.logger.info(`Starting task execution`, {
        executionId: context.executionId,
        taskType: context.taskType,
        brand: context.brand
      });

      // Validate the task context
      await this.validateTaskContext(context);
      
      // Update status to running
      await this.updateTaskStatus(context.executionId, 'running');

      // Execute the task (implemented by specific agent)
      const result = await this.executeTask(context);

      // Calculate duration
      const durationMs = Date.now() - startTime;

      // Log task completion
      this.logger.info(`Task execution completed`, {
        executionId: context.executionId,
        durationMs
      });

      // Update status to completed
      await this.updateTaskStatus(context.executionId, 'completed', result);

      return {
        success: true,
        output: result
      };
    } catch (error) {
      // Calculate duration even for errors
      const durationMs = Date.now() - startTime;

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Log task failure
      this.logger.error(`Task execution failed: ${errorMessage}`, {
        executionId: context.executionId,
        durationMs
      });

      // Update status to failed
      await this.updateTaskStatus(context.executionId, 'failed', null, errorMessage);

      return {
        success: false,
        output: {},
        error: {
          code: 'EXECUTION_ERROR',
          message: errorMessage,
          details: { stack: error instanceof Error ? error.stack : undefined }
        }
      };
    }
  }
  
  /**
   * Updates the execution status in the database
   */
  protected async updateTaskStatus(executionId: string, status: string, result?: any, error?: string): Promise<void> {
    try {
      const updateData: any = { status };
      
      if (result) {
        updateData.result = result;
      }
      
      if (error) {
        updateData.error = error;
      }
      
      if (status === 'completed' || status === 'failed') {
        updateData.completed_at = new Date().toISOString();
      }
      
      const { error: dbError } = await this.db
        .from('task_executions')
        .update(updateData)
        .eq('id', executionId);
      
      if (dbError) {
        this.logger.error(`Failed to update task status: ${dbError.message}`, {
          executionId,
          status
        });
      }
    } catch (error) {
      this.logger.error(`Error updating task status: ${(error as Error).message}`, {
        executionId,
        status
      });
    }
  }
  
  /**
   * Gets brand-specific configuration value
   */
  protected getBrandConfigValue<T>(context: TaskContext, path: string, defaultValue: T): T {
    if (!context.brandConfig) {
      return defaultValue;
    }
    
    const parts = path.split('.');
    let current: any = context.brandConfig;
    
    for (const part of parts) {
      if (current === undefined || current === null || typeof current !== 'object') {
        return defaultValue;
      }
      current = current[part];
    }
    
    return current !== undefined ? current : defaultValue;
  }
  
  /**
   * Logs agent activity to the database
   */
  protected async logActivity(executionId: string, level: string, message: string, metadata?: any): Promise<void> {
    try {
      const { error } = await this.db
        .from('agent_logs')
        .insert({
          execution_id: executionId,
          agent_id: this.id,
          level,
          message,
          metadata: metadata || {},
          timestamp: new Date().toISOString()
        });
      
      if (error) {
        console.error(`Failed to log agent activity: ${error.message}`);
      }
    } catch (error) {
      console.error(`Error logging agent activity: ${(error as Error).message}`);
    }
  }
}
