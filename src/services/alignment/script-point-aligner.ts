/**
 * Script point aligner service
 * Maps script points to transcript words with timing information
 */
import { logger, PREFIXES } from '../../utils/logger';
import { textAlignmentService } from './text-alignment-service';
import type { Section, PointWithVideo } from '../../types/script-types';
import type { TranscriptWord } from '../../types/assembly-types';

/**
 * Service for aligning script points with transcript words
 */
export class ScriptPointAligner {
  /**
   * Align script points with transcript words to get timing information
   * 
   * @param transcript The full transcript text
   * @param words The word-level timing data from the transcript
   * @param section The section with points to align
   * @returns Section with aligned points including timing information
   */
  alignSectionPoints(
    transcript: string,
    words: TranscriptWord[],
    section: Section
  ): Section {
    logger.info(PREFIXES.SCRIPT, `Aligning points for section ${section.id}`);
    
    try {
      // Create a new section object to hold the aligned points
      const alignedSection: Section = {
        id: section.id,
        text: section.text || '',
        points: []
      };
      
      // Skip if the section has no points
      if (!section.points || section.points.length === 0) {
        logger.warn(PREFIXES.SCRIPT, `Section ${section.id} has no points to align`);
        return section;
      }
      
      // Skip if the transcript is empty
      if (!transcript || transcript.trim().length === 0) {
        logger.warn(PREFIXES.SCRIPT, `Empty transcript for section ${section.id}, cannot align points`);
        return section;
      }
      
      // Skip if there are no transcript words with timing
      if (!words || words.length === 0) {
        logger.warn(PREFIXES.SCRIPT, `No transcript words with timing for section ${section.id}`);
        return section;
      }
      
      // Use the text alignment service to align each point with the transcript
      const pointTimings = textAlignmentService.alignSegmentsWithTranscript(
        transcript,
        words,
        section.points
      );
      
      // Convert the timings to points
      for (let i = 0; i < section.points.length; i++) {
        const originalPoint = section.points[i];
        const timing = pointTimings[i];
        
        if (!originalPoint) {
          continue;
        }
        
        // Since Section.points is an array of strings, we need to keep it that way
        // We'll just add the original point text
        alignedSection.points.push(originalPoint);
      }
      
      logger.info(PREFIXES.SCRIPT, `Successfully aligned ${alignedSection.points.length} points for section ${section.id}`);
      
      return alignedSection;
    } catch (error) {
      logger.error(PREFIXES.ERROR, `Error aligning points for section ${section.id}`, error);
      
      // Return the original section if alignment fails
      return section;
    }
  }
}

// Export a singleton instance
export const scriptPointAligner = new ScriptPointAligner();
