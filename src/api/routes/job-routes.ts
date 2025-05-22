/**
 * Routes for job management and WebSocket connections
 */
import { Elysia, t } from 'elysia';
import { API } from '../../config/constants';
import { jobService } from '../../services/job/job-service';
import { logger, PREFIXES } from '../../utils/logger';
import type { ServerWebSocket } from 'bun';

/**
 * Configure job routes including WebSocket connections
 * @param app Elysia app instance
 * @returns Elysia app with job routes
 */
export function configureJobRoutes(app: Elysia): Elysia {
  logger.info(PREFIXES.API, 'Configuring job routes and WebSocket connections');
  
  // WebSocket route for job updates
  app.ws('/jobs/:jobId/updates', {
    // Validate jobId parameter
    params: t.Object({
      jobId: t.String()
    }),
    
    // Handle WebSocket connection
    open(ws) {
      const { jobId } = ws.data.params;
      logger.info(PREFIXES.JOB, `WebSocket connection opened for job ${jobId}`);
      
      // Subscribe to job updates
      // Pass the WebSocket directly since we're using a more generic type
      jobService.subscribeToJob(jobId, ws);
    },
    
    // Handle WebSocket messages (client can send commands like "unsubscribe")
    message(ws, message) {
      const { jobId } = ws.data.params;
      
      try {
        // Parse message as JSON if it's a string
        const parsedMessage = typeof message === 'string' 
          ? JSON.parse(message) 
          : message;
        
        // Handle unsubscribe command
        if (parsedMessage.command === 'unsubscribe') {
          jobService.unsubscribeFromJob(jobId, ws);
        }
      } catch (error) {
        logger.error(PREFIXES.ERROR, `Error handling WebSocket message for job ${jobId}`, error);
      }
    },
    
    // Handle WebSocket close
    close(ws) {
      const { jobId } = ws.data.params;
      logger.info(PREFIXES.JOB, `WebSocket connection closed for job ${jobId}`);
      
      // Unsubscribe from job updates
      jobService.unsubscribeFromJob(jobId, ws);
    }
  });
  
  // Route to get job status
  app.get('/jobs/:jobId', ({ params }) => {
    const job = jobService.getJob(params.jobId);
    
    if (!job) {
      return {
        success: false,
        error: `Job ${params.jobId} not found`
      };
    }
    
    return {
      success: true,
      data: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        message: job.message,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        completedAt: job.completedAt,
        // Only include result if job is completed
        result: job.status === 'completed' ? job.result : undefined
      }
    };
  }, {
    params: t.Object({
      jobId: t.String()
    })
  });
  
  return app;
}
