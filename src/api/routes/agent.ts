import { Router } from 'express';
import { validateTaskRequest } from '../validators/taskRequest';
import { taskExecutor } from '../../orchestrator/executor';
import { AgentLogger } from '../../core/logger';
import { TaskExecutionError, TaskNotFoundError, AgentNotFoundError } from '../../core/errors';
import { verifyApiKey, verifyBrandAccess } from '../middleware/auth';
import { rateLimit } from '../middleware/rateLimit';

const router = Router();
const logger = new AgentLogger('AgentRoutes');

// Apply rate limiting
const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: Number(process.env.API_RATE_LIMIT) || 100
});

// Apply authentication (optional, enabled per route)
const useAuth = process.env.REQUIRE_API_KEY === 'true';

/**
 * Run a task
 * POST /agent/run
 */
router.post(
  '/run',
  apiRateLimit,
  ...(useAuth ? [verifyApiKey, verifyBrandAccess] : []),
  validateTaskRequest,
  async (req, res) => {
    try {
      const { task, brand, parameters, priority, callback } = req.body;
      
      logger.info(`Received task execution request for ${task}`, {
        taskType: task,
        brand
      });
      
      // Submit task to executor
      const executionId = await taskExecutor.submitTask({
        taskType: task,
        brand,
        parameters,
        priority: priority || 'medium',
        callback
      });
      
      return res.status(202).json({
        executionId,
        status: 'accepted',
        message: 'Task accepted for processing'
      });
    } catch (error) {
      if (error instanceof TaskNotFoundError) {
        return res.status(404).json({
          status: 'error',
          code: 'TASK_NOT_FOUND',
          message: error.message
        });
      }
      
      if (error instanceof AgentNotFoundError) {
        return res.status(404).json({
          status: 'error',
          code: 'AGENT_NOT_FOUND',
          message: error.message
        });
      }
      
      logger.error(`Error submitting task: ${(error as Error).message}`);
      
      return res.status(500).json({
        status: 'error',
        code: 'TASK_SUBMISSION_ERROR',
        message: (error as Error).message || 'Failed to submit task'
      });
    }
  }
);

/**
 * Get task status
 * GET /agent/status/:executionId
 */
router.get(
  '/status/:executionId',
  apiRateLimit,
  ...(useAuth ? [verifyApiKey] : []),
  async (req, res) => {
    try {
      const { executionId } = req.params;
      
      logger.info(`Checking status for task ${executionId}`);
      
      const status = await taskExecutor.getTaskStatus(executionId);
      
      return res.status(200).json({
        executionId,
        ...status
      });
    } catch (error) {
      if (error instanceof TaskNotFoundError) {
        return res.status(404).json({
          status: 'error',
          code: 'TASK_NOT_FOUND',
          message: error.message
        });
      }
      
      logger.error(`Error getting task status: ${(error as Error).message}`, {
        executionId: req.params.executionId
      });
      
      return res.status(500).json({
        status: 'error',
        code: 'STATUS_CHECK_ERROR',
        message: (error as Error).message || 'Failed to get task status'
      });
    }
  }
);

/**
 * Get task result
 * GET /agent/result/:executionId
 */
router.get(
  '/result/:executionId',
  apiRateLimit,
  ...(useAuth ? [verifyApiKey] : []),
  async (req, res) => {
    try {
      const { executionId } = req.params;
      
      logger.info(`Retrieving result for task ${executionId}`);
      
      const result = await taskExecutor.getTaskResult(executionId);
      
      if (!result) {
        return res.status(404).json({
          status: 'error',
          code: 'RESULT_NOT_FOUND',
          message: 'Task result not found'
        });
      }
      
      return res.status(200).json({
        executionId,
        ...result
      });
    } catch (error) {
      if (error instanceof TaskNotFoundError) {
        return res.status(404).json({
          status: 'error',
          code: 'TASK_NOT_FOUND',
          message: error.message
        });
      }
      
      logger.error(`Error getting task result: ${(error as Error).message}`, {
        executionId: req.params.executionId
      });
      
      return res.status(500).json({
        status: 'error',
        code: 'RESULT_RETRIEVAL_ERROR',
        message: (error as Error).message || 'Failed to get task result'
      });
    }
  }
);

/**
 * Cancel task
 * DELETE /agent/cancel/:executionId
 */
router.delete(
  '/cancel/:executionId',
  apiRateLimit,
  ...(useAuth ? [verifyApiKey] : []),
  async (req, res) => {
    try {
      const { executionId } = req.params;
      
      logger.info(`Cancelling task ${executionId}`);
      
      const success = await taskExecutor.cancelTask(executionId);
      
      if (!success) {
        return res.status(400).json({
          status: 'error',
          code: 'CANNOT_CANCEL',
          message: 'Task not found or already completed'
        });
      }
      
      return res.status(200).json({
        executionId,
        status: 'cancelled',
        message: 'Task cancelled successfully'
      });
    } catch (error) {
      if (error instanceof TaskNotFoundError) {
        return res.status(404).json({
          status: 'error',
          code: 'TASK_NOT_FOUND',
          message: error.message
        });
      }
      
      logger.error(`Error cancelling task: ${(error as Error).message}`, {
        executionId: req.params.executionId
      });
      
      return res.status(500).json({
        status: 'error',
        code: 'CANCEL_ERROR',
        message: (error as Error).message || 'Failed to cancel task'
      });
    }
  }
);

export default router;