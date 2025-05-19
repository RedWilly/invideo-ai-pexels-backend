/**
 * Environment variable configuration with validation
 */

interface EnvConfig {
  PORT: number;
  PEXELS_API_KEY: string;
  OPENAITTS_API_KEY: string;
  ASSEMBLYAI_API_KEY: string;
}

/**
 * Get and validate environment variables
 */
export function getEnvConfig(): EnvConfig {
  // Get environment variables with defaults
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
  const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';

  const OPENAITTS_API_KEY = process.env.OPENAITTS_API_KEY || '';
  const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY || '';

  // Validate required environment variables
  if (!PEXELS_API_KEY) {
    console.warn('⚠️ PEXELS_API_KEY is not set. Video search functionality will not work properly.');
  }

  if (!OPENAITTS_API_KEY) {
    console.warn('⚠️ OPENAITTS_API_KEY is not set. Voice Over Generation will not work properly.');
  }

  if (!ASSEMBLYAI_API_KEY) {
    console.warn('⚠️ ASSEMBLYAI_API_KEY is not set. Audio Transcription will not work properly.');
  }

  return {
    PORT,
    PEXELS_API_KEY,
    OPENAITTS_API_KEY,
    ASSEMBLYAI_API_KEY
  };
}

// Export the config singleton
export const env = getEnvConfig();
