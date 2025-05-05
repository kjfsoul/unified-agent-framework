import { BrandConfig, brandConfig } from './config';
import { brandConfigSchema, brandTaskRequestSchema } from './schema';
import { brandConfigs, mysticArcanaConfig, edmShuffleConfig, birthdayGenConfig } from './settings';

/**
 * Initialize the brand configuration
 */
export async function initializeBrands(): Promise<void> {
  console.log('Initializing brand configuration');
  await brandConfig.initializeBrands();
}

export {
  BrandConfig,
  brandConfig,
  brandConfigSchema,
  brandTaskRequestSchema,
  brandConfigs,
  mysticArcanaConfig,
  edmShuffleConfig,
  birthdayGenConfig
};