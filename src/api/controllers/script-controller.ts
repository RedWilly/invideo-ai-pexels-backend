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
   * Optionally generate voice-overs and synchronize them with points
   * @param request Script processing request
   * @returns Script processing response
   */
  async processScript(request: ScriptProcessingRequest): Promise<ScriptProcessingResponse> {
    try {
      logger.info(PREFIXES.API, `Received script processing request with tag: "${request.tag}"`);
      logger.info(PREFIXES.API, `Script length: ${request.script.length} characters`);
      
      // Log voice-over and sync options if provided
      if (request.generateVoiceOver) {
        logger.info(PREFIXES.API, `Voice generation requested with voice ID: ${request.voiceId || 'default'}`);
      }
      
      if (request.syncAudio) {
        logger.info(PREFIXES.API, 'Audio synchronization requested');
      }
      
      // Process the script with all options
      const result = await scriptService.processScript(request);
      
      // Calculate statistics for logging
      const totalPoints = result.reduce((sum, section) => sum + section.points.length, 0);
      const totalVideosFound = result.reduce((sum, section) => {
        return sum + section.points.filter(point => point.videoId).length;
      }, 0);
      
      // Count sections with voice-overs
      const sectionsWithVoiceOvers = result.filter(section => section.audioUrl).length;
      
      // Log success
      logger.info(PREFIXES.API, 'Processing completed successfully');
      logger.info(PREFIXES.API, `- Total sections: ${result.length}`);
      logger.info(PREFIXES.API, `- Total points: ${totalPoints}`);
      logger.info(PREFIXES.API, `- Total videos found: ${totalVideosFound}/${totalPoints}`);
      
      if (request.generateVoiceOver) {
        logger.info(PREFIXES.API, `- Sections with voice-overs: ${sectionsWithVoiceOvers}/${result.length}`);
      }
      
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
