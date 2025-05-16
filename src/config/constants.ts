/**
 * Application-wide constants
 */

export const API = {
  ROUTES: {
    SCRIPT_PROCESSING: '/process-script',
    HEALTH: '/health'
  },
  RESPONSE: {
    SUCCESS: 'success',
    ERROR: 'error'
  }
};

export const VIDEO_SEARCH = {
  DEFAULT_PER_PAGE: 1,
  DEFAULT_ORIENTATION: 'landscape',
  MAX_SEARCH_WORDS: 5
};

export const LOGGING = {
  LEVELS: {
    INFO: 'info',
    ERROR: 'error',
    DEBUG: 'debug',
    WARN: 'warn'
  },
  PREFIXES: {
    API: '🌐 API',
    SCRIPT: '📝 SCRIPT',
    VIDEO: '🎥 VIDEO',
    ERROR: '❌ ERROR',
    SUCCESS: '✅ SUCCESS'
  }
};
