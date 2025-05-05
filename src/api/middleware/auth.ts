import { getSupabaseClient } from '../../db/client';
import { AuthenticationError, AuthorizationError } from '../../core/errors';
import { AgentLogger } from '../../core/logger';

const logger = new AgentLogger('AuthMiddleware');

/**
 * Middleware to verify API key from brands table
 */
export async function verifyApiKey(req: any, res: any, next: any) {
  try {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      throw new AuthenticationError('API key is required');
    }
    
    const db = getSupabaseClient();
    
    // Check if API key exists in brands table
    const { data, error } = await db
      .from('brands')
      .select('key, name')
      .eq('api_key', apiKey)
      .single();
    
    if (error || !data) {
      logger.warn('Invalid API key used', {
        apiKey: apiKey.substring(0, 8) + '...',
        ip: req.ip
      });
      
      throw new AuthenticationError('Invalid API key');
    }
    
    // Add brand info to request
    req.brand = {
      key: data.key,
      name: data.name
    };
    
    logger.info('Authenticated request', {
      brand: data.key,
      ip: req.ip
    });
    
    next();
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return res.status(error.status).json({
        status: 'error',
        code: error.code,
        message: error.message
      });
    }
    
    // Log unexpected errors
    logger.error(`Authentication error: ${(error as Error).message}`);
    
    return res.status(500).json({
      status: 'error',
      code: 'AUTH_ERROR',
      message: 'Authentication failed'
    });
  }
}

/**
 * Middleware to verify brand-specific access
 */
export function verifyBrandAccess(req: any, res: any, next: any) {
  try {
    // Skip if not brand-specific request
    if (!req.body.brand) {
      return next();
    }
    
    // Check if authenticated brand matches requested brand
    if (req.brand && req.brand.key !== req.body.brand) {
      throw new AuthorizationError('Not authorized to access this brand');
    }
    
    next();
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return res.status(error.status).json({
        status: 'error',
        code: error.code,
        message: error.message
      });
    }
    
    next(error);
  }
}

export default {
  verifyApiKey,
  verifyBrandAccess
};