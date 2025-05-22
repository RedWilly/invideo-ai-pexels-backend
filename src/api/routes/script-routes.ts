/**
 * Routes for script processing
 */
import { Elysia, t } from 'elysia';
import { scriptController } from '../controllers/script-controller';
import { API } from '../../config/constants';
import { logger, PREFIXES } from '../../utils/logger';

/**
 * Configure script processing routes
 * @param app Elysia app instance
 * @returns Elysia app with script routes
 */
export function configureScriptRoutes(app: Elysia): Elysia {
  logger.info(PREFIXES.API, 'Configuring script processing routes');
  
  return app.post(
    API.ROUTES.SCRIPT_PROCESSING,
    ({ body, set }) => {
      // Use the new asynchronous processing approach
      const result = scriptController.processScript(body);
      
      // Set status code to 201 Created
      set.status = 201;
      
      return result;
    },
    {
      body: t.Object({
        script: t.String(),
        tag: t.String(),
        generateVoiceOver: t.Optional(t.Boolean()),
        voiceId: t.Optional(t.String()),
        syncAudio: t.Optional(t.Boolean())
      })
    }
  );
}
