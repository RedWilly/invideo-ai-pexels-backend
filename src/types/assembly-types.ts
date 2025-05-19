/**
 * Types for AssemblyAI integration
 */

/**
 * Word-level details from transcription
 */
export interface TranscriptWord {
  text: string;
  start: number; // Start time in milliseconds
  end: number;   // End time in milliseconds
  confidence: number;
}

/**
 * Complete transcript response
 */
export interface TranscriptResponse {
  id: string;
  status: string;
  text: string;
  words?: TranscriptWord[];
  audio_url: string;
  error?: string;
}

/**
 * Parameters for transcription request
 */
export interface TranscriptionParams {
  audio: string; // URL or base64 encoded audio
  word_boost?: string[];
  boost_param?: string;
  language_code?: string;
  punctuate?: boolean;
  format_text?: boolean;
  dual_channel?: boolean;
  webhook_url?: string;
  webhook_auth_header_name?: string;
  webhook_auth_header_value?: string;
}

/**
 * Timing information for a text segment
 */
export interface TextTiming {
  text: string;
  startTime: number; // Start time in milliseconds
  endTime: number;   // End time in milliseconds
  duration: number;  // Duration in milliseconds
}

/**
 * Point with timing information
 */
export interface PointWithTiming {
  text: string;
  videoId: string;
  videoUrl?: string;  // Making this optional so we can exclude it from the API response
  videoThumbnail: string;
  startTime: number;
  endTime: number;
  duration: number;
}
