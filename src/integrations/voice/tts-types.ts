/**
 * Types for TTS OpenAI API integration
 */

/**
 * Request payload for text-to-speech conversion
 */
export interface TTSRequest {
  model: string;
  voice_id: string;
  speed: number;
  input: string;
}

/**
 * Response from the TTS OpenAI API for initial request
 */
export interface TTSResponse {
  success: boolean;
  result: {
    uuid: string;
    voice_id: string;
    speed: number;
    model: string;
    tts_input: string;
    estimated_credit: number;
    used_credit: number;
    status: number;
    status_percentage: number;
    error_message: string;
    speaker_name: string;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Webhook payload received from TTS OpenAI
 */
export interface TTSWebhookPayload {
  event: 'TTS_TEXT_SUCCESS' | 'TTS_TEXT_FAILED';
  uuid: string;
  data: {
    uuid: string;
    media_url?: string;
    tts_input: string;
    voice_id: string;
    speed: number;
    status: number;
    model: string;
    used_credit: number;
    speaker_name: string;
    error_message: string;
    status_percentage: number;
    created_at: string;
    updated_at: string;
  };
}

/**
 * Internal representation of a voice-over
 */
export interface VoiceOver {
  id: string;
  text: string;
  audioUrl?: string;
  status: 'pending' | 'completed' | 'failed';
  voiceId: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}
