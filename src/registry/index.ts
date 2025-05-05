import { AgentRegistry } from './registry';

/**
 * Initialize the agent registry
 */
export async function initializeRegistry(): Promise<void> {
  console.log('Initializing agent registry');
  
  // Import and register all agents
  const { registerAgents } = await import('../agents');
  registerAgents();
}

// Export registry singleton
export const registry = new AgentRegistry();

export {
  AgentRegistry,
  registry
};
