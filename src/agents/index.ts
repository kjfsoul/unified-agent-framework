import { fileValidatorAgent } from './file-validator';
import { duplicateDetectorAgent } from './duplicate-detector';
import { tarotValidatorAgent } from './tarot-validator';
import { playlistValidatorAgent } from './playlist-validator';
import { messageValidatorAgent } from './message-validator';
import { registry } from '../registry';

/**
 * Register all agents with the registry
 */
export function registerAgents(): void {
  // Register file validator agent
  registry.registerAgent(fileValidatorAgent);
  
  // Register duplicate detector agent
  registry.registerAgent(duplicateDetectorAgent);
  
  // Register brand-specific agents
  registry.registerAgent(tarotValidatorAgent);    // Mystic Arcana
  registry.registerAgent(playlistValidatorAgent); // EDM Shuffle
  registry.registerAgent(messageValidatorAgent);  // BirthdayGen
  
  // Add more agents as they are implemented
}

export {
  fileValidatorAgent,
  duplicateDetectorAgent,
  tarotValidatorAgent,
  playlistValidatorAgent,
  messageValidatorAgent
};