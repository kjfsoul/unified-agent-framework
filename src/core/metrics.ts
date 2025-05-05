import { getSupabaseClient } from '../db/client';

interface Metric {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: string;
}

class MetricsManager {
  private db = getSupabaseClient();
  private metrics: Metric[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    // Flush metrics to database every minute
    this.flushInterval = setInterval(() => this.flush(), 60000);
  }
  
  /**
   * Record a task execution time metric
   */
  public recordTaskExecutionTime(taskType: string, brand: string | null, durationMs: number): void {
    this.addMetric({
      name: 'task_execution_time',
      value: durationMs,
      labels: {
        task_type: taskType,
        brand: brand || 'none'
      },
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Record a task result metric (success or failure)
   */
  public recordTaskResult(taskType: string, brand: string | null, success: boolean): void {
    this.addMetric({
      name: success ? 'task_success' : 'task_failure',
      value: 1,
      labels: {
        task_type: taskType,
        brand: brand || 'none'
      },
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Record API request metric
   */
  public recordApiRequest(endpoint: string, method: string, statusCode: number, durationMs: number): void {
    this.addMetric({
      name: 'api_request',
      value: 1,
      labels: {
        endpoint,
        method,
        status_code: statusCode.toString()
      },
      timestamp: new Date().toISOString()
    });
    
    this.addMetric({
      name: 'api_request_duration',
      value: durationMs,
      labels: {
        endpoint,
        method,
        status_code: statusCode.toString()
      },
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Record agent activity metric
   */
  public recordAgentActivity(agentId: string, agentName: string, activityType: string): void {
    this.addMetric({
      name: 'agent_activity',
      value: 1,
      labels: {
        agent_id: agentId,
        agent_name: agentName,
        activity_type: activityType
      },
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Record resource usage metric
   */
  public recordResourceUsage(resource: string, usage: number): void {
    this.addMetric({
      name: 'resource_usage',
      value: usage,
      labels: {
        resource
      },
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Add a metric to the queue
   */
  private addMetric(metric: Metric): void {
    this.metrics.push(metric);
    
    // Flush if we have too many metrics
    if (this.metrics.length >= 100) {
      this.flush();
    }
  }
  
  /**
   * Flush metrics to the database
   */
  public async flush(): Promise<void> {
    if (this.metrics.length === 0) {
      return;
    }
    
    const metricsToFlush = [...this.metrics];
    this.metrics = [];
    
    try {
      // In a real implementation, we would insert these into a metrics table
      // For now, we'll just log them since we didn't include a metrics table in our schema
      console.log(`Flushing ${metricsToFlush.length} metrics`);
      
      // This is where we would insert the metrics into the database
      // For example:
      // const { error } = await this.db.from('metrics').insert(metricsToFlush);
      // if (error) {
      //   console.error('Failed to flush metrics:', error);
      //   // Put the metrics back in the queue
      //   this.metrics = [...metricsToFlush, ...this.metrics];
      // }
    } catch (error) {
      console.error('Error flushing metrics:', error);
      // Put the metrics back in the queue
      this.metrics = [...metricsToFlush, ...this.metrics];
    }
  }
  
  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }
}

// Export singleton instance
export const metricsManager = new MetricsManager();

export default {
  metricsManager
};