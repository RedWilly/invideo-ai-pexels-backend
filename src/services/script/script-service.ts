/**
 * Script service for processing scripts and finding videos
 */
import type { 
  ProcessedSection, 
  PointWithVideo, 
  Section 
} from '../../types/script-types';
import { sectionParser } from './section-parser';
import { pointExtractor } from './point-extractor';
import { videoService } from '../video/video-service';
import { logger, PREFIXES } from '../../utils/logger';

/**
 * Service for script processing operations
 */
export class ScriptService {
  /**
   * Process a script by splitting it into sections and finding videos for each point
   * @param script The full script text
   * @param tag The tag to append to search queries
   * @returns An array of sections with their points and corresponding videos
   */
  async processScript(script: string, tag: string): Promise<ProcessedSection[]> {
    try {
      logger.info(PREFIXES.SCRIPT, 'Starting script processing');
      logger.info(PREFIXES.SCRIPT, `Script length: ${script.length} characters, Tag: "${tag}"`);
      
      // Step 1: Parse script into sections
      const sections = sectionParser.parseScriptIntoSections(script);
      
      // Step 2: Extract points from each section
      const sectionsWithPoints = pointExtractor.extractPointsFromSections(sections);
      
      // Step 3: Find videos for each point
      const processedSections = await this.findVideosForSections(sectionsWithPoints, tag);
      
      logger.info(PREFIXES.SCRIPT, 'Script processing completed successfully');
      logger.info(PREFIXES.SCRIPT, `Processed ${processedSections.length} sections with videos`);
      
      return processedSections;
    } catch (error) {
      logger.error(PREFIXES.SCRIPT, 'Error processing script', error);
      throw error;
    }
  }
  
  /**
   * Find videos for all points in all sections
   * @param sections Sections with points
   * @param tag Tag to append to search queries
   * @returns Processed sections with videos
   */
  private async findVideosForSections(
    sections: Section[], 
    tag: string
  ): Promise<ProcessedSection[]> {
    const results: ProcessedSection[] = [];
    
    // Process each section
    for (const section of sections) {
      logger.info(PREFIXES.SCRIPT, `Finding videos for ${section.id} (${section.points.length} points)`);
      
      const pointResults: PointWithVideo[] = [];
      
      // Find videos for each point
      for (let i = 0; i < section.points.length; i++) {
        const point = section.points[i];
        
        logger.info(PREFIXES.SCRIPT, `Processing point ${i + 1}/${section.points.length}`);
        
        // Ensure point is a string and find a video for it
        const safePoint = point || '';
        const video = await videoService.findVideoForPoint(safePoint, tag);
        
        // Add to results (with empty values if no video found)
        pointResults.push({
          text: safePoint,
          videoId: video?.id || '',
          videoUrl: video?.url || '',
          videoThumbnail: video?.image || ''
        });
      }
      
      // Add processed section to results
      results.push({
        sectionId: section.id,
        points: pointResults
      });
    }
    
    return results;
  }
}

// Export a singleton instance
export const scriptService = new ScriptService();
