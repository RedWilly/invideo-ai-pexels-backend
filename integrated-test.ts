/**
 * Test script for the integrated script processing workflow
 * - Script processing
 * - Video search
 * - Voice generation
 * - Audio synchronization
 */
import fs from 'fs';
import path from 'path';

// Function to read a file
function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

// Import types
import type { ScriptProcessingResponse, ProcessedSection, PointWithVideo } from './src/types/script-types';

// Function to make a POST request
async function postRequest(url: string, data: any): Promise<ScriptProcessingResponse> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  return await response.json() as ScriptProcessingResponse;
}

// Main function
async function main() {
  try {
    console.log('Starting integrated script processing test...');
    
    // Read the test script
    const scriptPath = path.join(process.cwd(), 'test-script.txt');
    const script = readFile(scriptPath);
    
    console.log(`Read script (${script.length} characters)`);
    
    // Process the script with voice generation and synchronization
    const apiUrl = 'http://localhost:3000/process-script';
    const requestData = {
      script,
      tag: 'history',
      generateVoiceOver: true,
      voiceId: 'OA004', // Use a valid voice ID from your TTS service
      syncAudio: true
    };
    
    console.log('Sending request to process script with voice generation and synchronization...');
    console.log(`API URL: ${apiUrl}`);
    console.log(`Tag: ${requestData.tag}`);
    console.log(`Voice ID: ${requestData.voiceId}`);
    
    const result = await postRequest(apiUrl, requestData);
    
    // Save the result to a file
    const outputPath = path.join(process.cwd(), 'integrated-response.json');
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
    
    console.log('\nAPI Response Summary:');
    console.log(`Success: ${result.success}`);
    
    if (result.success && result.data) {
      console.log(`Total sections: ${result.data.length}`);
      
      // Count total points and videos
      let totalPoints = 0;
      let totalVideos = 0;
      let sectionsWithAudio = 0;
      
      for (const section of result.data) {
        totalPoints += section.points.length;
        totalVideos += section.points.filter((p: PointWithVideo) => p.videoId).length;
        
        if (section.audioUrl) {
          sectionsWithAudio++;
        }
      }
      
      console.log(`Total points: ${totalPoints}`);
      console.log(`Total videos found: ${totalVideos}/${totalPoints}`);
      console.log(`Sections with audio: ${sectionsWithAudio}/${result.data.length}`);
      
      // Display the first section as an example
      if (result.data.length > 0) {
        const firstSection = result.data[0];
        if (firstSection) {
          console.log('\nExample Section:');
          console.log(`Section ID: ${firstSection.sectionId}`);
          console.log(`Points: ${firstSection.points.length}`);
          
          if (firstSection.audioUrl) {
            console.log(`Audio URL: ${firstSection.audioUrl}`);
          }
          
          // Display the first point
          if (firstSection.points.length > 0) {
            const firstPoint = firstSection.points[0];
            if (firstPoint) {
              console.log('\nExample Point:');
              console.log(`Text: ${firstPoint.text}`);
              console.log(`Video ID: ${firstPoint.videoId}`);
              console.log(`Video URL: ${firstPoint.videoUrl}`);
              console.log(`Video Thumbnail: ${firstPoint.videoThumbnail}`);
            }
          }
        }
      }
    } else if (result.error) {
      console.error(`Error: ${result.error}`);
    }
    
    console.log(`\nFull response saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('Error running test:', error);
  }
}

// Run the main function
main();
