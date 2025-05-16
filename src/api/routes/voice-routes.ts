/**
 * Routes for voice-over generation and webhook handling
 */
import { Elysia, t } from 'elysia';
import { voiceController } from '../controllers/voice-controller';
import { logger, PREFIXES } from '../../utils/logger';
import { API } from '../../config/constants';

/**
 * Configure voice-over routes
 * @param app Elysia app instance
 * @returns Elysia app with voice routes
 */
export function configureVoiceRoutes(app: Elysia): Elysia {
  logger.info(PREFIXES.API, 'Configuring voice-over routes');
  
  return app
    // Generate a voice-over
    .post(
      API.ROUTES.VOICE_GENERATE,
      async ({ body }) => {
        return voiceController.generateVoiceOver(
          body.text,
          body.voiceId,
          body.speed || 1
        );
      },
      {
        body: t.Object({
          text: t.String(),
          voiceId: t.String(),
          speed: t.Optional(t.Number())
        })
      }
    )
    
    // Handle webhook callbacks from TTS OpenAI
    .post(
      API.ROUTES.VOICE_WEBHOOK,
      async ({ body, headers }) => {
        return voiceController.handleWebhook(body, headers);
      }
    )
    
    // Get a voice-over by ID
    .get(
      `${API.ROUTES.VOICE}/:id`,
      async ({ params }) => {
        return voiceController.getVoiceOver(params.id);
      },
      {
        params: t.Object({
          id: t.String()
        })
      }
    );
}
