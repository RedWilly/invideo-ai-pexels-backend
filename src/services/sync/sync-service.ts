/**
 * Synchronization service for matching voice-overs with videos
 */
import { AssemblyClient } from '../../integrations/sync/assembly-client';
import { voiceService } from '../voice/voice-service';
import { logger, PREFIXES } from '../../utils/logger';
import type { VoiceOver } from '../../types/tts-types';
import type { TextTiming, PointWithTiming, TranscriptWord } from '../../types/assembly-types';
import type { ProcessedSection, PointWithVideo } from '../../types/script-types';

// Buffer time to add at the end of each section (in milliseconds)
const SECTION_END_BUFFER = 500;

/**
 * Service for synchronizing voice-overs with videos
 */
export class SyncService {
  /**
   * Synchronize a voice-over with points to create timed points
   * @param voiceOverId The ID of the voice-over
   * @param section The processed section with points and videos
   * @param previousSectionEndTime Optional end time of the previous section for continuous timing
   * @param existingTranscript Optional existing transcript (to avoid transcribing again)
   * @returns Points with timing information
   */
  async synchronizeVoiceOverWithPoints(
    voiceOverId: string,
    section: ProcessedSection,
    previousSectionEndTime?: number,
    existingTranscript?: { text: string; words: TranscriptWord[] | undefined }
  ): Promise<PointWithTiming[]> {
    try {
      logger.info(PREFIXES.SYNC, `Synchronizing voice-over ${voiceOverId} with ${section.points.length} points`);
      
      let transcript;
      
      // If we already have a transcript, use it
      if (existingTranscript && existingTranscript.words && existingTranscript.words.length > 0) {
        logger.info(PREFIXES.SYNC, 'Using existing transcript for synchronization');
        transcript = existingTranscript;
      } else {
        // Otherwise, get the voice-over and transcribe it
        logger.info(PREFIXES.SYNC, 'No existing transcript provided, transcribing voice-over');
        
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
        transcript = await assemblyClient.transcribeAudio(voiceOver.audioUrl);
        
        if (!transcript.words || transcript.words.length === 0) {
          throw new Error('Transcription did not return word-level details');
        }
        
        logger.info(PREFIXES.SYNC, `Transcribed voice-over with ${transcript.words.length} words`);
      }
      
      // Extract the text from each point
      const pointTexts = section.points.map(point => point.text);
      
      // Match the point texts with the transcription to get timing
      // Create an AssemblyClient instance if we don't already have one
      const assemblyClient = new AssemblyClient(process.env.ASSEMBLYAI_API_KEY || '');
      
      // Make sure transcript.words is defined before using it
      if (!transcript.words) {
        throw new Error('Transcript words are undefined');
      }
      
      const timings = assemblyClient.matchTextWithTiming(
        transcript.text,
        transcript.words,
        pointTexts
      );
      
      // Set the section offset based on previous section end time or default to 0
      section.sectionOffset = previousSectionEndTime || 0;
      
      // Store the original timings for reference
      const originalTimings = timings.map(timing => ({ ...timing }));
      
      // First pass: Set start times for all points
      for (let i = 0; i < section.points.length; i++) {
        const point = section.points[i];
        if (!point) continue;
        
        if (i === 0) {
          // First point in section starts at the section offset
          point.startTime = section.sectionOffset;
        } else {
          // Other points start at the end time of the previous point
          const prevPoint = section.points[i - 1];
          if (prevPoint && prevPoint.endTime !== undefined) {
            point.startTime = prevPoint.endTime;
          } else {
            // Fallback to original timing if previous point is not available
            const originalTiming = originalTimings[i] || { startTime: 0, endTime: 0 };
            point.startTime = section.sectionOffset + originalTiming.startTime;
          }
        }
      }
      
      // Second pass: Set end times for all points
      for (let i = 0; i < section.points.length; i++) {
        const point = section.points[i];
        if (!point) continue;
        
        if (i < section.points.length - 1) {
          // If not the last point, end time is the start time of the next point
          const nextPoint = section.points[i + 1];
          if (nextPoint && nextPoint.startTime !== undefined) {
            point.endTime = nextPoint.startTime;
          } else {
            // Fallback to original timing if next point is not available
            const originalTiming = originalTimings[i] || { startTime: 0, endTime: 0 };
            const originalDuration = originalTiming.endTime - originalTiming.startTime;
            point.endTime = (point.startTime || 0) + originalDuration;
          }
        } else {
          // Last point in section - use original end time plus section offset
          const originalTiming = originalTimings[i] || { startTime: 0, endTime: 0 };
          const originalDuration = originalTiming.endTime - originalTiming.startTime;
          point.endTime = (point.startTime || 0) + originalDuration;
        }
      }
      
      // Add buffer to the last point's endTime instead of using a separate sectionEndTime field
      const lastPoint = section.points[section.points.length - 1];
      if (lastPoint && lastPoint.endTime !== undefined) {
        // Add buffer directly to the last point's endTime
        lastPoint.endTime += SECTION_END_BUFFER;
        
        // Still track sectionEndTime internally for continuous timing between sections
        section.sectionEndTime = lastPoint.endTime;
      } else {
        // Fallback if no points or last point has no end time
        // Create a safe lastTiming object with default values if originalTimings is empty
        const lastTiming = originalTimings.length > 0 ? originalTimings[originalTimings.length - 1] : { startTime: 0, endTime: 0 };
        // Use nullish coalescing to handle potential undefined values
        const offset = section.sectionOffset ?? 0;
        const endTime = lastTiming?.endTime ?? 0;
        section.sectionEndTime = offset + endTime + SECTION_END_BUFFER;
      }
      
      logger.info(PREFIXES.SYNC, `Successfully updated ${section.points.length} points with timing information`);
      logger.info(PREFIXES.SYNC, `Section ${section.sectionId} timing: offset=${section.sectionOffset}ms, end=${section.sectionEndTime}ms`);
      
      // Create and return PointWithTiming array for backward compatibility
      const pointsWithTiming: PointWithTiming[] = section.points.map((point, index) => {
        return {
          text: point.text,
          videoId: point.videoId,
          videoUrl: point.videoUrl,
          videoThumbnail: point.videoThumbnail,
          startTime: Math.round(point.startTime || 0),
          endTime: Math.round(point.endTime || 0),
          duration: Math.round((point.endTime || 0) - (point.startTime || 0))
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
   * @param previousSectionEndTime Optional end time of the previous section for continuous timing
   * @returns Points with timing information
   */
  async processCompletedVoiceOver(
    voiceOverId: string,
    section: ProcessedSection,
    previousSectionEndTime?: number
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
      
      // Synchronize the voice-over with the points, passing the previous section end time
      return await this.synchronizeVoiceOverWithPoints(voiceOverId, section, previousSectionEndTime);
    } catch (error) {
      logger.error(PREFIXES.ERROR, `Error processing completed voice-over ${voiceOverId}`, error);
      return null;
    }
  }
}

// Export a singleton instance
export const syncService = new SyncService();
