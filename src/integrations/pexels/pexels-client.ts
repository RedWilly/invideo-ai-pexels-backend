/**
 * Pexels API client for video search
 */
import { createClient } from 'pexels';
import { env } from '../../config/env';
import { VIDEO_SEARCH } from '../../config/constants';
import { logger, PREFIXES } from '../../utils/logger';
import type { 
  PexelsResponse, 
  PexelsSearchOptions
} from './pexels-types';
import type { VideoResult } from '../../types/video-types';
import { pexelsVideoToVideoResult } from './pexels-mapper';

class PexelsClient {
  private client: any;

  constructor(apiKey: string) {
    this.client = createClient(apiKey);
  }

  /**
   * Search for videos using the Pexels API
   * @param query Search query
   * @param options Search options
   * @returns Video result or null if not found
   */
  async searchVideo(
    query: string, 
    options: Omit<PexelsSearchOptions, 'query'> = {}
  ): Promise<VideoResult | null> {
    try {
      logger.info(PREFIXES.API, `Pexels: Searching for: "${query}"`);
      
      // Create search parameters compatible with Pexels client
      const searchParams = {
        query,
        per_page: options.per_page || VIDEO_SEARCH.DEFAULT_PER_PAGE,
        orientation: options.orientation || VIDEO_SEARCH.DEFAULT_ORIENTATION as 'landscape'
      };

      const response = await this.client.videos.search(searchParams) as PexelsResponse;
      
      // Check if response is a Videos response (not an ErrorResponse)
      if ('videos' in response && response.videos.length > 0) {
        const video = response.videos[0];
        
        if (video) {
          logger.info(PREFIXES.API, `Pexels: Found video: ID ${video.id}`, {
            duration: video.duration,
            size: `${video.width}x${video.height}`
          });
          
          return pexelsVideoToVideoResult(video);
        }
      } else {
        logger.info(PREFIXES.API, `Pexels: No videos found for query: "${query}"`);
      }
      
      return null;
    } catch (error) {
      logger.error(PREFIXES.ERROR, `Pexels: Error searching for query: "${query}"`, error);
      return null;
    }
  }
}

// Create and export a singleton instance
export const pexelsClient = new PexelsClient(env.PEXELS_API_KEY);
