/**
 * Text normalizer for alignment preprocessing
 */
import wordsToNumbers from 'words-to-numbers';
import { logger, PREFIXES } from '../../utils/logger';

/**
 * Service for normalizing text before alignment
 */
export class TextNormalizer {
  /**
   * Normalize text for alignment
   * - Convert to lowercase
   * - Remove punctuation
   * - Normalize numbers (convert word numbers to digits)
   * 
   * @param text The text to normalize
   * @returns Normalized text
   */
  normalizeText(text: string): string {
    try {
      // Convert to lowercase
      let normalized = text.toLowerCase();
      
      // Remove punctuation (.,;:"" etc.)
      normalized = normalized.replace(/[.,;:""''!?()[\]{}]/g, '');
      
      // Convert word numbers to digits (e.g., "twenty-six" to "26")
      normalized = this.normalizeNumbers(normalized);
      
      // Normalize whitespace (replace multiple spaces with a single space)
      normalized = normalized.replace(/\s+/g, ' ').trim();
      
      return normalized;
    } catch (error) {
      logger.error(PREFIXES.ERROR, 'Error normalizing text', error);
      return text; // Return original text if normalization fails
    }
  }
  
  /**
   * Normalize numbers in text (convert word numbers to digits)
   * 
   * @param text The text containing numbers to normalize
   * @returns Text with normalized numbers
   */
  private normalizeNumbers(text: string): string {
    try {
      // Convert word numbers to digits using words-to-numbers library
      const result = wordsToNumbers(text);
      
      // If the result is a number, convert it back to string
      if (typeof result === 'number') {
        return result.toString();
      }
      
      // If the result is a string, return it
      if (typeof result === 'string') {
        return result;
      }
      
      // If the result is something else, return the original text
      return text;
    } catch (error) {
      logger.error(PREFIXES.ERROR, 'Error normalizing numbers in text', error);
      return text; // Return original text if normalization fails
    }
  }
  
  /**
   * Tokenize text into words
   * 
   * @param text The text to tokenize
   * @returns Array of word tokens
   */
  tokenize(text: string): string[] {
    // Normalize the text first
    const normalized = this.normalizeText(text);
    
    // Split by whitespace
    return normalized.split(' ').filter(token => token.length > 0);
  }
}

// Export a singleton instance
export const textNormalizer = new TextNormalizer();
