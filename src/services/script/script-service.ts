/**
 * Script service for processing scripts and finding videos
 */
import type { 
  ProcessedSection, 
  PointWithVideo, 
  Section,
  ScriptProcessingRequest
} from '../../types/script-types';
import { sectionParser } from './section-parser';
import { pointExtractor } from './point-extractor';
import { videoService } from '../video/video-service';
import { voiceService } from '../voice/voice-service';
import { syncService } from '../sync/sync-service';
import { logger, PREFIXES } from '../../utils/logger';

/**
 * Service for script processing operations
 */
export class ScriptService {
  /**
   * Process a script by splitting it into sections and finding videos for each point
   * Optionally generate voice-overs and synchronize them with points
   * @param request The script processing request
   * @returns An array of sections with their points, corresponding videos, and optionally voice-overs
   */
  async processScript(request: ScriptProcessingRequest): Promise<ProcessedSection[]> {
    try {
      const { script, tag, generateVoiceOver, voiceId, syncAudio } = request;
      
      logger.info(PREFIXES.SCRIPT, 'Starting script processing');
      logger.info(PREFIXES.SCRIPT, `Script length: ${script.length} characters, Tag: "${tag}"`);
      logger.info(PREFIXES.SCRIPT, `Voice generation: ${generateVoiceOver ? 'enabled' : 'disabled'}`);
      logger.info(PREFIXES.SCRIPT, `Audio synchronization: ${syncAudio ? 'enabled' : 'disabled'}`);
      
      // Step 1: Parse script into sections
      const sections = sectionParser.parseScriptIntoSections(script);
      
      // Step 2: Extract points from each section
      const sectionsWithPoints = pointExtractor.extractPointsFromSections(sections);
      
      // Step 3: Find videos for each point
      const processedSections = await this.findVideosForSections(sectionsWithPoints, tag);
      
      // Step 4 (Optional): Generate voice-overs and synchronize with points
      if (generateVoiceOver && voiceId) {
        logger.info(PREFIXES.SCRIPT, 'Starting voice-over generation');
        
        // Process each section for voice generation
        let previousSectionEndTime = 0; // Track the end time of the previous section
      
        for (let i = 0; i < processedSections.length; i++) {
          const section = processedSections[i];
          
          // Skip if section is undefined (shouldn't happen, but TypeScript needs this check)
          if (!section) {
            logger.warn(PREFIXES.SCRIPT, `Section at index ${i} is undefined, skipping`);
            continue;
          }
          
          try {
            // Generate voice-over for this section
            logger.info(PREFIXES.SCRIPT, `Generating voice-over for section ${section.sectionId}`);
            
            // Combine all point texts into a single text for the voice-over
            const fullText = section.points.map(point => point.text).join(' ');
            
            // Generate the voice-over
            const voiceOver = await voiceService.generateVoiceOver(fullText, voiceId);
            
            // Store the voice-over ID in the section
            section.voiceOverId = voiceOver.id;
            
            // Wait for voice-over to complete (in a real-world scenario, this would be handled by a webhook)
            // For demo purposes, we'll poll for completion
            let completedVoiceOver = await this.waitForVoiceOverCompletion(voiceOver.id);
            
            if (completedVoiceOver && completedVoiceOver.audioUrl) {
              // Store the audio URL in the section
              section.audioUrl = completedVoiceOver.audioUrl;
              
              // Step 5 (Optional): Synchronize voice-over with points
              if (syncAudio) {
                logger.info(PREFIXES.SCRIPT, `Synchronizing voice-over for section ${section.sectionId}`);
                logger.info(PREFIXES.SCRIPT, `Using previous section end time: ${previousSectionEndTime}ms`);
                
                // Synchronize the voice-over with the points, passing the previous section end time
                const pointsWithTiming = await syncService.synchronizeVoiceOverWithPoints(
                  voiceOver.id, 
                  section, 
                  previousSectionEndTime
                );
                
                if (pointsWithTiming) {
                  // Update the previous section end time for the next section
                  previousSectionEndTime = section.sectionEndTime || 0;
                  
                  logger.info(PREFIXES.SCRIPT, `Successfully synchronized ${pointsWithTiming.length} points with timing`);
                  logger.info(PREFIXES.SCRIPT, `Section ${section.sectionId} ends at ${previousSectionEndTime}ms`);
                }
              }
            }
          } catch (error) {
            logger.error(PREFIXES.SCRIPT, `Error processing voice-over for section ${section.sectionId}`, error);
            // Continue with other sections even if this one fails
          }
        }
      }
      
      logger.info(PREFIXES.SCRIPT, 'Script processing completed successfully');
      logger.info(PREFIXES.SCRIPT, `Processed ${processedSections.length} sections with videos`);
      
      return processedSections;
    } catch (error) {
      logger.error(PREFIXES.SCRIPT, 'Error processing script', error);
      throw error;
    }
  }
  
  /**
   * Wait for a voice-over to complete
   * @param voiceOverId The ID of the voice-over to wait for
   * @returns The completed voice-over or null if it times out
   */
  private async waitForVoiceOverCompletion(voiceOverId: string, maxAttempts = 10, delayMs = 1000) {
    logger.info(PREFIXES.SCRIPT, `Waiting for voice-over ${voiceOverId} to complete`);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Get the current status of the voice-over
      const voiceOver = voiceService.getVoiceOver(voiceOverId);
      
      if (!voiceOver) {
        logger.warn(PREFIXES.SCRIPT, `Voice-over ${voiceOverId} not found`);
        return null;
      }
      
      if (voiceOver.status === 'completed' && voiceOver.audioUrl) {
        logger.info(PREFIXES.SCRIPT, `Voice-over ${voiceOverId} completed successfully`);
        return voiceOver;
      }
      
      if (voiceOver.status === 'failed') {
        logger.error(PREFIXES.SCRIPT, `Voice-over ${voiceOverId} failed: ${voiceOver.error || 'Unknown error'}`);
        return null;
      }
      
      // Wait before checking again
      logger.info(PREFIXES.SCRIPT, `Voice-over ${voiceOverId} still processing (attempt ${attempt + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
    
    logger.warn(PREFIXES.SCRIPT, `Timed out waiting for voice-over ${voiceOverId} to complete`);
    return null;
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
