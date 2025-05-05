import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { setupRoutes } from './api';
import { initializeDatabase } from './db';
import { initializeOrchestrator } from './orchestrator';
import { initializeRegistry } from './registry';
import { initializeBrands } from './brands';
import { setupLogger } from './core/logger';
import { errorHandler } from './core/errors';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(setupLogger());

// Initialize all components
async function initializeApp() {
  try {
    // Initialize components in order
    console.log('Initializing Unified Agent Framework...');
    
    // 1. Database
    await initializeDatabase();
    
    // 2. Brands
    await initializeBrands();
    
    // 3. Registry
    await initializeRegistry();
    
    // 4. Orchestrator
    await initializeOrchestrator();
    
    // 5. Routes
    setupRoutes(app);
    
    // 6. Error handler
    app.use(errorHandler);
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Unified Agent Framework running on port ${PORT}`);
      console.log(`API available at http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
}

// Start the application
initializeApp();

export default app;