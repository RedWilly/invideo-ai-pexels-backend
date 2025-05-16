/**
 * Voice service for generating and managing voice-overs
 */
import { ttsClient } from '../../integrations/voice/tts-client';
import type { VoiceOver } from '../../integrations/voice/tts-types';
import { logger, PREFIXES } from '../../utils/logger';

/**
 * Service for voice-over generation and management
 */
export class VoiceService {
  // In-memory storage for voice-overs (in a production app, this would be a database)
  private voiceOvers: Map<string, VoiceOver> = new Map();

  /**
   * Generate a voice-over for a text
   * @param text The text to convert to speech
   * @param voiceId The voice ID to use
   * @param speed The speed of the speech (default: 1)
   * @returns The generated voice-over
   */
  async generateVoiceOver(text: string, voiceId: string, speed = 1): Promise<VoiceOver> {
    try {
      logger.info(PREFIXES.SCRIPT, `Generating voice-over for text (${text.length} chars)`);
      
      // Call the TTS OpenAI API
      const response = await ttsClient.generateSpeech(text, voiceId, speed);
      
      if (!response.success) {
        throw new Error(`Failed to generate voice-over: ${response.result.error_message || 'Unknown error'}`);
      }
      
      // Create a voice-over object
      const voiceOver: VoiceOver = {
        id: response.result.uuid,
        text,
        voiceId,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Store the voice-over
      this.voiceOvers.set(voiceOver.id, voiceOver);
      
      logger.info(PREFIXES.SCRIPT, `Voice-over generation initiated. ID: ${voiceOver.id}`);
      
      return voiceOver;
    } catch (error) {
      logger.error(PREFIXES.ERROR, 'Error generating voice-over', error);
      throw error;
    }
  }

  /**
   * Update a voice-over with the result from the webhook
   * @param uuid The UUID of the voice-over
   * @param success Whether the generation was successful
   * @param audioUrl The URL of the generated audio (if successful)
   * @param error The error message (if failed)
   * @returns The updated voice-over
   */
  updateVoiceOverStatus(
    uuid: string, 
    success: boolean, 
    audioUrl?: string, 
    error?: string
  ): VoiceOver | null {
    const voiceOver = this.voiceOvers.get(uuid);
    
    if (!voiceOver) {
      logger.warn(PREFIXES.SCRIPT, `Voice-over with ID ${uuid} not found`);
      return null;
    }
    
    // Update the voice-over
    const updatedVoiceOver: VoiceOver = {
      ...voiceOver,
      status: success ? 'completed' : 'failed',
      audioUrl: success ? audioUrl : undefined,
      error: success ? undefined : error,
      updatedAt: new Date()
    };
    
    // Store the updated voice-over
    this.voiceOvers.set(uuid, updatedVoiceOver);
    
    logger.info(
      PREFIXES.SCRIPT, 
      `Voice-over ${uuid} status updated to ${updatedVoiceOver.status}`
    );
    
    return updatedVoiceOver;
  }

  /**
   * Get a voice-over by ID
   * @param id The ID of the voice-over
   * @returns The voice-over or null if not found
   */
  getVoiceOver(id: string): VoiceOver | null {
    return this.voiceOvers.get(id) || null;
  }

  /**
   * Get all voice-overs
   * @returns All voice-overs
   */
  getAllVoiceOvers(): VoiceOver[] {
    return Array.from(this.voiceOvers.values());
  }

  /**
   * Generate voice-overs for multiple texts
   * @param texts The texts to convert to speech
   * @param voiceId The voice ID to use
   * @param speed The speed of the speech (default: 1)
   * @returns The generated voice-overs
   */
  async generateMultipleVoiceOvers(
    texts: string[], 
    voiceId: string, 
    speed = 1
  ): Promise<VoiceOver[]> {
    logger.info(PREFIXES.SCRIPT, `Generating ${texts.length} voice-overs`);
    
    const voiceOvers: VoiceOver[] = [];
    
    // Process each text sequentially to avoid overwhelming the API
    for (const text of texts) {
      try {
        const voiceOver = await this.generateVoiceOver(text, voiceId, speed);
        voiceOvers.push(voiceOver);
      } catch (error) {
        logger.error(PREFIXES.ERROR, `Failed to generate voice-over for text: ${text.substring(0, 50)}...`, error);
        // Continue with the next text even if one fails
      }
    }
    
    return voiceOvers;
  }
}

// Export a singleton instance
export const voiceService = new VoiceService();
