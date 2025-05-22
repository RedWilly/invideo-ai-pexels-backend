/**
 * Application-wide constants
 */

export const API = {
  ROUTES: {
    // Public API endpoints
    SCRIPT_PROCESSING: '/process-script',
    HEALTH: '/health',
    VOICE_WEBHOOK: '/voice/webhook', // Must be public for external service callbacks
    
    // Internal endpoints - not meant for direct API consumer use, unless you are a power user
    VOICE: '/internal/voice',
    VOICE_GENERATE: '/internal/voice/generate',
    SYNC: '/internal/sync',
    SYNC_VOICE_OVER: '/internal/sync/voice-over',
    SYNC_GENERATE: '/internal/sync/generate',
    SYNC_PROCESS_COMPLETED: '/internal/sync/process-completed'
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
    JOB: '📋 JOB',
    ERROR: '❌ ERROR',
    SUCCESS: '✅ SUCCESS'
  }
};
