/**
 * AssemblyAI client for audio transcription
 */
import { AssemblyAI } from 'assemblyai';
import { env } from '../../config/env';
import { logger, PREFIXES } from '../../utils/logger';
import type { TranscriptResponse, TranscriptionParams, TranscriptWord, TextTiming } from './assembly-types';

/**
 * Client for interacting with the AssemblyAI API
 */
export class AssemblyClient {
  private client: any;

  constructor(apiKey: string) {
    this.client = new AssemblyAI({
      apiKey
    });
  }

  /**
   * Transcribe audio to get word-level timing information
   * @param audioUrl URL of the audio file to transcribe
   * @returns Transcript with word-level details
   */
  async transcribeAudio(audioUrl: string): Promise<TranscriptResponse> {
    try {
      logger.info(PREFIXES.SYNC, `Transcribing audio from URL: ${audioUrl}`);
      
      const params: TranscriptionParams = {
        audio: audioUrl
      };
      
      const transcript = await this.client.transcripts.transcribe(params);
      
      if (transcript.status === 'completed') {
        logger.info(PREFIXES.SYNC, `Transcription completed successfully. ID: ${transcript.id}`);
        logger.info(PREFIXES.SYNC, `Words detected: ${transcript.words?.length || 0}`);
      } else {
        logger.error(PREFIXES.ERROR, `Transcription failed: ${transcript.error || 'Unknown error'}`);
      }
      
      return transcript;
    } catch (error) {
      logger.error(PREFIXES.ERROR, 'Error transcribing audio', error);
      throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Match text segments with transcription to get timing information
   * @param text The full text that was transcribed
   * @param words The word-level details from transcription
   * @param segments The text segments to match with timing
   * @returns Segments with timing information
   */
  matchTextWithTiming(text: string, words: TranscriptWord[], segments: string[]): TextTiming[] {
    logger.info(PREFIXES.SYNC, `Matching ${segments.length} text segments with transcription`);
    
    const results: TextTiming[] = [];
    
    // For each segment, find its position in the full text and match with word timings
    for (const segment of segments) {
      try {
        // Find the segment in the full text (case insensitive)
        const segmentLower = segment.toLowerCase();
        const textLower = text.toLowerCase();
        const segmentIndex = textLower.indexOf(segmentLower);
        
        if (segmentIndex === -1) {
          logger.warn(PREFIXES.SYNC, `Segment not found in transcription: "${segment.substring(0, 30)}..."`);
          // Add a placeholder with no timing
          results.push({
            text: segment,
            startTime: 0,
            endTime: 0,
            duration: 0
          });
          continue;
        }
        
        // Find the words that correspond to this segment
        let startWord: TranscriptWord | null = null;
        let endWord: TranscriptWord | null = null;
        let currentPosition = 0;
        
        for (const word of words) {
          // Calculate the approximate position of this word in the full text
          const wordEndPosition = currentPosition + word.text.length;
          
          // If this word is within our segment range
          if (currentPosition >= segmentIndex && !startWord) {
            startWord = word;
          }
          
          if (wordEndPosition >= segmentIndex + segmentLower.length && !endWord && startWord) {
            endWord = word;
            break;
          }
          
          currentPosition += word.text.length + 1; // +1 for the space
        }
        
        if (startWord && endWord) {
          const timing: TextTiming = {
            text: segment,
            startTime: startWord.start,
            endTime: endWord.end,
            duration: endWord.end - startWord.start
          };
          
          results.push(timing);
          logger.info(
            PREFIXES.SYNC, 
            `Matched segment: "${segment.substring(0, 30)}..." => ${timing.startTime}ms to ${timing.endTime}ms`
          );
        } else {
          // If we couldn't find the exact words, estimate based on character position
          logger.warn(PREFIXES.SYNC, `Could not find exact word boundaries for segment: "${segment.substring(0, 30)}..."`);
          
          // Fallback: estimate timing based on character position in the full text
          const segmentRatio = segmentIndex / textLower.length;
          const segmentEndRatio = (segmentIndex + segmentLower.length) / textLower.length;
          
          // Make sure we have words to work with
          if (words.length > 0) {
            // We've already checked that words.length > 0, so these accesses are safe
            // TypeScript doesn't recognize this, so we need to use non-null assertion
            const firstWord = words[0]!;
            const lastWord = words[words.length - 1]!;
            
            // Calculate timing based on word positions
            const totalDuration = lastWord.end - firstWord.start;
            const estimatedStart = firstWord.start + (totalDuration * segmentRatio);
            const estimatedEnd = firstWord.start + (totalDuration * segmentEndRatio);
            
            results.push({
              text: segment,
              startTime: Math.round(estimatedStart),
              endTime: Math.round(estimatedEnd),
              duration: Math.round(estimatedEnd - estimatedStart)
            });
          } else {
            // No words available, add a placeholder
            results.push({
              text: segment,
              startTime: 0,
              endTime: 0,
              duration: 0
            });
          }
        }
      } catch (error) {
        logger.error(PREFIXES.ERROR, `Error matching segment: "${segment.substring(0, 30)}..."`, error);
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
  }
}

// Create and export a singleton instance
export const assemblyClient = new AssemblyClient(env.ASSEMBLYAI_API_KEY);