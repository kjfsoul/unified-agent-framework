import { AgentLogger } from '../core/logger';
import { TaskNotFoundError } from '../core/errors';
import { brandConfig } from '../brands';
import { registry } from '../registry';

/**
 * Task Router handles brand-specific task routing and agent selection
 */
export class TaskRouter {
  private logger = new AgentLogger('TaskRouter');
  
  /**
   * Find the appropriate agent for a task and apply brand-specific settings
   */
  public async routeTask(taskType: string, brand?: string): Promise<{
    agentId: string;
    taskConfig: any;
  }> {
    this.logger.info(`Routing task ${taskType}${brand ? ` for brand ${brand}` : ''}`);
    
    try {
      // Find an agent that can handle this task
      const agent = registry.findAgentForTask(taskType);
      
      if (!agent) {
        this.logger.error(`No agent found for task type: ${taskType}`);
        throw new TaskNotFoundError(`No agent found for task type: ${taskType}`);
      }
      
      // Get agent ID
      const agentId = agent.getInfo().id;
      
      // Get task configuration
      let taskConfig = {
        priority: 'medium',
        timeout: 60000,
        retries: 3
      };
      
      // Apply brand-specific settings if a brand is specified
      if (brand) {
        taskConfig = await brandConfig.getTaskConfig(brand, taskType);
      }
      
      return {
        agentId,
        taskConfig
      };
    } catch (error) {
      if (error instanceof TaskNotFoundError) {
        throw error;
      }
      
      this.logger.error(`Error routing task: ${(error as Error).message}`);
      throw new Error(`Error routing task: ${(error as Error).message}`);
    }
  }
  
  /**
   * Process task parameters with brand-specific defaults
   */
  public async processTaskParameters(taskType: string, parameters: any, brand?: string): Promise<any> {
    try {
      // If no brand specified, return parameters as is
      if (!brand) {
        return parameters;
      }
      
      // Apply brand-specific parameter defaults
      return await brandConfig.getTaskParameters(brand, taskType, parameters);
    } catch (error) {
      this.logger.error(`Error processing task parameters: ${(error as Error).message}`);
      return parameters; // Return original parameters on error
    }
  }
}

// Export singleton instance
export const taskRouter = new TaskRouter();

export default {
  TaskRouter,
  taskRouter
};