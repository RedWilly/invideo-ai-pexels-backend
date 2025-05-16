/**
 * Main application entry point
 */
import { Elysia } from 'elysia';
import { env } from './config/env';
import { API } from './config/constants';
import { configureScriptRoutes } from './api/routes/script-routes';
import { configureVoiceRoutes } from './api/routes/voice-routes';
import { errorHandler } from './api/middleware/error-handler';
import { logger, PREFIXES } from './utils/logger';

/**
 * Create and configure the application
 */
function createApp(): Elysia {
  // Create the app with error handling middleware
  const app = new Elysia()
    .use(errorHandler);
  
  // Configure routes
  configureScriptRoutes(app);
  configureVoiceRoutes(app);
  
  // Add health check endpoint
  app.get(API.ROUTES.HEALTH, () => ({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  }));
  
  return app;
}

/**
 * Start the server
 */
function startServer() {
  const app = createApp();
  
  // Start listening
  app.listen(env.PORT, () => {
    logger.info(
      PREFIXES.API, 
      `🦊 Script Processing API is running at ${app.server?.hostname}:${app.server?.port}`
    );
  });
  
  return app;
}

// Start the server if this file is run directly
if (import.meta.main) {
  startServer();
}

// Export for testing
export { createApp, startServer };
