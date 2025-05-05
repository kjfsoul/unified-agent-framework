import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseAgent, TaskContext } from '../../core/agent';

interface FileValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo: {
    name: string;
    size: number;
    extension: string;
    lastModified: string;
  };
}

export class FileValidatorAgent extends BaseAgent {
  constructor() {
    super({
      name: 'File Validator Agent',
      description: 'Validates files for syntax, format, and structure issues',
      version: '1.0.0',
      capabilities: ['validateFile', 'validateTarotDeck', 'validateDirectory']
    });
  }
  
  /**
   * Validate task input specifically for this agent
   */
  protected async validateTaskContext(context: TaskContext): Promise<void> {
    // Call parent validation first
    await super.validateTaskContext(context);

    const { taskType, parameters } = context;
    
    // Validate based on task type
    switch (taskType) {
      case 'validateFile':
        if (!parameters.filePath) {
          throw new Error('File path is required for validateFile task');
        }
        break;
      case 'validateTarotDeck':
        if (!parameters.deckId || !parameters.basePath) {
          throw new Error('Deck ID and base path are required for validateTarotDeck task');
        }
        break;
      case 'validateDirectory':
        if (!parameters.directoryPath) {
          throw new Error('Directory path is required for validateDirectory task');
        }
        break;
      default:
        throw new Error(`Unsupported task type: ${taskType}`);
    }
  }
  
  /**
   * Execute a task based on its type
   */
  public async executeTask(context: TaskContext): Promise<any> {
    const { executionId, taskType, parameters } = context;
    
    this.logger.info(`Executing task ${taskType}`, { executionId, parameters });
    await this.updateTaskStatus(executionId, 'running');
    
    try {
      let result;
      
      switch (taskType) {
        case 'validateFile':
          result = await this.validateFile(context);
          break;
        case 'validateTarotDeck':
          result = await this.validateTarotDeck(context);
          break;
        case 'validateDirectory':
          result = await this.validateDirectory(context);
          break;
        default:
          throw new Error(`Unsupported task type: ${taskType}`);
      }
      
      this.logger.info(`Task ${taskType} completed successfully`, { executionId });
      await this.updateTaskStatus(executionId, 'completed', result);
      return result;
    } catch (error) {
      this.logger.error(`Task ${taskType} failed: ${(error as Error).message}`, { executionId });
      await this.updateTaskStatus(executionId, 'failed', null, (error as Error).message);
      throw error;
    }
  }
  
  /**
   * Validate a single file
   */
  private async validateFile(context: TaskContext): Promise<FileValidationResult> {
    const { executionId, parameters } = context;
    const { filePath, rules, maxSizeBytes, allowedExtensions, requiredContent } = parameters;
    
    if (!filePath) {
      throw new Error('File path is required');
    }
    
    this.logActivity(executionId, 'info', `Validating file: ${filePath}`);
    
    try {
      // Check if file exists
      let stats;
      try {
        stats = await fs.stat(filePath);
        
        if (!stats.isFile()) {
          throw new Error(`Path is not a file: ${filePath}`);
        }
      } catch (error) {
        return {
          valid: false,
          errors: [`File does not exist or cannot be accessed: ${filePath}`],
          warnings: [],
          fileInfo: {
            name: path.basename(filePath),
            size: 0,
            extension: path.extname(filePath),
            lastModified: new Date().toISOString()
          }
        };
      }
      
      // Get file info
      const fileInfo = {
        name: path.basename(filePath),
        size: stats.size,
        extension: path.extname(filePath),
        lastModified: stats.mtime.toISOString()
      };
      
      // Initialize validation results
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Validate file size if specified
      if (maxSizeBytes && stats.size > maxSizeBytes) {
        errors.push(`File size exceeds maximum allowed: ${stats.size} bytes > ${maxSizeBytes} bytes`);
      }
      
      // Validate extension if specified
      if (allowedExtensions && Array.isArray(allowedExtensions) && allowedExtensions.length > 0) {
        const fileExtension = fileInfo.extension.toLowerCase();
        const normalizedAllowedExtensions = allowedExtensions.map(ext => 
          ext.startsWith('.') ? ext.toLowerCase() : `.${ext.toLowerCase()}`
        );
        
        if (!normalizedAllowedExtensions.includes(fileExtension)) {
          errors.push(`File extension "${fileExtension}" is not allowed. Allowed extensions: ${normalizedAllowedExtensions.join(', ')}`);
        }
      }
      
      // Read file content
      const content = await fs.readFile(filePath, 'utf8');
      
      // Validate required content if specified
      if (requiredContent) {
        if (Array.isArray(requiredContent)) {
          for (const requiredString of requiredContent) {
            if (!content.includes(requiredString)) {
              errors.push(`Required content "${requiredString}" not found in file`);
            }
          }
        } else if (typeof requiredContent === 'string' && !content.includes(requiredContent)) {
          errors.push(`Required content "${requiredContent}" not found in file`);
        }
      }
      
      // Validate based on file type
      switch (fileInfo.extension.toLowerCase()) {
        case '.json':
          this.validateJsonFile(content, errors, warnings);
          break;
        case '.html':
          this.validateHtmlFile(content, errors, warnings);
          break;
        case '.css':
          this.validateCssFile(content, errors, warnings);
          break;
        case '.js':
          this.validateJsFile(content, errors, warnings);
          break;
        // Add more file types as needed
      }
      
      // Apply custom rules if provided
      if (rules && Array.isArray(rules)) {
        this.applyCustomRules(content, rules, errors, warnings);
      }
      
      // If file is larger than 10MB, add a warning
      if (stats.size > 10 * 1024 * 1024) {
        warnings.push('File is larger than 10MB. This may cause performance issues when processing.');
      }
      
      return {
        valid: errors.length === 0,
        errors,
        warnings,
        fileInfo
      };
    } catch (error) {
      this.logActivity(executionId, 'error', `File validation failed: ${(error as Error).message}`);
      throw error;
    }
  }
  
  /**
   * Validate a tarot deck directory structure
   */
  private async validateTarotDeck(context: TaskContext): Promise<any> {
    const { executionId, parameters } = context;
    const { deckId, basePath, validateImages = true } = parameters;
    
    if (!deckId || !basePath) {
      throw new Error('Deck ID and base path are required');
    }
    
    this.logActivity(executionId, 'info', `Validating tarot deck: ${deckId}`);
    
    const deckPath = path.join(basePath, deckId);
    
    try {
      // Check if deck directory exists
      const stats = await fs.stat(deckPath);
      
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${deckPath}`);
      }
      
      // Define expected structure
      const expectedStructure = {
        'major-arcana': 22, // 22 major arcana cards
        'minor-arcana': {
          'cups': 14,
          'pentacles': 14,
          'swords': 14,
          'wands': 14
        }
      };
      
      // Validate directory structure
      const validationResult = await this.validateDeckStructure(
        deckPath,
        expectedStructure,
        validateImages
      );
      
      return {
        valid: validationResult.valid,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        deckInfo: {
          id: deckId,
          path: deckPath,
          cardCount: validationResult.cardCount
        }
      };
    } catch (error) {
      this.logActivity(executionId, 'error', `Tarot deck validation failed: ${(error as Error).message}`);
      throw error;
    }
  }
  
  /**
   * Validate a directory for specific patterns or issues
   */
  private async validateDirectory(context: TaskContext): Promise<any> {
    const { executionId, parameters } = context;
    const { directoryPath, recursive = false, patterns } = parameters;
    
    if (!directoryPath) {
      throw new Error('Directory path is required');
    }
    
    this.logActivity(executionId, 'info', `Validating directory: ${directoryPath}`);
    
    try {
      // Check if directory exists
      const stats = await fs.stat(directoryPath);
      
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${directoryPath}`);
      }
      
      // Get files in directory
      const files = await this.getFilesInDirectory(directoryPath, recursive);
      
      // Validate each file
      const results = [];
      const errors = [];
      const warnings = [];
      
      for (const file of files) {
        try {
          const fileResult = await this.validateFile({
            ...context,
            parameters: {
              filePath: file,
              rules: patterns
            }
          });
          
          results.push({
            file,
            valid: fileResult.valid,
            errors: fileResult.errors,
            warnings: fileResult.warnings
          });
          
          if (!fileResult.valid) {
            errors.push(`File ${file} has validation errors`);
          }
          
          if (fileResult.warnings.length > 0) {
            warnings.push(`File ${file} has validation warnings`);
          }
        } catch (error) {
          errors.push(`Failed to validate file ${file}: ${(error as Error).message}`);
        }
      }
      
      return {
        valid: errors.length === 0,
        directoryPath,
        fileCount: files.length,
        errors,
        warnings,
        fileResults: results
      };
    } catch (error) {
      this.logActivity(executionId, 'error', `Directory validation failed: ${(error as Error).message}`);
      throw error;
    }
  }
  
  // Helper methods for validation
  
  private validateJsonFile(content: string, errors: string[], warnings: string[]) {
    try {
      JSON.parse(content);
    } catch (error) {
      errors.push(`Invalid JSON: ${(error as Error).message}`);
    }
  }
  
  private validateHtmlFile(content: string, errors: string[], warnings: string[]) {
    // Basic HTML validation
    if (!content.includes('<!DOCTYPE html>')) {
      warnings.push('Missing DOCTYPE declaration');
    }
    
    if (!content.match(/<html[^>]*>/)) {
      errors.push('Missing <html> tag');
    }
    
    if (!content.match(/<head[^>]*>/)) {
      warnings.push('Missing <head> tag');
    }
    
    if (!content.match(/<body[^>]*>/)) {
      warnings.push('Missing <body> tag');
    }
    
    // Check for unclosed tags
    const openTags = content.match(/<[a-z][a-z0-9]*[^>]*>/gi) || [];
    const closeTags = content.match(/<\/[a-z][a-z0-9]*>/gi) || [];
    
    if (openTags.length !== closeTags.length) {
      warnings.push('Potential unclosed tags detected');
    }
  }
  
  private validateCssFile(content: string, errors: string[], warnings: string[]) {
    // Basic CSS validation
    if (content.match(/[^}]*}/g)?.length !== content.match(/[^{]*{/g)?.length) {
      errors.push('Mismatched curly braces in CSS');
    }
    
    // Check for vendor prefixes without standard property
    const vendorPrefixes = content.match(/-(webkit|moz|ms|o)-[a-z-]+\s*:/gi) || [];
    for (const prefix of vendorPrefixes) {
      const property = prefix.replace(/-(webkit|moz|ms|o)-/i, '');
      if (!content.includes(property)) {
        warnings.push(`Vendor prefix ${prefix.trim()} used without standard property`);
      }
    }
  }
  
  private validateJsFile(content: string, errors: string[], warnings: string[]) {
    // Basic JS validation
    if ((content.match(/\(/g) || []).length !== (content.match(/\)/g) || []).length) {
      errors.push('Mismatched parentheses in JavaScript');
    }
    
    if ((content.match(/\{/g) || []).length !== (content.match(/\}/g) || []).length) {
      errors.push('Mismatched curly braces in JavaScript');
    }
    
    if ((content.match(/\[/g) || []).length !== (content.match(/\]/g) || []).length) {
      errors.push('Mismatched square brackets in JavaScript');
    }
    
    // Check for console.log statements
    if (content.match(/console\.log\(/g)) {
      warnings.push('console.log statements found');
    }
  }
  
  private applyCustomRules(content: string, rules: any[], errors: string[], warnings: string[]) {
    for (const rule of rules) {
      if (rule.type === 'regex' && rule.pattern) {
        const regex = new RegExp(rule.pattern, rule.flags || '');
        const matches = content.match(regex);
        
        if (matches && rule.action === 'warn') {
          warnings.push(`Rule "${rule.name}": ${matches.length} matches found`);
        } else if (matches && rule.action === 'error') {
          errors.push(`Rule "${rule.name}": ${matches.length} matches found`);
        }
      }
    }
  }
  
  private async getFilesInDirectory(dir: string, recursive: boolean): Promise<string[]> {
    const files = await fs.readdir(dir);
    const result: string[] = [];
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stats = await fs.stat(filePath);
      
      if (stats.isFile()) {
        result.push(filePath);
      } else if (recursive && stats.isDirectory()) {
        const subDirFiles = await this.getFilesInDirectory(filePath, recursive);
        result.push(...subDirFiles);
      }
    }
    
    return result;
  }
  
  private async validateDeckStructure(
    deckPath: string,
    expectedStructure: any,
    validateImages: boolean
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[]; cardCount: number }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let cardCount = 0;
    
    // Check major arcana
    const majorArcanaPath = path.join(deckPath, 'major-arcana');
    try {
      const majorStats = await fs.stat(majorArcanaPath);
      
      if (!majorStats.isDirectory()) {
        errors.push(`major-arcana is not a directory`);
      } else {
        const majorCards = await fs.readdir(majorArcanaPath);
        const majorImageCount = majorCards.filter(file => file.match(/\.(jpg|jpeg|png|webp)$/i)).length;
        
        if (majorImageCount !== expectedStructure['major-arcana']) {
          errors.push(`Expected ${expectedStructure['major-arcana']} major arcana cards, found ${majorImageCount}`);
        }
        
        cardCount += majorImageCount;
        
        if (validateImages) {
          // Validate image dimensions, format, etc.
          for (const card of majorCards) {
            if (card.match(/\.(jpg|jpeg|png|webp)$/i)) {
              // In a real implementation, validate image properties
              // For simplicity, we're skipping actual image validation
            }
          }
        }
      }
    } catch (error) {
      errors.push(`Failed to validate major arcana: ${(error as Error).message}`);
    }
    
    // Check minor arcana
    const minorArcanaPath = path.join(deckPath, 'minor-arcana');
    try {
      const minorStats = await fs.stat(minorArcanaPath);
      
      if (!minorStats.isDirectory()) {
        errors.push(`minor-arcana is not a directory`);
      } else {
        for (const [suit, count] of Object.entries(expectedStructure['minor-arcana'])) {
          const suitPath = path.join(minorArcanaPath, suit);
          
          try {
            const suitStats = await fs.stat(suitPath);
            
            if (!suitStats.isDirectory()) {
              errors.push(`${suit} is not a directory`);
            } else {
              const suitCards = await fs.readdir(suitPath);
              const suitImageCount = suitCards.filter(file => file.match(/\.(jpg|jpeg|png|webp)$/i)).length;
              
              if (suitImageCount !== count) {
                errors.push(`Expected ${count} cards in ${suit}, found ${suitImageCount}`);
              }
              
              cardCount += suitImageCount;
              
              if (validateImages) {
                // Validate image dimensions, format, etc.
                // Similar to major arcana validation
              }
            }
          } catch (error) {
            errors.push(`Failed to validate ${suit}: ${(error as Error).message}`);
          }
        }
      }
    } catch (error) {
      errors.push(`Failed to validate minor arcana: ${(error as Error).message}`);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings,
      cardCount
    };
  }
}

// Export agent instance
export const fileValidatorAgent = new FileValidatorAgent();

export default fileValidatorAgent;
