import winston from 'winston';
import { getSupabaseClient } from '../db/client';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Ensure logs directory exists
const logDir = process.env.LOG_FILE_PATH ? path.dirname(process.env.LOG_FILE_PATH) : 'logs';
if (process.env.LOG_TO_FILE === 'true' && !fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Configure winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'agent-framework' },
  transports: [
    // Console logging if enabled
    ...(process.env.LOG_TO_CONSOLE === 'true' 
      ? [new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          )
        })]
      : []),
    
    // File logging if enabled
    ...(process.env.LOG_TO_FILE === 'true' && process.env.LOG_FILE_PATH
      ? [new winston.transports.File({ 
          filename: process.env.LOG_FILE_PATH 
        })]
      : [])
  ]
});

export class AgentLogger {
  private db = getSupabaseClient();
  private agentName: string;
  
  constructor(agentName: string) {
    this.agentName = agentName;
  }
  
  /**
   * Log an info message
   */
  public info(message: string, metadata?: any): void {
    logger.info(message, { 
      agent: this.agentName,
      ...metadata 
    });
    
    this.logToSupabase('info', message, metadata);
  }
  
  /**
   * Log a warning message
   */
  public warn(message: string, metadata?: any): void {
    logger.warn(message, { 
      agent: this.agentName,
      ...metadata 
    });
    
    this.logToSupabase('warning', message, metadata);
  }
  
  /**
   * Log an error message
   */
  public error(message: string, metadata?: any): void {
    logger.error(message, { 
      agent: this.agentName,
      ...metadata 
    });
    
    this.logToSupabase('error', message, metadata);
  }
  
  /**
   * Log a debug message
   */
  public debug(message: string, metadata?: any): void {
    logger.debug(message, { 
      agent: this.agentName,
      ...metadata 
    });
    
    this.logToSupabase('debug', message, metadata);
  }
  
  /**
   * Log to Supabase agent_logs table
   */
  private async logToSupabase(level: string, message: string, metadata?: any): Promise<void> {
    try {
      // Only log to Supabase if metadata contains an executionId
      if (metadata && metadata.executionId) {
        const { error } = await this.db
          .from('agent_logs')
          .insert({
            id: uuidv4(),
            execution_id: metadata.executionId,
            agent_id: metadata.agentId || null,
            level,
            message,
            metadata: metadata || {},
            timestamp: new Date().toISOString()
          });
        
        if (error) {
          logger.error(`Failed to log to Supabase: ${error.message}`, {
            level,
            message,
            metadata
          });
        }
      }
    } catch (error) {
      logger.error(`Error logging to Supabase: ${(error as Error).message}`, {
        level,
        message,
        metadata
      });
    }
  }
}

/**
 * Express middleware for logging HTTP requests
 */
export function setupLogger() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();
    
    // Log request
    logger.info(`${req.method} ${req.url}`, {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    // Log response when finished
    res.on('finish', () => {
      const duration = Date.now() - start;
      const logLevel = res.statusCode >= 400 ? 'error' : 'info';
      
      logger[logLevel](`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`, {
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration
      });
    });
    
    next();
  };
}

export default {
  AgentLogger,
  setupLogger
};