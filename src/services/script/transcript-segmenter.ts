/**
 * Service for segmenting transcripts into sections and points
 * This service takes a transcript and segments it based on the original script structure
 */
import { logger, PREFIXES } from '../../utils/logger';
import type { Section } from '../../types/script-types';
import type { TranscriptWord } from '../../types/assembly-types';
import { sectionParser } from './section-parser';
import { pointExtractor } from './point-extractor';

/**
 * Service for segmenting transcripts into sections and points
 */
export class TranscriptSegmenter {
  /**
   * Segment a transcript into sections and points based on the original script structure
   * @param transcript The full transcript text
   * @param words The word-level timing data from the transcript
   * @param originalScript The original script text (used for structure reference)
   * @returns Sections with points extracted from the transcript
   */
  segmentTranscript(transcript: string, words: TranscriptWord[], originalScript: string): Section[] {
    logger.info(PREFIXES.SCRIPT, 'Segmenting transcript based on original script structure');
    
    try {
      // First, parse the original script to get the section structure
      const originalSections = sectionParser.parseScriptIntoSections(originalScript);
      
      // Extract points from the original sections to understand the structure
      const originalSectionsWithPoints = pointExtractor.extractPointsFromSections(originalSections);
      
      // Create new sections based on the transcript
      const transcriptSections: Section[] = [];
      
      // Keep track of where we are in the transcript
      let transcriptPosition = 0;
      
      // For each original section, create a corresponding transcript section
      for (const originalSection of originalSectionsWithPoints) {
        if (!originalSection) {
          continue;
        }
        
        const transcriptSection: Section = {
          id: originalSection.id,
          text: originalSection.text || '', // Add the text property with a default value
          points: []
        };
        
        // For each point in the original section, find the corresponding text in the transcript
        for (const originalPoint of originalSection.points) {
          if (!originalPoint) {
            continue;
          }
          
          // Find this point in the transcript starting from our current position
          const pointStartIndex = this.findBestMatch(originalPoint, transcript, transcriptPosition);
          
          if (pointStartIndex !== -1) {
            // Determine where this point ends in the transcript
            let pointEndIndex: number;
            
            // If this is the last point in the section, go until the end of the section
            const pointIndex = originalSection.points.indexOf(originalPoint);
            if (pointIndex === originalSection.points.length - 1) {
              // For the last point, find where the next section might start
              const nextSectionIndex = originalSectionsWithPoints.indexOf(originalSection) + 1;
              if (nextSectionIndex < originalSectionsWithPoints.length) {
                // If there's a next section, find where it starts in the transcript
                const nextSection = originalSectionsWithPoints[nextSectionIndex];
                // Make sure the next section has points
                if (nextSection && nextSection.points && nextSection.points.length > 0) {
                  const nextSectionFirstPoint = nextSection.points[0];
                  // Make sure the first point exists
                  if (nextSectionFirstPoint) {
                    const nextSectionStartIndex = this.findBestMatch(nextSectionFirstPoint, transcript, pointStartIndex + originalPoint.length);
                    pointEndIndex = nextSectionStartIndex !== -1 ? nextSectionStartIndex : transcript.length;
                  } else {
                    pointEndIndex = transcript.length;
                  }
                } else {
                  pointEndIndex = transcript.length;
                }
              } else {
                // If this is the last section, go to the end of the transcript
                pointEndIndex = transcript.length;
              }
            } else {
              // If this is not the last point, find where the next point starts
              const nextPoint = originalSection.points[pointIndex + 1];
              if (nextPoint) {
                const nextPointStartIndex = this.findBestMatch(nextPoint, transcript, pointStartIndex + originalPoint.length);
                pointEndIndex = nextPointStartIndex !== -1 ? nextPointStartIndex : transcript.length;
              } else {
                pointEndIndex = transcript.length;
              }
            }
            
            // Extract the transcript text for this point
            const pointTranscript = transcript.substring(pointStartIndex, pointEndIndex).trim();
            
            // Update our position in the transcript
            transcriptPosition = pointEndIndex;
            
            // Add the point to our section
            transcriptSection.points.push(originalPoint);
          }
        }
        
        // Add the section to our results if it has points
        if (transcriptSection.points.length > 0) {
          transcriptSections.push(transcriptSection);
        }
      }
      
      logger.info(PREFIXES.SCRIPT, `Successfully segmented transcript into ${transcriptSections.length} sections`);
      
      return transcriptSections;
    } catch (error) {
      logger.error(PREFIXES.ERROR, 'Error segmenting transcript', error);
      
      // Fallback to the original script structure if there's an error
      logger.info(PREFIXES.SCRIPT, 'Falling back to original script structure');
      const originalSections = sectionParser.parseScriptIntoSections(originalScript);
      return pointExtractor.extractPointsFromSections(originalSections);
    }
  }
  
  /**
   * Segment a transcript for a single section based on the section's points
   * @param transcript The transcript text for this section
   * @param words The word-level timing data from the transcript
   * @param section The original section with points
   * @returns Section with points extracted from the transcript
   */
  segmentSectionTranscript(
    transcript: string,
    words: TranscriptWord[],
    section: Section
  ): Section {
    logger.info(PREFIXES.SCRIPT, `Segmenting transcript for section ${section.id}`);
    
    try {
      const transcriptSection: Section = {
        id: section.id,
        text: section.text || '',
        points: []
      };
      
      // Keep track of where we are in the transcript
      let transcriptPosition = 0;
      
      // For each point in the original section, find the corresponding text in the transcript
      for (const originalPoint of section.points) {
        if (!originalPoint) {
          continue;
        }
        
        // Find this point in the transcript starting from our current position
        const pointStartIndex = this.findBestMatch(originalPoint, transcript, transcriptPosition);
        
        if (pointStartIndex !== -1) {
          // Determine where this point ends in the transcript
          let pointEndIndex: number;
          
          // If this is the last point in the section, go until the end of the transcript
          const pointIndex = section.points.indexOf(originalPoint);
          if (pointIndex === section.points.length - 1) {
            pointEndIndex = transcript.length;
          } else {
            // If this is not the last point, find where the next point starts
            const nextPoint = section.points[pointIndex + 1];
            if (nextPoint) {
              const nextPointStartIndex = this.findBestMatch(nextPoint, transcript, pointStartIndex + originalPoint.length);
              pointEndIndex = nextPointStartIndex !== -1 ? nextPointStartIndex : transcript.length;
            } else {
              pointEndIndex = transcript.length;
            }
          }
          
          // Extract the transcript text for this point
          const pointTranscript = transcript.substring(pointStartIndex, pointEndIndex).trim();
          
          // Update our position in the transcript
          transcriptPosition = pointEndIndex;
          
          // Add the point to our section
          transcriptSection.points.push(originalPoint);
        } else {
          // If we couldn't find a match in the transcript, still include the original point
          // This ensures all points are preserved even if they don't match well in the transcript
          logger.warn(PREFIXES.SCRIPT, `Could not find match for point in transcript: "${originalPoint.substring(0, 30)}..."`);
          transcriptSection.points.push(originalPoint);
        }
      }
      
      logger.info(PREFIXES.SCRIPT, `Successfully segmented transcript for section ${section.id} with ${transcriptSection.points.length} points`);
      
      return transcriptSection;
    } catch (error) {
      logger.error(PREFIXES.ERROR, `Error segmenting transcript for section ${section.id}`, error);
      
      // Fallback to the original section structure if there's an error
      logger.info(PREFIXES.SCRIPT, 'Falling back to original section structure');
      return section;
    }
  }
  
  /**
   * Find the best match for a point in the transcript
   * @param point The point text to find
   * @param transcript The transcript text to search in
   * @param startPosition The position to start searching from
   * @returns The index of the best match, or -1 if no match found
   */
  private findBestMatch(point: string, transcript: string, startPosition: number): number {
    // Normalize both texts for comparison
    const normalizedPoint = this.normalizeText(point);
    const normalizedTranscript = this.normalizeText(transcript);
    
    // Look for an exact match first
    const exactMatchIndex = normalizedTranscript.indexOf(normalizedPoint, startPosition);
    if (exactMatchIndex !== -1) {
      logger.debug(PREFIXES.SCRIPT, `Found exact match for point at position ${exactMatchIndex}`);
      return exactMatchIndex;
    }
    
    // If no exact match, try to find a partial match
    const words = normalizedPoint.split(' ');
    
    // For very short phrases, try a more lenient approach
    if (words.length <= 3) {
      // For short phrases, check if at least 2 words appear in sequence
      if (words.length >= 2) {
        const shortPhrase = words.slice(0, 2).join(' ');
        const shortPhraseIndex = normalizedTranscript.indexOf(shortPhrase, startPosition);
        if (shortPhraseIndex !== -1) {
          logger.debug(PREFIXES.SCRIPT, `Found short phrase match for point at position ${shortPhraseIndex}`);
          return shortPhraseIndex;
        }
      }
    }
    
    // For longer phrases, look for a sequence of significant words that match
    // Get significant words (longer than 3 chars) to avoid matching common words like "the", "and", etc.
    const significantWords = words.filter((word: string) => word.length > 3);
    
    // If we don't have significant words, fall back to using the first few words
    const wordsToUse = significantWords.length > 0 ? significantWords : words.slice(0, 3);
    
    // Try to find matches for each significant word
    let bestMatchIndex = -1;
    let bestSimilarity = 0;
    
    for (const word of wordsToUse) {
      let searchPos = startPosition;
      let wordIndex;
      
      // Look for all occurrences of this word after the start position
      while ((wordIndex = normalizedTranscript.indexOf(word, searchPos)) !== -1) {
        // Check a window of text around this word for similarity
        // Use a window size that's proportional to the point length but with some padding
        const windowSize = Math.min(normalizedPoint.length * 2, 200);
        const contextStart = Math.max(wordIndex - 20, 0); // Include some context before the word
        const contextEnd = Math.min(wordIndex + windowSize, normalizedTranscript.length);
        const context = normalizedTranscript.substring(contextStart, contextEnd);
        
        const similarity = this.calculateSimilarity(normalizedPoint, context);
        
        // If this is a better match than what we've found so far, update our best match
        if (similarity > bestSimilarity && similarity > 0.4) { // Lower threshold for better recall
          bestSimilarity = similarity;
          bestMatchIndex = contextStart;
          
          // If we have a very good match, we can stop searching
          if (similarity > 0.7) {
            break;
          }
        }
        
        // Move past this occurrence for the next iteration
        searchPos = wordIndex + word.length;
      }
      
      // If we found a good match with this word, no need to check other words
      if (bestSimilarity > 0.7) {
        break;
      }
    }
    
    if (bestMatchIndex !== -1) {
      logger.debug(PREFIXES.SCRIPT, `Found fuzzy match for point with similarity ${bestSimilarity.toFixed(2)} at position ${bestMatchIndex}`);
    }
    
    return bestMatchIndex;
  }
  
  /**
   * Normalize text for comparison
   * @param text The text to normalize
   * @returns Normalized text
   */
  private normalizeText(text: string): string {
    return text.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '') // Remove punctuation
      .replace(/\s+/g, ' ')                        // Normalize whitespace
      .trim();
  }
  
  /**
   * Calculate similarity between two strings (simple implementation)
   * @param str1 First string
   * @param str2 Second string
   * @returns Similarity score between 0 and 1
   */
  private calculateSimilarity(str1: string, str2: string): number {
    // If either string is empty, return 0 similarity
    if (!str1 || !str2) {
      return 0;
    }
    
    // If both strings are identical, return 1.0
    if (str1 === str2) {
      return 1.0;
    }
    
    // Split into words for word-level comparison
    const words1 = str1.split(' ');
    const words2 = str2.split(' ');
    
    // If one string is much longer than the other, it's likely not a good match
    // But we still want to check for containment
    const lenRatio = Math.min(words1.length, words2.length) / Math.max(words1.length, words2.length);
    
    // Count matching words (in any order)
    const wordSet1 = new Set(words1);
    const wordSet2 = new Set(words2);
    
    let matchingWords = 0;
    for (const word of wordSet1) {
      if (wordSet2.has(word) && word.length > 2) { // Only count meaningful words
        matchingWords++;
      }
    }
    
    // Calculate word-level similarity
    const wordSimilarity = matchingWords / Math.max(wordSet1.size, wordSet2.size);
    
    // Check for sequence matching (n-grams)
    let sequenceMatches = 0;
    const maxNGramSize = Math.min(4, Math.floor(words1.length / 2), Math.floor(words2.length / 2));
    
    // Check for matching sequences of different lengths
    for (let nGramSize = 2; nGramSize <= maxNGramSize; nGramSize++) {
      // Generate n-grams for both strings
      const nGrams1 = this.generateNGrams(words1, nGramSize);
      const nGrams2 = this.generateNGrams(words2, nGramSize);
      
      // Count matching n-grams
      for (const nGram of nGrams1) {
        if (nGrams2.includes(nGram)) {
          // Weight longer n-grams more heavily
          sequenceMatches += nGramSize;
        }
      }
    }
    
    // Normalize sequence matches
    const maxPossibleMatches = Math.max(words1.length, words2.length) * 2;
    const sequenceSimilarity = Math.min(sequenceMatches / maxPossibleMatches, 1.0);
    
    // Combine different similarity measures with appropriate weights
    // Length ratio is important to avoid matching very different length strings
    // Word similarity catches content overlap
    // Sequence similarity catches phrase structure
    return (lenRatio * 0.2) + (wordSimilarity * 0.4) + (sequenceSimilarity * 0.4);
  }

  /**
   * Generate n-grams from an array of words
   * @param words Array of words to generate n-grams from
   * @param n Size of each n-gram
   * @returns Array of n-grams (each n-gram is a string of words joined by spaces)
   */
  private generateNGrams(words: string[], n: number): string[] {
    const nGrams: string[] = [];
    
    // If we don't have enough words for an n-gram, return empty array
    if (words.length < n) {
      return nGrams;
    }
    
    // Generate all possible n-grams
    for (let i = 0; i <= words.length - n; i++) {
      const nGram = words.slice(i, i + n).join(' ');
      nGrams.push(nGram);
    }
    
    return nGrams;
  }
}

// Export a singleton instance
export const transcriptSegmenter = new TranscriptSegmenter();
