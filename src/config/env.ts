/**
 * Environment variable configuration with validation
 */

interface EnvConfig {
  PORT: number;
  PEXELS_API_KEY: string;
}

/**
 * Get and validate environment variables
 */
export function getEnvConfig(): EnvConfig {
  // Get environment variables with defaults
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';

  // Validate required environment variables
  if (!PEXELS_API_KEY) {
    console.warn('⚠️ PEXELS_API_KEY is not set. Video search functionality will not work properly.');
  }

  return {
    PORT,
    PEXELS_API_KEY
  };
}

// Export the config singleton
export const env = getEnvConfig();
