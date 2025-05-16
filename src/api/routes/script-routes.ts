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
    async ({ body }) => {
      return await scriptController.processScript(body);
    },
    {
      body: t.Object({
        script: t.String(),
        tag: t.String()
      })
    }
  );
}
