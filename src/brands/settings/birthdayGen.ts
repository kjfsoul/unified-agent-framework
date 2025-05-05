/**
 * Default brand configuration for BirthdayGen
 */
export const birthdayGenConfig = {
  name: 'BirthdayGen',
  key: 'birthdayGen',
  description: 'Personalized birthday content and messaging platform',
  basePath: '/Users/kfitz/Documents/Projects/BirthdayGen/BirthdayGen',
  apiUrl: 'https://birthdaygen.com/api',
  
  validators: {
    routes: {
      baseUrl: 'https://birthdaygen.com',
      criticalPaths: ['/', '/messages', '/templates', '/account']
    },
    messageTemplate: {
      requiredPlaceholders: ['{{name}}', '{{age}}', '{{message}}', '{{sender}}'],
      maxLength: 500
    }
  },
  
  taskSettings: {
    default: {
      priority: 'medium',
      timeout: 60000,
      retries: 3
    },
    taskOverrides: {
      generateBirthdayMessage: {
        priority: 'high',
        parameters: {
          includeEmojis: true,
          maxLength: 1000
        }
      },
      validateMessageTemplate: {
        priority: 'high',
        timeout: 30000
      }
    }
  },
  
  customData: {
    messageCategories: ['funny', 'heartfelt', 'professional', 'family', 'romantic'],
    deliveryMethods: ['sms', 'email', 'social-media'],
    supportedLanguages: ['en', 'es', 'fr', 'de', 'it']
  }
};

export default birthdayGenConfig;