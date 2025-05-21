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
import { scriptPointAligner } from '../alignment/script-point-aligner';
import { videoService } from '../video/video-service';
import { voiceService } from '../voice/voice-service';
import { syncService } from '../sync/sync-service';
import { logger, PREFIXES } from '../../utils/logger';
import { AssemblyClient } from '../../integrations/sync/assembly-client';

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
      
      const sections = sectionParser.parseScriptIntoSections(script);
      logger.info(PREFIXES.SCRIPT, `Parsed script into ${sections.length} sections`);
      
      // If we're not generating voice-overs, use the direct processing flow
      if (!generateVoiceOver) {
        logger.info(PREFIXES.SCRIPT, 'Skipping voice-over generation, using direct processing');
        return await this.processScriptDirectly(script, tag);
      }
      
      // Step 2: Generate voice-overs for all sections first
      const sectionsWithVoiceOvers: Array<{ section: Section, voiceOver: any }> = [];
      
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        
        if (!section) {
          logger.warn(PREFIXES.SCRIPT, `Skipping undefined section at index ${i}`);
          continue;
        }
        
        try {
          // Generate voice-over for this section
          const sectionText = section.text || '';
          logger.info(PREFIXES.SCRIPT, `Generating voice-over for section ${section.id} (${sectionText.length} chars)`);
          
          const voiceOver = await voiceService.generateVoiceOver(sectionText, voiceId!);
          logger.info(PREFIXES.SCRIPT, `Voice-over generation initiated for section ${section.id}. ID: ${voiceOver.id}`);
          
          // Wait for voice-over to complete
          const completedVoiceOver = await this.waitForVoiceOverCompletion(voiceOver.id);
          
          if (!completedVoiceOver || !completedVoiceOver.audioUrl) {
            logger.error(PREFIXES.SCRIPT, `Voice-over generation failed for section ${section.id}, skipping to next section`);
            continue;
          }
          
          logger.info(PREFIXES.SCRIPT, `Voice-over completed successfully for section ${section.id}`);
          
          // Add to our list of sections with voice-overs
          sectionsWithVoiceOvers.push({
            section,
            voiceOver: completedVoiceOver
          });
          
        } catch (error) {
          logger.error(PREFIXES.SCRIPT, `Error generating voice-over for section ${section.id}`, error);
          // Continue with other sections even if this one fails
        }
      }
      
      // If no voice-overs were generated, fall back to direct processing
      if (sectionsWithVoiceOvers.length === 0) {
        logger.error(PREFIXES.SCRIPT, 'Failed to generate any voice-overs, falling back to direct processing');
        return await this.processScriptDirectly(request.script, request.tag);
      }
      
      // Step 3: Process each section with its voice-over
      const processedSections: ProcessedSection[] = [];
      let previousSectionEndTime = 0;
      
      for (const { section, voiceOver } of sectionsWithVoiceOvers) {
        try {
          // Step 3.1: Transcribe the voice-over to get the exact spoken text with timing
          logger.info(PREFIXES.SCRIPT, `Transcribing voice-over for section ${section.id}`);
          const assemblyClient = new AssemblyClient(process.env.ASSEMBLYAI_API_KEY || '');
          const transcript = await assemblyClient.transcribeAudio(voiceOver.audioUrl);
          
          if (!transcript || !transcript.text) {
            logger.error(PREFIXES.SCRIPT, `Transcription failed for section ${section.id}, skipping to next section`);
            continue;
          }
          
          logger.info(PREFIXES.SCRIPT, `Transcription completed successfully for section ${section.id}`);
          logger.info(PREFIXES.SCRIPT, `Transcript length: ${transcript.text.length} characters`);
          
          // Step 3.2: Extract points from the transcription (not the original script)
          logger.info(PREFIXES.SCRIPT, `Extracting points from transcript for section ${section.id}`);
          const transcriptSection: Section = {
            id: section.id,
            text: transcript.text,
            points: []
          };
          
          // Extract points from the transcript text
          const extractedPoints = pointExtractor.extractPointsFromText(transcript.text);
          transcriptSection.points = extractedPoints;
          
          logger.info(PREFIXES.SCRIPT, `Extracted ${transcriptSection.points.length} points from transcript for section ${section.id}`);
          
          // Step 3.3: Find videos for each point
          logger.info(PREFIXES.SCRIPT, `Finding videos for section ${section.id}`);
          const processedSectionResult = await this.findVideosForSections([transcriptSection], request.tag);
          const processedSection = processedSectionResult[0];
          
          if (!processedSection) {
            logger.error(PREFIXES.SCRIPT, `Failed to process section ${section.id}, skipping to next section`);
            continue;
          }
          
          // Step 3.4: Synchronize the voice-over with the points if requested
          if (syncAudio) {
            logger.info(PREFIXES.SCRIPT, `Synchronizing voice-over for section ${section.id}`);
            
            // Pass the transcript to avoid redundant transcription
            const transcriptForSync = { text: transcript.text, words: transcript.words };
            const pointsWithTiming = await syncService.synchronizeVoiceOverWithPoints(
              voiceOver.id,
              processedSection,
              previousSectionEndTime,
              transcriptForSync
            );
            
            // Update the processed section with timing information
            processedSection.points = pointsWithTiming;
            
            // Update the end time for the next section
            if (pointsWithTiming && pointsWithTiming.length > 0) {
              const lastPoint = pointsWithTiming[pointsWithTiming.length - 1];
              if (lastPoint) {
                previousSectionEndTime = Math.round(lastPoint.endTime || 0);
                // No need to add a gap here, the sync service already adds SECTION_END_BUFFER
              }
            }
          }
          
          // Add voice-over information to the processed section
          processedSection.voiceOverId = voiceOver.id;
          processedSection.audioUrl = voiceOver.audioUrl;
          
          // Add the processed section to our results
          processedSections.push(processedSection);
          
        } catch (error) {
          logger.error(PREFIXES.SCRIPT, `Error processing section ${section.id}`, error);
          // Continue with other sections even if this one fails
        }
      }
      
      if (processedSections.length === 0) {
        logger.error(PREFIXES.SCRIPT, 'All sections failed to process, falling back to direct processing');
        return await this.processScriptDirectly(request.script, request.tag);
      }
      
      return processedSections;
    } catch (error) {
      logger.error(PREFIXES.ERROR, 'Error processing script', error);
      return await this.processScriptDirectly(request.script, request.tag);
    }
  }
  
  /**
   * Process the script directly without voice-over generation
   * This is used as a fallback when voice-over generation fails
   */
  private async processScriptDirectly(script: string, tag: string): Promise<ProcessedSection[]> {
    logger.info(PREFIXES.SCRIPT, 'Processing script directly (fallback method)');
    
    // Step 1: Parse script into sections
    const sections = sectionParser.parseScriptIntoSections(script);
    
    // Step 2: Extract points from each section
    const sectionsWithPoints = pointExtractor.extractPointsFromSections(sections);
    
    // Step 3: Find videos for each point
    const processedSections = await this.findVideosForSections(sectionsWithPoints, tag);
    
    logger.info(PREFIXES.SCRIPT, 'Direct script processing completed successfully');
    logger.info(PREFIXES.SCRIPT, `Processed ${processedSections.length} sections with videos`);
    
    return processedSections;
  }
  
  /**
   * Wait for a voice-over to complete
   * @param voiceOverId The ID of the voice-over to wait for
   * @param delayMs Delay between status checks in milliseconds
   * @returns The completed voice-over or null if it fails
   */
  private async waitForVoiceOverCompletion(voiceOverId: string, delayMs = 1000) {
    logger.info(PREFIXES.SCRIPT, `Waiting for voice-over ${voiceOverId} to complete`);
    
    let waitingTime = 0; // Track total waiting time for logging purposes
    
    while (true) { // Continue indefinitely until voice-over completes or fails
      // Get the current status of the voice-over
      const voiceOver = voiceService.getVoiceOver(voiceOverId);
      
      if (!voiceOver) {
        logger.warn(PREFIXES.SCRIPT, `Voice-over ${voiceOverId} not found`);
        return null;
      }
      
      if (voiceOver.status === 'completed' && voiceOver.audioUrl) {
        logger.info(PREFIXES.SCRIPT, `Voice-over ${voiceOverId} completed successfully after ${waitingTime / 1000} seconds`);
        return voiceOver;
      }
      
      if (voiceOver.status === 'failed') {
        logger.error(PREFIXES.SCRIPT, `Voice-over ${voiceOverId} failed: ${voiceOver.error || 'Unknown error'}`);
        return null;
      }
      
      // Wait before checking again
      waitingTime += delayMs;
      const waitingSeconds = Math.floor(waitingTime / 1000);
      logger.info(PREFIXES.SCRIPT, `Voice-over ${voiceOverId} still processing (waiting for ${waitingSeconds} seconds)`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
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
