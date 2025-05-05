import { getSupabaseClient } from '../db/client';
import { BrandConfigError } from '../core/errors';
import { AgentLogger } from '../core/logger';
import { brandConfigs } from './settings';
import { validateSchema } from '../utils/validation';
import { brandConfigSchema } from './schema';

export class BrandConfig {
  private configCache: Map<string, any> = new Map();
  private db = getSupabaseClient();
  private logger = new AgentLogger('BrandConfig');
  
  constructor() {
    // Initialize the cache with default configurations
    for (const [key, config] of Object.entries(brandConfigs)) {
      this.configCache.set(key, config);
    }
  }
  
  /**
   * Get configuration for a specific brand
   */
  public async getBrandConfig(brandKey: string): Promise<any> {
    // Check cache first
    if (this.configCache.has(brandKey)) {
      return this.configCache.get(brandKey);
    }
    
    try {
      // Fetch from database
      const { data, error } = await this.db
        .from('brands')
        .select('*')
        .eq('key', brandKey)
        .single();
      
      if (error) {
        this.logger.error(`Failed to get brand configuration: ${error.message}`, { brandKey });
        throw new BrandConfigError(`Failed to get brand configuration: ${error.message}`);
      }
      
      if (!data) {
        // If not found in database, check if we have a default configuration
        if (brandConfigs[brandKey as keyof typeof brandConfigs]) {
          const defaultConfig = brandConfigs[brandKey as keyof typeof brandConfigs];
          
          // Store the default config in the database
          await this.createBrandConfig(defaultConfig);
          
          this.logger.info(`Created default configuration for brand: ${brandKey}`);
          return defaultConfig;
        }
        
        this.logger.error(`Brand not found: ${brandKey}`);
        throw new BrandConfigError(`Brand not found: ${brandKey}`);
      }
      
      // Cache the result
      this.configCache.set(brandKey, data);
      
      return data;
    } catch (error) {
      if (error instanceof BrandConfigError) {
        throw error;
      }
      this.logger.error(`Error getting brand configuration: ${(error as Error).message}`, { brandKey });
      throw new BrandConfigError(`Error getting brand configuration: ${(error as Error).message}`);
    }
  }
  
  /**
   * Create a new brand configuration
   */
  public async createBrandConfig(config: any): Promise<void> {
    try {
      // Validate the configuration against the schema
      const validatedConfig = validateSchema(config, brandConfigSchema);
      
      // Check if brand already exists
      const { data, error: checkError } = await this.db
        .from('brands')
        .select('id')
        .eq('key', validatedConfig.key)
        .single();
      
      if (!checkError && data) {
        throw new BrandConfigError(`Brand with key '${validatedConfig.key}' already exists`);
      }
      
      // Insert into database
      const { error } = await this.db
        .from('brands')
        .insert(validatedConfig);
      
      if (error) {
        this.logger.error(`Failed to create brand configuration: ${error.message}`, { 
          brandKey: validatedConfig.key 
        });
        throw new BrandConfigError(`Failed to create brand configuration: ${error.message}`);
      }
      
      // Update cache
      this.configCache.set(validatedConfig.key, validatedConfig);
      
      this.logger.info(`Created brand configuration for ${validatedConfig.key}`);
    } catch (error) {
      if (error instanceof BrandConfigError) {
        throw error;
      }
      this.logger.error(`Error creating brand configuration: ${(error as Error).message}`);
      throw new BrandConfigError(`Error creating brand configuration: ${(error as Error).message}`);
    }
  }
  
  /**
   * Update configuration for a specific brand
   */
  public async updateBrandConfig(brandKey: string, config: any): Promise<void> {
    try {
      // Validate the configuration against the schema
      const validatedConfig = validateSchema({...config, key: brandKey}, brandConfigSchema);
      
      const { error } = await this.db
        .from('brands')
        .update(validatedConfig)
        .eq('key', brandKey);
      
      if (error) {
        this.logger.error(`Failed to update brand configuration: ${error.message}`, { brandKey });
        throw new BrandConfigError(`Failed to update brand configuration: ${error.message}`);
      }
      
      // Update cache
      this.configCache.set(brandKey, validatedConfig);
      
      this.logger.info(`Updated brand configuration for ${brandKey}`);
    } catch (error) {
      if (error instanceof BrandConfigError) {
        throw error;
      }
      this.logger.error(`Error updating brand configuration: ${(error as Error).message}`, { brandKey });
      throw new BrandConfigError(`Error updating brand configuration: ${(error as Error).message}`);
    }
  }
  
  /**
   * Get configuration for a specific task and brand
   */
  public async getTaskConfig(brandKey: string, taskType: string): Promise<any> {
    const brandConfig = await this.getBrandConfig(brandKey);
    
    // Get task settings
    const defaultSettings = brandConfig.taskSettings?.default || {
      priority: 'medium',
      timeout: 60000,
      retries: 3
    };
    
    // Get task-specific overrides
    const taskOverrides = brandConfig.taskSettings?.taskOverrides?.[taskType] || {};
    
    // Merge default settings with task-specific overrides
    return {
      ...defaultSettings,
      ...taskOverrides
    };
  }
  
  /**
   * Get task parameters with brand-specific defaults
   */
  public async getTaskParameters(brandKey: string, taskType: string, userParameters: any): Promise<any> {
    const taskConfig = await this.getTaskConfig(brandKey, taskType);
    
    // Merge default parameters with user-provided parameters
    return {
      ...(taskConfig.parameters || {}),
      ...userParameters
    };
  }
  
  /**
   * Get all brands
   */
  public async getAllBrands(): Promise<any[]> {
    try {
      const { data, error } = await this.db
        .from('brands')
        .select('*');
      
      if (error) {
        this.logger.error(`Failed to get brands: ${error.message}`);
        throw new BrandConfigError(`Failed to get brands: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      if (error instanceof BrandConfigError) {
        throw error;
      }
      this.logger.error(`Error getting all brands: ${(error as Error).message}`);
      throw new BrandConfigError(`Error getting all brands: ${(error as Error).message}`);
    }
  }
  
  /**
   * Initialize brand configurations in database
   */
  public async initializeBrands(): Promise<void> {
    this.logger.info('Initializing brand configurations');
    
    try {
      // Get all existing brands
      const { data, error } = await this.db
        .from('brands')
        .select('key');
      
      if (error) {
        this.logger.error(`Failed to get existing brands: ${error.message}`);
        throw error;
      }
      
      const existingBrands = new Set((data || []).map(b => b.key));
      
      // Create any missing brands
      for (const [key, config] of Object.entries(brandConfigs)) {
        if (!existingBrands.has(key)) {
          try {
            await this.createBrandConfig(config);
            this.logger.info(`Created default configuration for brand: ${key}`);
          } catch (error) {
            this.logger.error(`Failed to create default configuration for brand ${key}: ${(error as Error).message}`);
          }
        }
      }
      
      this.logger.info('Brand configurations initialized');
    } catch (error) {
      this.logger.error(`Error initializing brands: ${(error as Error).message}`);
      throw error;
    }
  }
  
  /**
   * Clear cache for a specific brand or all brands
   */
  public clearCache(brandKey?: string): void {
    if (brandKey) {
      this.configCache.delete(brandKey);
      this.logger.info(`Cleared cache for brand ${brandKey}`);
    } else {
      this.configCache.clear();
      this.logger.info('Cleared all brand caches');
    }
  }
}

// Export singleton instance
export const brandConfig = new BrandConfig();

export default {
  BrandConfig,
  brandConfig
};