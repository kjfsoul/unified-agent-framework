/**
 * Performance utility functions for optimizing agent system performance
 */

import { AgentLogger } from '../core/logger';

const logger = new AgentLogger('PerformanceUtils');

/**
 * Measures the execution time of a function
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>,
  label: string
): Promise<T> {
  const start = process.hrtime.bigint();
  
  try {
    return await fn();
  } finally {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1_000_000; // Convert to milliseconds
    
    logger.info(`Execution time - ${label}: ${duration.toFixed(2)}ms`);
  }
}

/**
 * Memoizes a function to cache results
 */
export function memoize<T>(
  fn: (...args: any[]) => T,
  options: {
    maxSize?: number;
    ttl?: number; // Time-to-live in milliseconds
  } = {}
): (...args: any[]) => T {
  const cache = new Map<string, { value: T; timestamp: number }>();
  const { maxSize = 100, ttl } = options;
  
  return (...args: any[]): T => {
    const key = JSON.stringify(args);
    const now = Date.now();
    const cachedItem = cache.get(key);
    
    // Return cached value if it exists and hasn't expired
    if (cachedItem && (!ttl || now - cachedItem.timestamp < ttl)) {
      return cachedItem.value;
    }
    
    // Execute function and cache result
    const result = fn(...args);
    
    // Cleanup cache if it's too large
    if (maxSize > 0 && cache.size >= maxSize) {
      // Remove oldest item (first item in Map)
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    // Store result in cache
    cache.set(key, { value: result, timestamp: now });
    
    return result;
  };
}

/**
 * Debounces a function to limit execution frequency
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>): void => {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(() => {
      fn(...args);
    }, wait);
  };
}

/**
 * Throttles a function to limit execution frequency
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>): void => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Chunks an array into smaller arrays of a specified size
 */
export function chunk<T>(array: T[], size: number): T[][] {
  const chunked: T[][] = [];
  let index = 0;
  
  while (index < array.length) {
    chunked.push(array.slice(index, index + size));
    index += size;
  }
  
  return chunked;
}

/**
 * Batch processes an array of items
 */
export async function processBatch<T, R>(
  items: T[],
  processFn: (item: T) => Promise<R>,
  options: {
    batchSize?: number;
    concurrency?: number;
  } = {}
): Promise<R[]> {
  const { batchSize = 10, concurrency = 2 } = options;
  const batches = chunk(items, batchSize);
  const results: R[] = [];
  
  for (const batch of batches) {
    const batchPromises = batch.map(processFn);
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Process batches in specified concurrency
    if (concurrency > 1) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  return results;
}

export default {
  measureExecutionTime,
  memoize,
  debounce,
  throttle,
  chunk,
  processBatch,
};