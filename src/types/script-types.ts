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
  videoUrl: string;
  videoThumbnail: string;
}

/**
 * Represents a processed section with points and videos
 */
export interface ProcessedSection {
  sectionId: string;
  points: PointWithVideo[];
}

/**
 * Request payload for script processing
 */
export interface ScriptProcessingRequest {
  script: string;
  tag: string;
}

/**
 * Response for script processing
 */
export interface ScriptProcessingResponse {
  success: boolean;
  data?: ProcessedSection[];
  error?: string;
}
