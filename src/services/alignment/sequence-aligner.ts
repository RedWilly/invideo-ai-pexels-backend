/**
 * Sequence aligner for text alignment
 */
import { distance } from 'fastest-levenshtein';
import { logger, PREFIXES } from '../../utils/logger';

/**
 * Represents an alignment between two sequences
 */
export interface Alignment {
  // Index in the reference sequence
  refIndex: number;
  // Index in the target sequence
  targetIndex: number;
  // Levenshtein distance between the tokens
  distance: number;
}

/**
 * Represents a word with timing information
 */
export interface TimedWord {
  // The word text
  text: string;
  // Start time in milliseconds
  start: number;
  // End time in milliseconds
  end: number;
}

/**
 * Service for aligning sequences using dynamic programming
 */
export class SequenceAligner {
  /**
   * Align two sequences of tokens using Levenshtein distance
   * 
   * @param referenceTokens The reference sequence tokens
   * @param targetTokens The target sequence tokens
   * @returns Array of alignments between tokens
   */
  alignSequences(referenceTokens: string[], targetTokens: string[]): Alignment[] {
    try {
      logger.info(
        PREFIXES.SYNC, 
        `Aligning sequences: ${referenceTokens.length} reference tokens, ${targetTokens.length} target tokens`
      );
      
      const alignments: Alignment[] = [];
      
      // For each reference token, find the best matching target token
      for (let i = 0; i < referenceTokens.length; i++) {
        const refToken = referenceTokens[i];
        let bestMatch: Alignment | null = null;
        
        // Find the best matching target token for this reference token
        for (let j = 0; j < targetTokens.length; j++) {
          const targetToken = targetTokens[j];
          // Ensure both tokens are strings (they should be, but TypeScript needs assurance)
          const safeRefToken = refToken || '';
          const safeTargetToken = targetToken || '';
          const distanceValue = distance(safeRefToken, safeTargetToken);
          
          // If this is the first match or better than the current best match
          if (bestMatch === null || distanceValue < bestMatch.distance) {
            bestMatch = {
              refIndex: i,
              targetIndex: j,
              distance: distanceValue
            };
          }
        }
        
        // If we found a match, add it to the alignments
        if (bestMatch !== null) {
          alignments.push(bestMatch);
        }
      }
      
      return this.filterAlignments(alignments);
    } catch (error) {
      logger.error(PREFIXES.ERROR, 'Error aligning sequences', error);
      return [];
    }
  }
  
  /**
   * Filter alignments to remove duplicates and ensure one-to-one mapping
   * 
   * @param alignments The raw alignments
   * @returns Filtered alignments
   */
  private filterAlignments(alignments: Alignment[]): Alignment[] {
    // Sort alignments by distance (ascending)
    const sortedAlignments = [...alignments].sort((a, b) => a.distance - b.distance);
    
    // Keep track of which indices have been used
    const usedRefIndices = new Set<number>();
    const usedTargetIndices = new Set<number>();
    
    // Filtered alignments
    const filteredAlignments: Alignment[] = [];
    
    // Process alignments in order of increasing distance
    for (const alignment of sortedAlignments) {
      // Skip if either index has already been used
      if (usedRefIndices.has(alignment.refIndex) || usedTargetIndices.has(alignment.targetIndex)) {
        continue;
      }
      
      // Add this alignment
      filteredAlignments.push(alignment);
      
      // Mark indices as used
      usedRefIndices.add(alignment.refIndex);
      usedTargetIndices.add(alignment.targetIndex);
    }
    
    // Sort by reference index to maintain original order
    return filteredAlignments.sort((a, b) => a.refIndex - b.refIndex);
  }
  
  /**
   * Get timing information for a segment based on alignments
   * 
   * @param segment The original segment text
   * @param segmentTokens The tokenized segment
   * @param transcriptTokens The tokenized transcript
   * @param transcriptWords The transcript words with timing information
   * @param alignments The alignments between segment and transcript tokens
   * @returns Start time, end time, and duration for the segment
   */
  getSegmentTiming(
    segment: string,
    segmentTokens: string[],
    transcriptTokens: string[],
    transcriptWords: TimedWord[],
    alignments: Alignment[]
  ): { startTime: number; endTime: number; duration: number } {
    try {
      // Filter alignments to only include those for this segment
      const segmentAlignments = alignments.filter(
        alignment => alignment.refIndex < segmentTokens.length
      );
      
      if (segmentAlignments.length === 0) {
        logger.warn(PREFIXES.SYNC, `No alignments found for segment: "${segment.substring(0, 30)}..."`);
        return { startTime: 0, endTime: 0, duration: 0 };
      }
      
      // Find the first and last aligned target indices
      const firstTargetIndex = Math.min(...segmentAlignments.map(a => a.targetIndex));
      const lastTargetIndex = Math.max(...segmentAlignments.map(a => a.targetIndex));
      
      // Get the corresponding transcript words
      const firstWord = transcriptWords[firstTargetIndex];
      const lastWord = transcriptWords[lastTargetIndex];
      
      if (!firstWord || !lastWord) {
        logger.warn(
          PREFIXES.SYNC, 
          `Missing transcript words for segment: "${segment.substring(0, 30)}..."`
        );
        return { startTime: 0, endTime: 0, duration: 0 };
      }
      
      const startTime = firstWord.start;
      const endTime = lastWord.end;
      const duration = endTime - startTime;
      
      logger.info(
        PREFIXES.SYNC, 
        `Segment timing: "${segment.substring(0, 30)}..." => ${startTime}ms to ${endTime}ms (${duration}ms)`
      );
      
      return { startTime, endTime, duration };
    } catch (error) {
      logger.error(
        PREFIXES.ERROR, 
        `Error getting segment timing for: "${segment.substring(0, 30)}..."`, 
        error
      );
      return { startTime: 0, endTime: 0, duration: 0 };
    }
  }
}

// Export a singleton instance
export const sequenceAligner = new SequenceAligner();
