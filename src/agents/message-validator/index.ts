import { BaseAgent, TaskContext } from '../../core/agent';
import * as fs from 'fs/promises';
import * as path from 'path';

interface MessageTemplateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  templateInfo: {
    name: string;
    path: string;
    placeholders: string[];
    length: number;
  };
}

export class MessageValidatorAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Message Validator Agent',
      description: 'Validates message templates for birthday messages',
      version: '1.0.0',
      capabilities: ['validateMessageTemplate']
    });
  }
  
  /**
   * Execute a task based on its type
   */
  public async executeTask(context: TaskContext): Promise<any> {
    const { executionId, taskType, parameters, brand } = context;
    
    this.logger.info(`Executing task ${taskType}`, { 
      executionId, 
      parameters,
      brand
    });
    
    await this.updateTaskStatus(executionId, 'running');
    
    try {
      if (taskType === 'validateMessageTemplate') {
        const result = await this.validateMessageTemplate(context);
        
        this.logger.info(`Task ${taskType} completed successfully`, { executionId });
        await this.updateTaskStatus(executionId, 'completed', result);
        return result;
      } else {
        throw new Error(`Unsupported task type: ${taskType}`);
      }
    } catch (error) {
      this.logger.error(`Task ${taskType} failed: ${(error as Error).message}`, { executionId });
      await this.updateTaskStatus(executionId, 'failed', null, (error as Error).message);
      throw error;
    }
  }
  
  /**
   * Validate a message template
   */
  private async validateMessageTemplate(context: TaskContext): Promise<MessageTemplateValidationResult> {
    const { executionId, parameters, brand } = context;
    
    // Extract parameters
    let { templatePath, templateContent } = parameters;
    
    // Get message template requirements from brand config or use defaults
    const requiredPlaceholders = this.getBrandConfigValue(
      context, 
      'validators.messageTemplate.requiredPlaceholders', 
      ['{{name}}', '{{message}}']
    );
    
    const maxLength = this.getBrandConfigValue(
      context, 
      'validators.messageTemplate.maxLength', 
      500
    );
    
    // Validate inputs
    if (!templatePath && !templateContent) {
      throw new Error('Either templatePath or templateContent is required');
    }
    
    // If path is relative and we have brand base path, make it absolute
    if (templatePath && !path.isAbsolute(templatePath) && brand) {
      const basePath = this.getBrandConfigValue(context, 'basePath', '');
      if (basePath) {
        templatePath = path.join(basePath, templatePath);
      }
    }
    
    this.logActivity(executionId, 'info', templatePath 
      ? `Validating message template file: ${templatePath}` 
      : 'Validating message template content');
    
    try {
      // Read template content if path is provided
      if (templatePath && !templateContent) {
        const stats = await fs.stat(templatePath);
        
        if (!stats.isFile()) {
          throw new Error(`Path is not a file: ${templatePath}`);
        }
        
        templateContent = await fs.readFile(templatePath, 'utf8');
      }
      
      // Validate template
      const validationResult = this.validateTemplate(
        templateContent,
        requiredPlaceholders,
        maxLength
      );
      
      // Get template name from path or default
      const templateName = templatePath 
        ? path.basename(templatePath, path.extname(templatePath))
        : 'Unnamed Template';
      
      return {
        valid: validationResult.errors.length === 0,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        templateInfo: {
          name: templateName,
          path: templatePath || 'No file path',
          placeholders: validationResult.placeholders,
          length: templateContent.length
        }
      };
    } catch (error) {
      this.logActivity(executionId, 'error', `Message template validation failed: ${(error as Error).message}`);
      throw error;
    }
  }
  
  /**
   * Validate the template content
   */
  private validateTemplate(
    content: string,
    requiredPlaceholders: string[],
    maxLength: number
  ): {
    errors: string[];
    warnings: string[];
    placeholders: string[];
    valid: boolean;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check template length
    if (content.length > maxLength) {
      errors.push(`Template length (${content.length}) exceeds maximum allowed length (${maxLength})`);
    }
    
    // Extract placeholders from template
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    const placeholders: string[] = [];
    let match;
    
    while ((match = placeholderRegex.exec(content)) !== null) {
      placeholders.push(`{{${match[1]}}}`);
    }
    
    // Check required placeholders
    for (const required of requiredPlaceholders) {
      if (!placeholders.includes(required)) {
        errors.push(`Template is missing required placeholder: ${required}`);
      }
    }
    
    // Check for unbalanced placeholders
    const openingCount = (content.match(/\{\{/g) || []).length;
    const closingCount = (content.match(/\}\}/g) || []).length;
    
    if (openingCount !== closingCount) {
      errors.push(`Template has unbalanced placeholders: ${openingCount} opening '{{' and ${closingCount} closing '}}'`);
    }
    
    // Check for empty template
    if (content.trim().length === 0) {
      errors.push('Template is empty');
    }
    
    // Check for very short templates
    if (content.length < 20 && content.trim().length > 0) {
      warnings.push('Template is very short');
    }
    
    return {
      errors,
      warnings,
      placeholders,
      valid: errors.length === 0
    };
  }
}

// Export agent instance
export const messageValidatorAgent = new MessageValidatorAgent();

export default messageValidatorAgent;