/**
 * TTS OpenAI API client for voice generation
 */
import axios from 'axios';
import { createHash, createVerify } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { env } from '../../config/env';
import { logger, PREFIXES } from '../../utils/logger';
import type { TTSRequest, TTSResponse, TTSWebhookPayload } from './tts-types';

/**
 * Client for interacting with the TTS OpenAI API
 */
export class TTSClient {
  private readonly apiUrl = 'https://api.ttsopenai.com/uapi/v1/text-to-speech';
  private readonly apiKey: string;
  private readonly publicKeyPath: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    // Path to the public key file for signature verification
    this.publicKeyPath = path.join(process.cwd(), 'src', '123', 'uapi_public_key.pem');
  }

  /**
   * Generate speech from text
   * @param text The text to convert to speech
   * @param voiceId The voice ID to use
   * @param speed The speed of the speech (default: 1)
   * @returns The response from the TTS OpenAI API
   */
  async generateSpeech(text: string, voiceId: string, speed = 1): Promise<TTSResponse> {
    try {
      logger.info(PREFIXES.API, `TTS: Generating speech for text (${text.length} chars) with voice ${voiceId}`);
      
      const requestData: TTSRequest = {
        model: 'tts-1',
        voice_id: voiceId,
        speed,
        input: text
      };
      
      const response = await axios.post(this.apiUrl, requestData, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey
        }
      });
      
      const data = response.data as TTSResponse;
      
      if (data.success) {
        logger.info(PREFIXES.API, `TTS: Successfully submitted speech generation request. UUID: ${data.result.uuid}`);
      } else {
        logger.error(PREFIXES.ERROR, `TTS: Failed to generate speech: ${data.result?.error_message || 'Unknown error'}`);
      }
      
      return data;
    } catch (error) {
      logger.error(PREFIXES.ERROR, 'TTS: Error generating speech', error);
      throw new Error(`Failed to generate speech: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Verify the signature of a webhook request
   * @param data The request body as a string
   * @param signature The signature from the x-signature header
   * @returns Whether the signature is valid
   */
  verifyWebhookSignature(data: string, signature: string): boolean {
    try {
      // Load the public key
      const publicKey = readFileSync(this.publicKeyPath, 'utf8');

      // Create MD5 hash of the data
      const eventDataHash = createHash('md5').update(data).digest('hex');

      // Verify the signature
      const verifier = createVerify('RSA-SHA256');
      verifier.update(eventDataHash);
      return verifier.verify(publicKey, Buffer.from(signature, 'hex'));
    } catch (error) {
      logger.error(PREFIXES.ERROR, 'TTS: Error verifying webhook signature', error);
      return false;
    }
  }

  /**
   * Process a webhook payload from TTS OpenAI
   * @param payload The webhook payload
   * @returns The processed webhook data
   */
  processWebhookPayload(payload: TTSWebhookPayload): {
    uuid: string;
    success: boolean;
    audioUrl?: string;
    error?: string;
  } {
    const { event, uuid, data } = payload;
    
    logger.info(PREFIXES.API, `TTS: Received webhook event ${event} for UUID ${uuid}`);
    
    const success = event === 'TTS_TEXT_SUCCESS';
    
    if (success) {
      logger.info(PREFIXES.API, `TTS: Speech generation successful. Audio URL: ${data.media_url}`);
      return {
        uuid,
        success: true,
        audioUrl: data.media_url
      };
    } else {
      logger.error(PREFIXES.ERROR, `TTS: Speech generation failed: ${data.error_message}`);
      return {
        uuid,
        success: false,
        error: data.error_message
      };
    }
  }
}

// Create and export a singleton instance
export const ttsClient = new TTSClient(env.OPENAITTS_API_KEY);
