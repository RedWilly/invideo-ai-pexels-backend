/**
 * Point extractor service for splitting sections into points
 */
import type { Section } from '../../types/script-types';
import { splitSection } from '../../utils/text-processing';
import { logger, PREFIXES } from '../../utils/logger';

/**
 * Service for extracting points from sections
 */
export class PointExtractor {
  /**
   * Extract points from a section
   * @param section The section to extract points from
   * @returns The section with populated points
   */
  extractPointsFromSection(section: Section): Section {
    logger.info(PREFIXES.SCRIPT, `Extracting points from ${section.id}`);
    logger.info(PREFIXES.SCRIPT, `Section length: ${section.text.length} characters`);
    
    // Extract points using the splitSection utility
    const points = splitSection(section.text);
    
    logger.info(PREFIXES.SCRIPT, `Split into ${points.length} points`);
    
    // Log the points (truncated for readability)
    points.forEach((point, idx) => {
      logger.debug(
        PREFIXES.SCRIPT, 
        `  ${idx + 1}. ${point.substring(0, 60)}${point.length > 60 ? '...' : ''}`
      );
    });
    
    // Return a new section object with the points
    return {
      ...section,
      points
    };
  }
  
  /**
   * Extract points from multiple sections
   * @param sections Array of sections to extract points from
   * @returns Sections with populated points
   */
  extractPointsFromSections(sections: Section[]): Section[] {
    return sections.map(section => this.extractPointsFromSection(section));
  }
  
  /**
   * Extract points directly from text
   * @param text The text to extract points from
   * @returns Array of points (strings)
   */
  extractPointsFromText(text: string): string[] {
    logger.info(PREFIXES.SCRIPT, `Extracting points from text (${text.length} characters)`);
    
    // Extract points using the splitSection utility
    const points = splitSection(text);
    
    logger.info(PREFIXES.SCRIPT, `Split into ${points.length} points`);
    
    // Log the points (truncated for readability)
    points.forEach((point, idx) => {
      logger.debug(
        PREFIXES.SCRIPT, 
        `  ${idx + 1}. ${point.substring(0, 60)}${point.length > 60 ? '...' : ''}`
      );
    });
    
    return points;
  }
}

// Export a singleton instance
export const pointExtractor = new PointExtractor();
