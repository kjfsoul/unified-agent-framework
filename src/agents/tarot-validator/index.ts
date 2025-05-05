import { BaseAgent, TaskContext } from '../../core/agent';
import * as fs from 'fs/promises';
import * as path from 'path';

interface TarotDeckValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  deckInfo: {
    id: string;
    name?: string;
    path: string;
    cardCount: number;
    majorArcanaCount: number;
    minorArcanaCount: {
      cups: number;
      pentacles: number;
      swords: number;
      wands: number;
    };
  };
}

export class TarotValidatorAgent extends BaseAgent {
  constructor() {
    super({
      name: 'Tarot Validator Agent',
      description: 'Validates tarot decks for structure and completeness',
      version: '1.0.0',
      capabilities: ['validateTarotDeck']
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
      if (taskType === 'validateTarotDeck') {
        const result = await this.validateTarotDeck(context);
        
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
   * Validate a tarot deck directory structure
   */
  private async validateTarotDeck(context: TaskContext): Promise<TarotDeckValidationResult> {
    const { executionId, parameters, brand } = context;
    
    // Extract parameters with defaults from brand config if needed
    let { deckId, basePath, validateImages = true } = parameters;
    
    // If base path not provided, get from brand config
    if (!basePath && brand) {
      basePath = this.getBrandConfigValue(context, 'basePath', '');
      
      // Append default image path for Mystic Arcana
      if (brand === 'mysticArcana') {
        basePath = path.join(basePath, 'client/public/images/tarot/decks');
      }
    }
    
    if (!deckId || !basePath) {
      throw new Error('Deck ID and base path are required');
    }
    
    this.logActivity(executionId, 'info', `Validating tarot deck: ${deckId} in ${basePath}`);
    
    const deckPath = path.join(basePath, deckId);
    
    try {
      // Check if deck directory exists
      const stats = await fs.stat(deckPath);
      
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${deckPath}`);
      }
      
      // Get deck requirements from brand config or use defaults
      const requiredCards = this.getBrandConfigValue(context, 'validators.tarotDeck.requiredCards', 78);
      const expectedImageFormat = this.getBrandConfigValue(context, 'validators.tarotDeck.imageFormat', 'jpg');
      
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
        validateImages,
        expectedImageFormat
      );
      
      // Get deck name from metadata file if it exists
      let deckName;
      try {
        const metadataPath = path.join(deckPath, 'metadata.json');
        const metadataContent = await fs.readFile(metadataPath, 'utf8');
        const metadata = JSON.parse(metadataContent);
        deckName = metadata.name;
      } catch (error) {
        // Metadata file doesn't exist or is invalid, use deck ID as name
        deckName = deckId;
      }
      
      // Build result
      return {
        valid: validationResult.errors.length === 0,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        deckInfo: {
          id: deckId,
          name: deckName,
          path: deckPath,
          cardCount: validationResult.cardCount,
          majorArcanaCount: validationResult.majorArcanaCount,
          minorArcanaCount: validationResult.minorArcanaCount
        }
      };
    } catch (error) {
      this.logActivity(executionId, 'error', `Tarot deck validation failed: ${(error as Error).message}`);
      throw error;
    }
  }
  
  /**
   * Validate the deck structure
   */
  private async validateDeckStructure(
    deckPath: string,
    expectedStructure: any,
    validateImages: boolean,
    expectedImageFormat: string
  ): Promise<any> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let cardCount = 0;
    let majorArcanaCount = 0;
    const minorArcanaCount = {
      cups: 0,
      pentacles: 0,
      swords: 0,
      wands: 0
    };
    
    // Check major arcana
    const majorArcanaPath = path.join(deckPath, 'major-arcana');
    try {
      const majorStats = await fs.stat(majorArcanaPath);
      
      if (!majorStats.isDirectory()) {
        errors.push(`major-arcana is not a directory`);
      } else {
        const majorCards = await fs.readdir(majorArcanaPath);
        const majorImageCount = majorCards.filter(file => file.match(new RegExp(`\\.(${expectedImageFormat})$`, 'i'))).length;
        
        if (majorImageCount !== expectedStructure['major-arcana']) {
          errors.push(`Expected ${expectedStructure['major-arcana']} major arcana cards, found ${majorImageCount}`);
        }
        
        majorArcanaCount = majorImageCount;
        cardCount += majorImageCount;
        
        if (validateImages) {
          // Validate image dimensions, format, etc.
          for (const card of majorCards) {
            if (card.match(new RegExp(`\\.(${expectedImageFormat})$`, 'i'))) {
              // In a real implementation, validate image properties
              // For simplicity, we're skipping actual image validation
            } else if (card.match(/\.(jpg|jpeg|png|webp)$/i)) {
              warnings.push(`Card ${card} has unexpected format. Expected ${expectedImageFormat}`);
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
              const suitImageCount = suitCards.filter(file => file.match(new RegExp(`\\.(${expectedImageFormat})$`, 'i'))).length;
              
              if (suitImageCount !== count) {
                errors.push(`Expected ${count} cards in ${suit}, found ${suitImageCount}`);
              }
              
              // Update minor arcana count
              if (suit === 'cups') minorArcanaCount.cups = suitImageCount;
              if (suit === 'pentacles') minorArcanaCount.pentacles = suitImageCount;
              if (suit === 'swords') minorArcanaCount.swords = suitImageCount;
              if (suit === 'wands') minorArcanaCount.wands = suitImageCount;
              
              cardCount += suitImageCount;
              
              if (validateImages) {
                // Validate image dimensions, format, etc.
                for (const card of suitCards) {
                  if (card.match(new RegExp(`\\.(${expectedImageFormat})$`, 'i'))) {
                    // In a real implementation, validate image properties
                    // For simplicity, we're skipping actual image validation
                  } else if (card.match(/\.(jpg|jpeg|png|webp)$/i)) {
                    warnings.push(`Card ${card} has unexpected format. Expected ${expectedImageFormat}`);
                  }
                }
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
      cardCount,
      majorArcanaCount,
      minorArcanaCount
    };
  }
}

// Export agent instance
export const tarotValidatorAgent = new TarotValidatorAgent();

export default tarotValidatorAgent;