import express from 'express';
import routes from './routes';
import { errorHandler } from '../core/errors';
import { setupLogger } from '../core/logger';

/**
 * Setup API routes
 */
export function setupRoutes(app: express.Application): void {
  // Setup API routes
  app.use('/api', routes);
  
  // Handle 404
  app.use((req, res) => {
    res.status(404).json({
      status: 'error',
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.url}`
    });
  });
  
  // Error handler
  app.use(errorHandler);
}

export default {
  setupRoutes
};