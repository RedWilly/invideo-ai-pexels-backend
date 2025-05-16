/**
 * Section parser service for splitting scripts into sections
 */
import { Section } from '../../types/script-types';
import { logger, PREFIXES } from '../../utils/logger';

/**
 * Service for parsing scripts into sections
 */
export class SectionParser {
  /**
   * Parse a script into sections
   * @param script The full script text
   * @returns Array of sections
   */
  parseScriptIntoSections(script: string): Section[] {
    logger.info(PREFIXES.SCRIPT, 'Parsing script into sections');
    
    // Split script into sections (paragraphs)
    const sectionTexts = script
      .split(/\n\s*\n+/)
      .map(s => s.trim())
      .filter(Boolean);
    
    logger.info(PREFIXES.SCRIPT, `Script split into ${sectionTexts.length} sections`);
    
    // Create section objects
    const sections: Section[] = sectionTexts.map((text, index) => ({
      id: `section${index + 1}`,
      text,
      points: [] // Will be populated by point extractor
    }));
    
    return sections;
  }
}

// Export a singleton instance
export const sectionParser = new SectionParser();
