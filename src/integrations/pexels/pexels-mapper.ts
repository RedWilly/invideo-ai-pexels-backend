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
  // Find HD quality video file, or fall back to SD if HD not available
  let directUrl = '';
  
  // Ensure video_files exists and is an array
  const videoFiles = pexelsVideo.video_files || [];
  
  // First try to find HD quality
  const hdFile = videoFiles.find(file => file.quality === 'hd');
  
  if (hdFile && hdFile.link) {
    directUrl = hdFile.link;
  } else {
    // Fall back to SD quality if HD not available
    const sdFile = videoFiles.find(file => file.quality === 'sd');
    
    // If neither HD nor SD, use the first available file
    if (sdFile && sdFile.link) {
      directUrl = sdFile.link;
    } else if (videoFiles.length > 0 && videoFiles[0] && videoFiles[0].link) {
      directUrl = videoFiles[0].link;
    }
  }
  
  return {
    id: pexelsVideo.id.toString(),
    url: pexelsVideo.url,
    directUrl: directUrl,
    width: pexelsVideo.width,
    height: pexelsVideo.height,
    duration: pexelsVideo.duration,
    image: pexelsVideo.image
  };
}
