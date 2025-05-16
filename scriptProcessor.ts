import { createClient } from 'pexels';
import { splitSection } from './ts';

// Interface definitions
interface VideoResult {
  id: string;
  url: string;
  width: number;
  height: number;
  duration: number;
  image: string;
}

interface SectionResult {
  sectionId: string;
  points: PointResult[];
}

interface PointResult {
  text: string;
  videoId: string;
  videoUrl: string;
  videoThumbnail: string;
}

// Initialize Pexels client - you'll need to replace with your API key
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || '';
const pexelsClient = createClient(PEXELS_API_KEY);

/**
 * Process a script by splitting it into sections and finding videos for each point
 * @param script The full script text
 * @param tag The tag to append to search queries
 * @returns An array of sections with their points and corresponding videos
 */
export async function processScript(script: string, tag: string): Promise<SectionResult[]> {
  // Split script into sections (paragraphs)
  const sections = script
    .split(/\n\s*\n+/)
    .map(s => s.trim())
    .filter(Boolean);

  console.log(`\n📋 Script split into ${sections.length} sections`);

  const results: SectionResult[] = [];

  // Process each section
  for (let i = 0; i < sections.length; i++) {
    const sectionId = `section${i + 1}`;
    const sectionText = sections[i];
    
    console.log(`\n📝 Processing ${sectionId}:`);
    console.log(`Section length: ${sectionText?.length || 0} characters`);
    
    // Split section into points
    const points = splitSection(sectionText || '');
    console.log(`Split into ${points.length} points:`);
    points.forEach((point, idx) => {
      console.log(`  ${idx + 1}. ${point.substring(0, 60)}${point.length > 60 ? '...' : ''}`);
    });
    
    const pointResults: PointResult[] = [];
    
    // Find videos for each point
    for (let j = 0; j < points.length; j++) {
      const point = points[j];
      console.log(`\n🎥 Searching video for point ${j + 1}...`);
      
      // Ensure point is a string
      const video = await findVideoForPoint(point || '', tag);
      
      if (video) {
        console.log(`  ✓ Found video: ID ${video.id}`);
        console.log(`    Duration: ${video.duration}s, Size: ${video.width}x${video.height}`);
      } else {
        console.log(`  ✗ No video found for this point`);
      }
      
      pointResults.push({
        text: point || '',
        videoId: video?.id || '',
        videoUrl: video?.url || '',
        videoThumbnail: video?.image || ''
      });
    }
    
    results.push({
      sectionId,
      points: pointResults
    });
  }
  
  return results;
}

/**
 * Find a video for a specific point using Pexels API
 * @param point The text point to search for
 * @param tag The tag to append to the search
 * @returns A video result or null if not found
 */
async function findVideoForPoint(point: string, tag: string): Promise<VideoResult | null> {
  try {
    // Create search query by combining point and tag
    // Limit to first few words to make search more effective
    const words = point.split(' ').slice(0, 5).join(' ');
    const query = `${words}, ${tag}`;
    
    // Search for videos
    const response = await pexelsClient.videos.search({ 
      query, 
      per_page: 1,
      orientation: 'landscape'
    });
    
    // Check if response is a Videos response (not an ErrorResponse)
    if ('videos' in response && response.videos.length > 0) {
      const video = response.videos[0];
      // Make sure video is defined
      if (video) {
        return {
          id: video.id.toString(),
          url: video.url,
          width: video.width,
          height: video.height,
          duration: video.duration,
          image: video.image
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error finding video for point: ${point}`, error);
    return null;
  }
}
