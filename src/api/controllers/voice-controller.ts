/**
 * Controller for voice-over generation and webhook handling
 */
import { Elysia, t } from 'elysia';
import { voiceService } from '../../services/voice/voice-service';
import { ttsClient } from '../../integrations/voice/tts-client';
import { logger, PREFIXES } from '../../utils/logger';

/**
 * Controller for voice-over related endpoints
 */
export class VoiceController {
  /**
   * Generate a voice-over for a text
   * @param text The text to convert to speech
   * @param voiceId The voice ID to use
   * @param speed The speed of the speech
   * @returns The generated voice-over
   */
  async generateVoiceOver(text: string, voiceId: string, speed: number) {
    logger.info(PREFIXES.API, `Received voice-over generation request for voice: ${voiceId}`);
    
    try {
      const voiceOver = await voiceService.generateVoiceOver(text, voiceId, speed);
      
      return {
        success: true,
        data: {
          id: voiceOver.id,
          text: voiceOver.text,
          status: voiceOver.status,
          voiceId: voiceOver.voiceId,
          createdAt: voiceOver.createdAt
        }
      };
    } catch (error) {
      logger.error(PREFIXES.ERROR, 'Error in voice-over generation controller', error);
      throw error;
    }
  }

  /**
   * Handle the webhook callback from TTS OpenAI
   * @param body The webhook payload
   * @param headers The request headers
   * @returns The result of processing the webhook
   */
  handleWebhook(body: any, headers: any) {
    logger.info(PREFIXES.API, 'Received TTS webhook callback');
    
    try {
      // Get the signature from the headers
      const signature = headers['x-signature'];
      
      if (!signature) {
        logger.warn(PREFIXES.API, 'Missing signature in webhook request');
        throw new Error('Missing signature');
      }
      
      // Verify the signature
      const isValid = ttsClient.verifyWebhookSignature(
        JSON.stringify(body),
        signature
      );
      
      if (!isValid) {
        logger.warn(PREFIXES.API, 'Invalid signature in webhook request');
        throw new Error('Invalid signature');
      }
      
      // Process the webhook payload
      const result = ttsClient.processWebhookPayload(body);
      
      // Update the voice-over status
      const updatedVoiceOver = voiceService.updateVoiceOverStatus(
        result.uuid,
        result.success,
        result.audioUrl,
        result.error
      );
      
      if (!updatedVoiceOver) {
        logger.warn(PREFIXES.API, `Voice-over with ID ${result.uuid} not found`);
        return {
          success: false,
          error: `Voice-over with ID ${result.uuid} not found`
        };
      }
      
      return {
        success: true,
        data: {
          id: updatedVoiceOver.id,
          status: updatedVoiceOver.status,
          audioUrl: updatedVoiceOver.audioUrl
        }
      };
    } catch (error) {
      logger.error(PREFIXES.ERROR, 'Error processing webhook', error);
      throw error;
    }
  }

  /**
   * Get a voice-over by ID
   * @param id The ID of the voice-over
   * @returns The voice-over
   */
  getVoiceOver(id: string) {
    logger.info(PREFIXES.API, `Retrieving voice-over with ID: ${id}`);
    
    const voiceOver = voiceService.getVoiceOver(id);
    
    if (!voiceOver) {
      logger.warn(PREFIXES.API, `Voice-over with ID ${id} not found`);
      throw new Error(`Voice-over with ID ${id} not found`);
    }
    
    return {
      success: true,
      data: voiceOver
    };
  }
}

// Export a singleton instance
export const voiceController = new VoiceController();
