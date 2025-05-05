import mysticArcanaConfig from './mysticArcana';
import edmShuffleConfig from './edmShuffle';
import birthdayGenConfig from './birthdayGen';

// Export all brand configurations
export {
  mysticArcanaConfig,
  edmShuffleConfig,
  birthdayGenConfig
};

// Export a map of all brand configurations for easy lookup
export const brandConfigs = {
  mysticArcana: mysticArcanaConfig,
  edmShuffle: edmShuffleConfig,
  birthdayGen: birthdayGenConfig
};

export default brandConfigs;