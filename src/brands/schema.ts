import Joi from 'joi';

/**
 * Schema for brand configuration validation
 */
export const brandConfigSchema = Joi.object({
  // Basic Information
  name: Joi.string().required(),
  key: Joi.string().required().pattern(/^[a-zA-Z0-9_-]+$/),
  description: Joi.string(),
  
  // File Paths and URLs
  basePath: Joi.string().required(),
  apiUrl: Joi.string().uri(),
  
  // Validators Configuration
  validators: Joi.object({
    // Tarot Deck Validator (for Mystic Arcana)
    tarotDeck: Joi.object({
      requiredCards: Joi.number().default(78),
      imageFormat: Joi.string().valid('jpg', 'png', 'webp').default('jpg'),
      minDimensions: Joi.array().items(Joi.number()).length(2).default([300, 500])
    }),
    
    // Route Validator (for all brands)
    routes: Joi.object({
      baseUrl: Joi.string().uri().required(),
      criticalPaths: Joi.array().items(Joi.string()).default(['/'])
    }),
    
    // Music Playlist Validator (for EDM Shuffle)
    playlist: Joi.object({
      minTracks: Joi.number().default(5),
      maxTracks: Joi.number().default(100),
      requiredMetadata: Joi.array().items(Joi.string()).default(['title', 'artist'])
    }),
    
    // Message Template Validator (for BirthdayGen)
    messageTemplate: Joi.object({
      requiredPlaceholders: Joi.array().items(Joi.string()).default(['{{name}}', '{{age}}', '{{message}}']),
      maxLength: Joi.number().default(500)
    })
  }).default({}),
  
  // API Configuration
  apiKeys: Joi.array().items(Joi.string()),
  
  // Task-specific Settings
  taskSettings: Joi.object({
    // Default settings for all tasks
    default: Joi.object({
      priority: Joi.string().valid('highest', 'high', 'medium', 'low', 'lowest').default('medium'),
      timeout: Joi.number().default(60000),
      retries: Joi.number().default(3)
    }).default({
      priority: 'medium',
      timeout: 60000,
      retries: 3
    }),
    
    // Override settings for specific tasks
    taskOverrides: Joi.object().pattern(
      Joi.string(),
      Joi.object({
        priority: Joi.string().valid('highest', 'high', 'medium', 'low', 'lowest'),
        timeout: Joi.number(),
        retries: Joi.number(),
        parameters: Joi.object()
      })
    ).default({})
  }).default({
    default: {
      priority: 'medium',
      timeout: 60000,
      retries: 3
    },
    taskOverrides: {}
  }),
  
  // Brand-specific custom data
  customData: Joi.object().default({})
}).required();

/**
 * Schema for brand task request validation
 */
export const brandTaskRequestSchema = Joi.object({
  task: Joi.string().required(),
  brand: Joi.string().required(),
  parameters: Joi.object().required(),
  priority: Joi.string().valid('highest', 'high', 'medium', 'low', 'lowest').default('medium'),
  callback: Joi.string().uri().optional()
}).required();

export default {
  brandConfigSchema,
  brandTaskRequestSchema
};