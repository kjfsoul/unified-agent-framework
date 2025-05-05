/**
 * Default brand configuration for Mystic Arcana
 */
export const mysticArcanaConfig = {
  name: 'Mystic Arcana',
  key: 'mysticArcana',
  description: 'Tarot and astrology platform',
  basePath: '/Users/kfitz/MysticOracleV2/MysticOracleV2',
  apiUrl: 'https://mysticarcana.com/api',
  
  validators: {
    tarotDeck: {
      requiredCards: 78,
      imageFormat: 'jpg',
      minDimensions: [300, 500]
    },
    routes: {
      baseUrl: 'https://mysticarcana.com',
      criticalPaths: ['/', '/tarot', '/readings', '/astrology']
    }
  },
  
  taskSettings: {
    default: {
      priority: 'medium',
      timeout: 60000,
      retries: 3
    },
    taskOverrides: {
      validateTarotDeck: {
        priority: 'high',
        parameters: {
          validateImages: true
        }
      },
      generateDailyHoroscope: {
        priority: 'highest',
        timeout: 120000
      }
    }
  },
  
  customData: {
    decks: ['rider-waite', 'thoth', 'marseille'],
    zodiacSigns: ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'],
    supportedLanguages: ['en', 'es', 'fr']
  }
};

export default mysticArcanaConfig;