/**
 * Controller for synchronization functionality
 */
import { syncService } from '../../services/sync/sync-service';
import { logger, PREFIXES } from '../../utils/logger';
import type { ProcessedSection } from '../../types/script-types';

/**
 * Controller for synchronization-related endpoints
 */
export class SyncController {
  /**
   * Synchronize a voice-over with points
   * @param voiceOverId The ID of the voice-over
   * @param section The processed section with points and videos
   * @returns Points with timing information
   */
  async synchronizeVoiceOver(voiceOverId: string, section: ProcessedSection) {
    logger.info(PREFIXES.API, `Received synchronization request for voice-over: ${voiceOverId}`);
    
    try {
      const pointsWithTiming = await syncService.synchronizeVoiceOverWithPoints(voiceOverId, section);
      
      return {
        success: true,
        data: {
          voiceOverId,
          sectionId: section.sectionId,
          points: pointsWithTiming
        }
      };
    } catch (error) {
      logger.error(PREFIXES.ERROR, 'Error in synchronization controller', error);
      throw error;
    }
  }

  /**
   * Generate a voice-over for a section and synchronize it with points
   * @param section The processed section with points and videos
   * @param voiceId The voice ID to use
   * @returns The voice-over ID and points with timing (if available)
   */
  async generateAndSyncVoiceOver(section: ProcessedSection, voiceId: string) {
    logger.info(PREFIXES.API, `Received generate and sync request for section: ${section.sectionId}`);
    
    try {
      const result = await syncService.generateAndSyncVoiceOver(section, voiceId);
      
      return {
        success: true,
        data: {
          voiceOverId: result.voiceOverId,
          sectionId: section.sectionId,
          points: result.points,
          status: 'pending' // Voice-over generation is asynchronous
        }
      };
    } catch (error) {
      logger.error(PREFIXES.ERROR, 'Error in generate and sync controller', error);
      throw error;
    }
  }

  /**
   * Process a completed voice-over and synchronize it with points
   * @param voiceOverId The ID of the completed voice-over
   * @param section The processed section with points and videos
   * @returns Points with timing information
   */
  async processCompletedVoiceOver(voiceOverId: string, section: ProcessedSection) {
    logger.info(PREFIXES.API, `Processing completed voice-over: ${voiceOverId}`);
    
    try {
      const pointsWithTiming = await syncService.processCompletedVoiceOver(voiceOverId, section);
      
      if (!pointsWithTiming) {
        return {
          success: false,
          error: `Voice-over ${voiceOverId} could not be processed`
        };
      }
      
      return {
        success: true,
        data: {
          voiceOverId,
          sectionId: section.sectionId,
          points: pointsWithTiming,
          status: 'completed'
        }
      };
    } catch (error) {
      logger.error(PREFIXES.ERROR, 'Error processing completed voice-over', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const syncController = new SyncController();
