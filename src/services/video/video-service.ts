/**
 * Video service for searching and processing videos
 */
import { pexelsClient } from '../../integrations/pexels/pexels-client';
import type { VideoResult } from '../../types/video-types';
import { VIDEO_SEARCH } from '../../config/constants';
import { logger, PREFIXES } from '../../utils/logger';

/**
 * Service for video-related operations
 */
export class VideoService {
  // Cache to store videos by ID for quick retrieval
  private videoCache: Map<string, VideoResult> = new Map();
  
  /**
   * Find a video for a specific point using search API
   * @param point The text point to search for
   * @param tag The tag to append to the search
   * @returns A video result or null if not found
   */
  /**
   * Get a video by its ID from the cache
   * @param videoId The ID of the video to retrieve
   * @returns The video result or undefined if not found
   */
  getVideoById(videoId: string): VideoResult | undefined {
    return this.videoCache.get(videoId);
  }
  
  async findVideoForPoint(point: string, tag: string): Promise<VideoResult | null> {
    try {
      logger.info(PREFIXES.VIDEO, `Searching video for point: "${point.substring(0, 40)}..."`);
      
      // Create search query by combining point and tag
      // Limit to first few words to make search more effective
      const words = point.split(' ').slice(0, VIDEO_SEARCH.MAX_SEARCH_WORDS).join(' ');
      const query = `${words}, ${tag}`;
      
      // Search for videos
      const video = await pexelsClient.searchVideo(query, {
        per_page: VIDEO_SEARCH.DEFAULT_PER_PAGE,
        orientation: VIDEO_SEARCH.DEFAULT_ORIENTATION as 'landscape'
      });
      
      if (video) {
        logger.info(PREFIXES.VIDEO, `Found video ID: ${video.id} for point`);
        // Store the video in the cache for later retrieval
        this.videoCache.set(video.id, video);
        return video;
      } else {
        logger.warn(PREFIXES.VIDEO, `No video found for point: "${point.substring(0, 40)}..."`);
        return null;
      }
    } catch (error) {
      logger.error(
        PREFIXES.VIDEO, 
        `Error finding video for point: "${point.substring(0, 40)}..."`, 
        error
      );
      return null;
    }
  }
}

// Export a singleton instance
export const videoService = new VideoService();
