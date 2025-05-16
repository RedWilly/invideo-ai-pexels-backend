/**
 * Maps Pexels API response objects to internal types
 */
import type { PexelsVideo } from './pexels-types';
import type { VideoResult } from '../../types/video-types';

/**
 * Convert a Pexels video object to our internal VideoResult type
 * @param pexelsVideo The Pexels video object
 * @returns Mapped VideoResult object
 */
export function pexelsVideoToVideoResult(pexelsVideo: PexelsVideo): VideoResult {
  return {
    id: pexelsVideo.id.toString(),
    url: pexelsVideo.url,
    width: pexelsVideo.width,
    height: pexelsVideo.height,
    duration: pexelsVideo.duration,
    image: pexelsVideo.image
  };
}
