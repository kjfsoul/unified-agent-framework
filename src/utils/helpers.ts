/**
 * Helper utility functions for the agent system
 */

/**
 * Check if a value is defined (not undefined or null)
 */
export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

/**
 * Get a value or its default if undefined
 */
export function getValueOrDefault<T>(value: T | undefined | null, defaultValue: T): T {
  return isDefined(value) ? value : defaultValue;
}

/**
 * Safely parse JSON with a default value on error
 */
export function safeJsonParse<T>(json: string, defaultValue: T): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Safely stringify an object with error handling
 */
export function safeJsonStringify(obj: unknown, fallback = '{}'): string {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    return fallback;
  }
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(deepClone) as unknown as T;
  }
  
  const clone = {} as Record<string, unknown>;
  
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    clone[key] = deepClone(value);
  }
  
  return clone as T;
}

/**
 * Get a value from an object by path (e.g., "foo.bar.baz")
 */
export function getObjectValue<T>(
  obj: Record<string, unknown>,
  path: string,
  defaultValue: T
): T {
  const keys = path.split('.');
  let current: unknown = obj;
  
  for (const key of keys) {
    if (current === null || typeof current !== 'object' || !(key in current)) {
      return defaultValue;
    }
    
    current = (current as Record<string, unknown>)[key];
  }
  
  return (current === undefined ? defaultValue : current) as T;
}

/**
 * Format a date to ISO string without milliseconds
 */
export function formatDate(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/**
 * Wait for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate a random string of specified length
 */
export function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Convert snake_case to camelCase
 */
export function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert object keys from snake_case to camelCase
 */
export function transformObjectKeys<T extends Record<string, unknown>>(
  obj: T,
  transformer: (key: string) => string
): Record<string, unknown> {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => transformObjectKeys(item as Record<string, unknown>, transformer));
  }
  
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const transformedKey = transformer(key);
    
    if (value !== null && typeof value === 'object') {
      result[transformedKey] = transformObjectKeys(value as Record<string, unknown>, transformer);
    } else {
      result[transformedKey] = value;
    }
  }
  
  return result;
}

export default {
  isDefined,
  getValueOrDefault,
  safeJsonParse,
  safeJsonStringify,
  deepClone,
  getObjectValue,
  formatDate,
  sleep,
  randomString,
  snakeToCamel,
  transformObjectKeys,
};