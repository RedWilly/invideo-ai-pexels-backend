/**
 * Application-wide constants
 */

export const API = {
  ROUTES: {
    SCRIPT_PROCESSING: '/process-script',
    HEALTH: '/health',
    VOICE: '/voice',
    VOICE_GENERATE: '/voice/generate',
    VOICE_WEBHOOK: '/voice/webhook'
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

export const VOICE = {
  DEFAULT_SPEED: 1,
  DEFAULT_MODEL: 'tts-1',
  DEFAULT_VOICE_ID: 'OA001' // Alloy voice
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
    VOICE: '🔊 VOICE',
    SYNC: '🔄 SYNC',
    ERROR: '❌ ERROR',
    SUCCESS: '✅ SUCCESS'
  }
};
