import Joi from 'joi';
import { TaskValidationError } from '../core/errors';

/**
 * Validate data against a Joi schema
 */
export function validateSchema(data: any, schema: Joi.Schema): any {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    const details = error.details.map(detail => ({
      message: detail.message,
      path: detail.path,
      type: detail.type
    }));
    
    throw new TaskValidationError('Validation error', details);
  }
  
  return value;
}

/**
 * Validate task execution parameters against JSON schema
 */
export function validateTaskParameters(parameters: any, schema: any): boolean {
  if (!schema || !parameters) {
    return true;
  }
  
  // In a real implementation, use a full JSON Schema validator
  // For now, just do basic validation
  
  // Check required properties
  if (schema.required && Array.isArray(schema.required)) {
    for (const required of schema.required) {
      if (parameters[required] === undefined) {
        throw new TaskValidationError(`Missing required parameter: ${required}`);
      }
    }
  }
  
  // Check property types
  if (schema.properties) {
    for (const [key, propSchema] of Object.entries(schema.properties)) {
      if (parameters[key] !== undefined) {
        const propType = (propSchema as any).type;
        
        if (propType === 'string' && typeof parameters[key] !== 'string') {
          throw new TaskValidationError(`Parameter ${key} must be a string`);
        } else if (propType === 'number' && typeof parameters[key] !== 'number') {
          throw new TaskValidationError(`Parameter ${key} must be a number`);
        } else if (propType === 'boolean' && typeof parameters[key] !== 'boolean') {
          throw new TaskValidationError(`Parameter ${key} must be a boolean`);
        } else if (propType === 'array' && !Array.isArray(parameters[key])) {
          throw new TaskValidationError(`Parameter ${key} must be an array`);
        } else if (propType === 'object' && (typeof parameters[key] !== 'object' || parameters[key] === null)) {
          throw new TaskValidationError(`Parameter ${key} must be an object`);
        }
      }
    }
  }
  
  return true;
}

export default {
  validateSchema,
  validateTaskParameters
};