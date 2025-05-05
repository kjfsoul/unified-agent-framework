import { AgentRegistry, registry } from './registry';

/**
 * Initialize the agent registry
 */
export async function initializeRegistry(): Promise<void> {
  console.log('Initializing agent registry');
  
  // Import and register all agents
  const { registerAgents } = await import('../agents');
  registerAgents();
}

export {
  AgentRegistry,
  registry
};