import Joi from 'joi';
import { validateSchema } from '../../utils/validation';
import { TaskValidationError } from '../../core/errors';

/**
 * Joi schema for task execution request
 */
const taskRequestSchema = Joi.object({
  task: Joi.string().required().min(1).max(100),
  brand: Joi.string().optional().min(1).max(100),
  parameters: Joi.object().required(),
  priority: Joi.string().optional().valid('highest', 'high', 'medium', 'low', 'lowest').default('medium'),
  callback: Joi.string().optional().uri()
});

/**
 * Middleware to validate task execution request
 */
export function validateTaskRequest(req: any, res: any, next: any) {
  try {
    const validatedData = validateSchema(req.body, taskRequestSchema);
    req.body = validatedData;
    next();
  } catch (error) {
    if (error instanceof TaskValidationError) {
      return res.status(400).json({
        status: 'error',
        code: 'VALIDATION_ERROR',
        message: error.message,
        details: error.details
      });
    }
    next(error);
  }
}

export default {
  validateTaskRequest
};