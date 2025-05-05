import { RateLimitError } from '../../core/errors';
import { AgentLogger } from '../../core/logger';

const logger = new AgentLogger('RateLimitMiddleware');

// Simple in-memory rate limiter
// In production, use a Redis-based solution
const requestCounts: Record<string, { count: number, resetTime: number }> = {};

/**
 * Middleware to implement rate limiting
 */
export function rateLimit(options: {
  windowMs?: number,  // Time window in milliseconds
  max?: number,       // Maximum requests per windowMs
  keyGenerator?: (req: any) => string  // Function to generate rate limit key
}) {
  const windowMs = options.windowMs || 60 * 1000; // Default: 1 minute
  const max = options.max || 100; // Default: 100 requests per minute
  
  const keyGenerator = options.keyGenerator || ((req) => {
    // Default: use API key or IP address
    return req.headers['x-api-key'] || req.ip || 'unknown';
  });
  
  return (req: any, res: any, next: any) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    // Initialize or reset counter if window has passed
    if (!requestCounts[key] || now > requestCounts[key].resetTime) {
      requestCounts[key] = {
        count: 0,
        resetTime: now + windowMs
      };
    }
    
    // Increment counter
    requestCounts[key].count++;
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - requestCounts[key].count));
    res.setHeader('X-RateLimit-Reset', requestCounts[key].resetTime);
    
    // Check if over limit
    if (requestCounts[key].count > max) {
      logger.warn('Rate limit exceeded', {
        key,
        count: requestCounts[key].count,
        limit: max
      });
      
      const error = new RateLimitError('Rate limit exceeded');
      
      return res.status(error.status).json({
        status: 'error',
        code: error.code,
        message: error.message
      });
    }
    
    next();
  };
}

export default {
  rateLimit
};