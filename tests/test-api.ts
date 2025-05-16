/**
 * Test script for the API
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import type { ScriptProcessingResponse, ProcessedSection, PointWithVideo } from '../src/types/script-types';

// Configuration
const API_URL = 'http://localhost:3000/process-script';
const SCRIPT_PATH = './tests/fixtures/test-script.txt';
const TAG = 'history';

/**
 * Test the script processing API
 */
async function testScriptProcessingAPI() {
  try {
    // Read the test script file
    console.log(`Reading script from ${SCRIPT_PATH}...`);
    const script = await fs.readFile(path.resolve(SCRIPT_PATH), 'utf-8');
    
    // Prepare the request payload
    const payload = {
      script,
      tag: TAG
    };
    
    console.log(`Sending request to API with tag: "${TAG}"...`);
    
    // Make the API request
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    // Process the response
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }
    
    const result = await response.json() as ScriptProcessingResponse;
    
    // Display the results
    console.log('\n=== API RESPONSE SUMMARY ===');
    console.log(`Success: ${result.success}`);
    
    if (result.success && result.data) {
      console.log(`Total sections: ${result.data.length}`);
      
      // Print detailed information for each section
      result.data.forEach((section: ProcessedSection, index: number) => {
        console.log(`\n--- SECTION ${index + 1} ---`);
        console.log(`Points: ${section.points.length}`);
        
        section.points.forEach((point: PointWithVideo, pointIndex: number) => {
          console.log(`\nPoint ${pointIndex + 1}: ${point.text.substring(0, 60)}${point.text.length > 60 ? '...' : ''}`);
          console.log(`Video ID: ${point.videoId}`);
          console.log(`Video URL: ${point.videoUrl}`);
          console.log(`Thumbnail: ${point.videoThumbnail}`);
        });
      });
      
      // Save the full response to a file for reference
      const outputPath = './tests/api-response.json';
      await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
      console.log(`\nFull response saved to ${outputPath}`);
    } else if (result.error) {
      console.error(`Error: ${result.error}`);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
console.log('=== SCRIPT PROCESSING API TEST ===');
testScriptProcessingAPI().then(() => {
  console.log('\nTest completed.');
});
