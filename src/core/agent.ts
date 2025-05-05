import { v4 as uuidv4 } from 'uuid';
import { AgentLogger } from './logger';
import { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../db/client';

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
  parameters: Record<string, any>;
  priority: string;
  brandConfig?: any;
  taskConfig?: any;
}

export class BaseAgent {
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
   * Execute a task (must be implemented by derived agents)
   */
  public async executeTask(context: TaskContext): Promise<any> {
    throw new Error('Method not implemented. Derived agents must implement executeTask');
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