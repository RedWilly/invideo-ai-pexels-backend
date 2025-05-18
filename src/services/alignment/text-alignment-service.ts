/**
 * Text alignment service for synchronizing text with audio
 */
import { logger, PREFIXES } from '../../utils/logger';
import { textNormalizer } from './text-normalizer';
import { sequenceAligner } from './sequence-aligner';
import type { TimedWord } from './sequence-aligner';
import type { TextTiming } from '../../types/assembly-types';
import type { TranscriptWord } from '../../types/assembly-types';

/**
 * Service for aligning text with audio transcriptions
 */
export class TextAlignmentService {
  /**
   * Align segments with transcript to get timing information
   * 
   * @param transcriptText The full text that was transcribed
   * @param transcriptWords The word-level details from transcription
   * @param segments The text segments to align with timing
   * @returns Segments with timing information
   */
  alignSegmentsWithTranscript(
    transcriptText: string, 
    transcriptWords: TranscriptWord[], 
    segments: string[]
  ): TextTiming[] {
    try {
      logger.info(PREFIXES.SYNC, `Aligning ${segments.length} segments with transcript using sliding window`);
      
      // Convert TranscriptWord[] to TimedWord[]
      const timedWords: TimedWord[] = transcriptWords.map(word => ({
        text: word.text,
        start: word.start,
        end: word.end
      }));
      
      // Normalize and tokenize the transcript text
      const normalizedTranscript = textNormalizer.normalizeText(transcriptText);
      const transcriptTokens = textNormalizer.tokenize(normalizedTranscript);
      
      // Process each segment
      const results: TextTiming[] = [];
      
      // Keep track of the current position in the transcript
      // This is our sliding window cursor that ensures we only match against
      // transcript tokens that haven't been consumed by previous segments
      let currentTranscriptIndex = 0;
      
      for (const segment of segments) {
        try {
          // Normalize and tokenize the segment
          const normalizedSegment = textNormalizer.normalizeText(segment);
          const segmentTokens = textNormalizer.tokenize(normalizedSegment);
          
          logger.info(
            PREFIXES.SYNC, 
            `Processing segment: "${segment.substring(0, 30)}..." (${segmentTokens.length} tokens, starting from transcript index ${currentTranscriptIndex})`
          );
          
          // Skip empty segments
          if (segmentTokens.length === 0) {
            results.push({
              text: segment,
              startTime: 0,
              endTime: 0,
              duration: 0
            });
            continue;
          }
          
          // Create a subset of transcript tokens starting from the current position
          const remainingTranscriptTokens = transcriptTokens.slice(currentTranscriptIndex);
          
          // If we've consumed all transcript tokens, add a placeholder
          if (remainingTranscriptTokens.length === 0) {
            logger.warn(
              PREFIXES.SYNC, 
              `No remaining transcript tokens for segment: "${segment.substring(0, 30)}..."`
            );
            results.push({
              text: segment,
              startTime: 0,
              endTime: 0,
              duration: 0
            });
            continue;
          }
          
          // Align the segment tokens with the remaining transcript tokens
          const localAlignments = sequenceAligner.alignSequences(segmentTokens, remainingTranscriptTokens);
          
          // If no alignments were found, add a placeholder
          if (localAlignments.length === 0) {
            logger.warn(
              PREFIXES.SYNC, 
              `No alignments found for segment: "${segment.substring(0, 30)}..."`
            );
            results.push({
              text: segment,
              startTime: 0,
              endTime: 0,
              duration: 0
            });
            continue;
          }
          
          // Adjust the target indices to account for the sliding window
          const globalAlignments = localAlignments.map(alignment => ({
            ...alignment,
            targetIndex: alignment.targetIndex + currentTranscriptIndex
          }));
          
          // Get timing information for the segment
          const timing = sequenceAligner.getSegmentTiming(
            segment,
            segmentTokens,
            transcriptTokens,
            timedWords,
            globalAlignments
          );
          
          // Add the result
          results.push({
            text: segment,
            startTime: timing.startTime,
            endTime: timing.endTime,
            duration: timing.duration
          });
          
          logger.info(
            PREFIXES.SYNC, 
            `Aligned segment: "${segment.substring(0, 30)}..." => ${timing.startTime}ms to ${timing.endTime}ms`
          );
          
          // Update the current position to the last matched token + 1
          // This ensures we don't reuse tokens that have already been matched
          if (globalAlignments.length > 0) {
            const lastMatchedIndex = Math.max(...globalAlignments.map(a => a.targetIndex));
            currentTranscriptIndex = lastMatchedIndex + 1;
            logger.info(
              PREFIXES.SYNC, 
              `Advanced transcript cursor to index ${currentTranscriptIndex}`
            );
          }
        } catch (error) {
          logger.error(
            PREFIXES.ERROR, 
            `Error processing segment: "${segment.substring(0, 30)}..."`, 
            error
          );
          // Add a placeholder with no timing
          results.push({
            text: segment,
            startTime: 0,
            endTime: 0,
            duration: 0
          });
        }
      }
      
      return results;
    } catch (error) {
      logger.error(PREFIXES.ERROR, 'Error aligning segments with transcript', error);
      
      // Return placeholders for all segments
      return segments.map(segment => ({
        text: segment,
        startTime: 0,
        endTime: 0,
        duration: 0
      }));
    }
  }
}

// Export a singleton instance
export const textAlignmentService = new TextAlignmentService();
