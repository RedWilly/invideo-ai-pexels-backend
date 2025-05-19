/**
 * Types related to script processing
 */

/**
 * Represents a section of a script
 */
export interface Section {
  id: string;
  text: string;
  points: string[];
}

/**
 * Represents a point in a section with its corresponding video
 */
export interface PointWithVideo {
  text: string;
  videoId: string;
  videoUrl?: string;  // Making this optional so we can exclude it from the API response
  videoThumbnail: string;
  startTime?: number;  // Start time of this point in the audio (in milliseconds)
  endTime?: number;    // End time of this point in the audio (in milliseconds)
}

/**
 * Represents a processed section with points and videos
 */
export interface ProcessedSection {
  sectionId: string;
  voiceOverId?: string;  // ID of the voice-over for this section
  audioUrl?: string;     // URL to the voice-over audio for this section
  sectionOffset?: number; // Offset time for this section (in milliseconds)
  sectionEndTime?: number; // End time of this section including buffer (in milliseconds)
  points: PointWithVideo[];
}

/**
 * Request payload for script processing
 */
export interface ScriptProcessingRequest {
  script: string;
  tag: string;
  generateVoiceOver?: boolean;  // Whether to generate voice-overs for sections
  voiceId?: string;  // Voice ID to use for voice-overs
  syncAudio?: boolean;  // Whether to synchronize voice-overs with points
}

/**
 * Response for script processing
 */
export interface ScriptProcessingResponse {
  success: boolean;
  data?: ProcessedSection[];
  error?: string;
}
