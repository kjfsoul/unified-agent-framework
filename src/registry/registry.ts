import { BaseAgent } from '../core/agent';
import { AgentLogger } from '../core/logger';

export class AgentRegistry {
  private agents: Map<string, BaseAgent> = new Map();
  private logger = new AgentLogger('AgentRegistry');
  
  /**
   * Register an agent with the registry
   */
  public registerAgent(agent: BaseAgent): void {
    const agentInfo = agent.getInfo();
    this.agents.set(agentInfo.id, agent);
    this.logger.info(`Registered agent: ${agentInfo.name} (${agentInfo.id})`);
  }
  
  /**
   * Find an agent that can execute a specific task type
   */
  public findAgentForTask(taskType: string): BaseAgent | null {
    for (const agent of this.agents.values()) {
      if (agent.canExecute(taskType)) {
        return agent;
      }
    }
    
    this.logger.warn(`No agent found for task type: ${taskType}`);
    return null;
  }
  
  /**
   * Get all registered agents
   */
  public getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }
  
  /**
   * Get agent by ID
   */
  public getAgentById(agentId: string): BaseAgent | null {
    return this.agents.get(agentId) || null;
  }
  
  /**
   * Remove an agent from the registry
   */
  public unregisterAgent(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (agent) {
      this.logger.info(`Unregistered agent: ${agent.getInfo().name} (${agentId})`);
    }
    return this.agents.delete(agentId);
  }
}

// Create singleton instance
export const registry = new AgentRegistry();

export default {
  AgentRegistry,
  registry
};