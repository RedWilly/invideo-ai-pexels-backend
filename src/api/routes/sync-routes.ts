/**
 * Routes for synchronization functionality
 */
import { Elysia, t } from 'elysia';
import { syncController } from '../controllers/sync-controller';
import { logger, PREFIXES } from '../../utils/logger';
import { API } from '../../config/constants';

/**
 * Configure synchronization routes
 * @param app Elysia app instance
 * @returns Elysia app with sync routes
 */
export function configureSyncRoutes(app: Elysia): Elysia {
  logger.info(PREFIXES.API, 'Configuring synchronization routes');
  
  return app
    // Synchronize a voice-over with points
    .post(
      API.ROUTES.SYNC_VOICE_OVER,
      async ({ body }) => {
        return syncController.synchronizeVoiceOver(
          body.voiceOverId,
          body.section
        );
      },
      {
        body: t.Object({
          voiceOverId: t.String(),
          section: t.Object({
            sectionId: t.String(),
            points: t.Array(t.Object({
              text: t.String(),
              videoId: t.String(),
              videoUrl: t.String(),
              videoThumbnail: t.String()
            }))
          })
        })
      }
    )
    
    // Generate a voice-over for a section and synchronize it with points
    .post(
      API.ROUTES.SYNC_GENERATE,
      async ({ body }) => {
        return syncController.generateAndSyncVoiceOver(
          body.section,
          body.voiceId
        );
      },
      {
        body: t.Object({
          section: t.Object({
            sectionId: t.String(),
            points: t.Array(t.Object({
              text: t.String(),
              videoId: t.String(),
              videoUrl: t.String(),
              videoThumbnail: t.String()
            }))
          }),
          voiceId: t.String()
        })
      }
    )
    
    // Process a completed voice-over and synchronize it with points
    .post(
      API.ROUTES.SYNC_PROCESS_COMPLETED,
      async ({ body }) => {
        return syncController.processCompletedVoiceOver(
          body.voiceOverId,
          body.section
        );
      },
      {
        body: t.Object({
          voiceOverId: t.String(),
          section: t.Object({
            sectionId: t.String(),
            points: t.Array(t.Object({
              text: t.String(),
              videoId: t.String(),
              videoUrl: t.String(),
              videoThumbnail: t.String()
            }))
          })
        })
      }
    );
}
