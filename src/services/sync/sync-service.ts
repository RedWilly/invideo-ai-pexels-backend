/**
 * Synchronization service for matching voice-overs with videos
 */
import { AssemblyClient } from '../../integrations/sync/assembly-client';
import { voiceService } from '../voice/voice-service';
import { logger, PREFIXES } from '../../utils/logger';
import type { VoiceOver } from '../../types/tts-types';
import type { TextTiming, PointWithTiming } from '../../types/assembly-types';
import type { ProcessedSection, PointWithVideo } from '../../types/script-types';

/**
 * Service for synchronizing voice-overs with videos
 */
export class SyncService {
  /**
   * Synchronize a voice-over with points to create timed points
   * @param voiceOverId The ID of the voice-over
   * @param section The processed section with points and videos
   * @returns Points with timing information
   */
  async synchronizeVoiceOverWithPoints(
    voiceOverId: string,
    section: ProcessedSection
  ): Promise<PointWithTiming[]> {
    try {
      logger.info(PREFIXES.SYNC, `Synchronizing voice-over ${voiceOverId} with ${section.points.length} points`);
      
      // Get the voice-over
      const voiceOver = voiceService.getVoiceOver(voiceOverId);
      
      if (!voiceOver) {
        throw new Error(`Voice-over with ID ${voiceOverId} not found`);
      }
      
      if (voiceOver.status !== 'completed' || !voiceOver.audioUrl) {
        throw new Error(`Voice-over ${voiceOverId} is not completed or has no audio URL`);
      }
      
      // Create an instance of the AssemblyClient
      const assemblyClient = new AssemblyClient(process.env.ASSEMBLYAI_API_KEY || '');
      
      // Transcribe the audio to get word-level timing
      const transcript = await assemblyClient.transcribeAudio(voiceOver.audioUrl);
      
      if (!transcript.words || transcript.words.length === 0) {
        throw new Error('Transcription did not return word-level details');
      }
      
      // Extract the text from each point
      const pointTexts = section.points.map(point => point.text);
      
      // Match the point texts with the transcription to get timing
      const timings = assemblyClient.matchTextWithTiming(
        transcript.text,
        transcript.words,
        pointTexts
      );
      
      // Update the points in the section with timing information
      for (let i = 0; i < section.points.length; i++) {
        const point = section.points[i];
        if (point) {
          const timing = timings[i] || {
            text: point.text,
            startTime: 0,
            endTime: 0,
            duration: 0
          };
          
          // Add timing information directly to the point
          point.startTime = timing.startTime;
          point.endTime = timing.endTime;
        }
      }
      
      logger.info(PREFIXES.SYNC, `Successfully updated ${section.points.length} points with timing information`);
      
      // Also create and return the PointWithTiming array for backward compatibility
      const pointsWithTiming: PointWithTiming[] = section.points.map((point, index) => {
        const timing = timings[index] || {
          text: point.text,
          startTime: 0,
          endTime: 0,
          duration: 0
        };
        
        return {
          text: point.text,
          videoId: point.videoId,
          videoUrl: point.videoUrl,
          videoThumbnail: point.videoThumbnail,
          startTime: timing.startTime,
          endTime: timing.endTime,
          duration: timing.duration
        };
      });
      
      return pointsWithTiming;
    } catch (error) {
      logger.error(PREFIXES.ERROR, 'Error synchronizing voice-over with points', error);
      throw error;
    }
  }

  /**
   * Generate a voice-over for a section and synchronize it with points
   * @param section The processed section with points and videos
   * @param voiceId The voice ID to use
   * @returns Points with timing information
   */
  async generateAndSyncVoiceOver(
    section: ProcessedSection,
    voiceId: string
  ): Promise<{ voiceOverId: string; points: PointWithTiming[] | null }> {
    try {
      logger.info(PREFIXES.SYNC, `Generating and synchronizing voice-over for section ${section.sectionId}`);
      
      // Combine all point texts into a single text for the voice-over
      const fullText = section.points.map(point => point.text).join(' ');
      
      // Generate the voice-over
      const voiceOver = await voiceService.generateVoiceOver(fullText, voiceId);
      
      logger.info(PREFIXES.SYNC, `Voice-over generation initiated with ID: ${voiceOver.id}`);
      
      // Return the voice-over ID (the actual synchronization will happen after the webhook callback)
      return {
        voiceOverId: voiceOver.id,
        points: null // Will be populated after webhook callback and synchronization
      };
    } catch (error) {
      logger.error(PREFIXES.ERROR, 'Error generating and synchronizing voice-over', error);
      throw error;
    }
  }

  /**
   * Process a completed voice-over and synchronize it with points
   * @param voiceOverId The ID of the completed voice-over
   * @param section The processed section with points and videos
   * @returns Points with timing information
   */
  async processCompletedVoiceOver(
    voiceOverId: string,
    section: ProcessedSection
  ): Promise<PointWithTiming[] | null> {
    try {
      const voiceOver = voiceService.getVoiceOver(voiceOverId);
      
      if (!voiceOver || voiceOver.status !== 'completed' || !voiceOver.audioUrl) {
        logger.warn(
          PREFIXES.SYNC, 
          `Cannot process voice-over ${voiceOverId}: not found, not completed, or no audio URL`
        );
        return null;
      }
      
      // Synchronize the voice-over with the points
      return await this.synchronizeVoiceOverWithPoints(voiceOverId, section);
    } catch (error) {
      logger.error(PREFIXES.ERROR, `Error processing completed voice-over ${voiceOverId}`, error);
      return null;
    }
  }
}

// Export a singleton instance
export const syncService = new SyncService();
