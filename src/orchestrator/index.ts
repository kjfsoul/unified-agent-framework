import { TaskExecutor, taskExecutor } from './executor';
import { TaskQueue, taskQueue, TaskPriority } from './queue';
import { TaskRouter, taskRouter } from './router';

/**
 * Initialize the task orchestrator
 */
export async function initializeOrchestrator(): Promise<void> {
  console.log('Initializing task orchestrator');
}

export {
  TaskExecutor,
  taskExecutor,
  TaskQueue,
  taskQueue,
  TaskPriority,
  TaskRouter,
  taskRouter
};