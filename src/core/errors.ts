/**
 * Base error class for Agent Framework
 */
export class AgentFrameworkError extends Error {
  public code: string;
  public status: number;
  public details: any;

  constructor(message: string, code: string, status: number = 500, details?: any) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.status = status;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Task validation error
 */
export class TaskValidationError extends AgentFrameworkError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

/**
 * Task not found error
 */
export class TaskNotFoundError extends AgentFrameworkError {
  constructor(taskType: string) {
    super(`Task type not found: ${taskType}`, 'TASK_NOT_FOUND', 404);
  }
}

/**
 * Agent not found error
 */
export class AgentNotFoundError extends AgentFrameworkError {
  constructor(message: string) {
    super(message, 'AGENT_NOT_FOUND', 404);
  }
}

/**
 * Database error
 */
export class DatabaseError extends AgentFrameworkError {
  constructor(message: string, details?: any) {
    super(message, 'DATABASE_ERROR', 500, details);
  }
}

/**
 * Authentication error
 */
export class AuthenticationError extends AgentFrameworkError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

/**
 * Authorization error
 */
export class AuthorizationError extends AgentFrameworkError {
  constructor(message: string = 'Not authorized to perform this action') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends AgentFrameworkError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
  }
}

/**
 * Task execution error
 */
export class TaskExecutionError extends AgentFrameworkError {
  constructor(message: string, details?: any) {
    super(message, 'TASK_EXECUTION_ERROR', 500, details);
  }
}

/**
 * Brand configuration error
 */
export class BrandConfigError extends AgentFrameworkError {
  constructor(message: string) {
    super(message, 'BRAND_CONFIG_ERROR', 400);
  }
}

/**
 * Error handler middleware for Express
 */
export function errorHandler(err: any, req: any, res: any, next: any) {
  // Handle AgentFrameworkError instances
  if (err instanceof AgentFrameworkError) {
    return res.status(err.status).json({
      status: 'error',
      code: err.code,
      message: err.message,
      details: err.details
    });
  }
  
  // Handle other errors
  console.error('Unhandled error:', err);
  
  return res.status(500).json({
    status: 'error',
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred'
  });
}

export default {
  AgentFrameworkError,
  TaskValidationError,
  TaskNotFoundError,
  AgentNotFoundError,
  DatabaseError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  TaskExecutionError,
  BrandConfigError,
  errorHandler
};