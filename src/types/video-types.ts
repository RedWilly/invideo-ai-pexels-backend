/**
 * Types related to video search and processing
 */

/**
 * Represents a video result from search
 */
export interface VideoResult {
  id: string;
  url: string;
  width: number;
  height: number;
  duration: number;
  image: string;
}

/**
 * Video search options
 */
export interface VideoSearchOptions {
  query: string;
  perPage?: number;
  orientation?: 'landscape' | 'portrait' | 'square';
}

/**
 * Video search response
 */
export interface VideoSearchResponse {
  success: boolean;
  video?: VideoResult;
  error?: string;
}
