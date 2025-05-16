/**
 * Controller for script processing endpoints
 */
import { scriptService } from '../../services/script/script-service';
import type { ScriptProcessingRequest, ScriptProcessingResponse } from '../../types/script-types';
import { logger, PREFIXES } from '../../utils/logger';

/**
 * Controller for script processing
 */
export class ScriptController {
  /**
   * Process a script and find videos for each point
   * @param request Script processing request
   * @returns Script processing response
   */
  async processScript(request: ScriptProcessingRequest): Promise<ScriptProcessingResponse> {
    try {
      logger.info(PREFIXES.API, `Received script processing request with tag: "${request.tag}"`);
      logger.info(PREFIXES.API, `Script length: ${request.script.length} characters`);
      
      // Process the script
      const result = await scriptService.processScript(request.script, request.tag);
      
      // Calculate statistics for logging
      const totalPoints = result.reduce((sum, section) => sum + section.points.length, 0);
      const totalVideosFound = result.reduce((sum, section) => {
        return sum + section.points.filter(point => point.videoId).length;
      }, 0);
      
      // Log success
      logger.info(PREFIXES.API, 'Processing completed successfully');
      logger.info(PREFIXES.API, `- Total sections: ${result.length}`);
      logger.info(PREFIXES.API, `- Total points: ${totalPoints}`);
      logger.info(PREFIXES.API, `- Total videos found: ${totalVideosFound}/${totalPoints}`);
      
      return { 
        success: true, 
        data: result 
      };
    } catch (error) {
      logger.error(PREFIXES.API, 'Error processing script', error);
      
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Export a singleton instance
export const scriptController = new ScriptController();
