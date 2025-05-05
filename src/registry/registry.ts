import { BaseAgent } from '../core/agent';
import { AgentLogger } from '../core/logger';

export class AgentRegistry {
  private agents: Map<string, BaseAgent> = new Map();
  private logger = new AgentLogger('AgentRegistry');

  /**
   * Register an agent with the registry
   */
  public registerAgent(agent: BaseAgent): void {
    const agentInfo = agent.getConfig();
    this.agents.set(agentInfo.id, agent);
    this.logger.info(`Registered agent: ${agentInfo.name} (${agentInfo.id})`);
  }

  /**
   * Get an agent by ID
   */
  public getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  /**
   * Get all registered agents
   */
  public getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agents by capability
   */
  public getAgentsByCapability(capability: string): BaseAgent[] {
    return this.getAllAgents().filter(agent => 
      agent.hasCapability(capability)
    );
  }

  /**
   * Find agents that match a set of required capabilities
   */
  public findAgentsByCapabilities(capabilities: string[]): BaseAgent[] {
    return this.getAllAgents().filter(agent => 
      capabilities.every(capability => agent.hasCapability(capability))
    );
  }

  /**
   * Check if an agent is registered
   */
  public hasAgent(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  /**
   * Get the count of registered agents
   */
  public getAgentCount(): number {
    return this.agents.size;
  }

  /**
   * Remove an agent from the registry
   */
  public unregisterAgent(agentId: string): boolean {
    const agent = this.getAgent(agentId);
    if (agent) {
      this.agents.delete(agentId);
      this.logger.info(`Unregistered agent: ${agent.getConfig().name} (${agentId})`);
      return true;
    }
    return false;
  }
}
