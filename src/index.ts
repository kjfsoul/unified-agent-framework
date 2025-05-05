import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import { setupRoutes } from './api';
import { initializeBrands } from './brands';
import { errorHandler } from './core/errors';
import { setupLogger } from './core/logger';
import { initializeDatabase } from './db';
import { initializeOrchestrator } from './orchestrator';
import { initializeRegistry } from './registry';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
setupLogger(app);

// Initialize components
(async () => {
  try {
    // Initialize database connection
    await initializeDatabase();
    console.log('Database connection established');

    // Initialize agent registry
    await initializeRegistry();
    console.log('Agent registry initialized');

    // Initialize brand configurations
    await initializeBrands();
    console.log('Brand configurations loaded');

    // Initialize task orchestrator
    await initializeOrchestrator();
    console.log('Task orchestrator initialized');

    // Setup API routes
    setupRoutes(app);

    // Error handling middleware
    app.use(errorHandler);

    // Start server
    app.listen(PORT, () => {
      console.log(`Unified Agent Framework running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
})();

export default app;
