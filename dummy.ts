/**
 * Dummy server for testing the script processing API
 * This server will respond with the integrated response JSON when called with the same parameters as the /process-script endpoint
 */

// Import Node.js built-in modules
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';

// Port to run the server on
const PORT = 3001;

// Load the integrated response JSON
const responseData = JSON.parse(readFileSync(join(process.cwd(), 'integrated-response.json'), 'utf-8'));

// Create HTTP server
const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  // Log all incoming requests
  console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log(`Headers: ${JSON.stringify(req.headers, null, 2)}`);
  console.log(`Remote Address: ${req.socket.remoteAddress}:${req.socket.remotePort}`);
  
  // Set CORS headers to allow requests from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.statusCode = 204; // No content
    res.end();
    return;
  }
  
  // Only handle POST requests to /process-script
  if (req.method === 'POST' && req.url === '/process-script') {
    let body = '';
    
    // Collect request body data
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    
    // Process the request once all data is received
    req.on('end', () => {
      try {
        // Parse the request body
        const requestData = JSON.parse(body);
        
        // Log detailed request information
        console.log('\n===== REQUEST BODY DETAILS =====');
        console.log(`Script: ${requestData.script ? `${requestData.script.substring(0, 100)}... (${requestData.script.length} chars)` : 'No script provided'}`);
        console.log(`Tag: ${requestData.tag || 'No tag provided'}`);
        console.log(`Voice ID: ${requestData.voiceId || 'No voice ID provided'}`);
        console.log(`Generate Voice Over: ${requestData.generateVoiceOver || false}`);
        console.log(`Sync Audio: ${requestData.syncAudio || false}`);
        console.log('Additional parameters:', Object.keys(requestData)
          .filter(key => !['script', 'tag', 'voiceId', 'generateVoiceOver', 'syncAudio'].includes(key))
          .reduce<Record<string, any>>((obj, key) => {
            obj[key] = requestData[key as keyof typeof requestData];
            return obj;
          }, {}));
        console.log('==============================');
        
        // Add a small delay to simulate processing time (500-1500ms)
        const delay = Math.floor(Math.random() * 1000) + 500;
        // const delay = Math.floor(Math.random() * (1200000 - 900000 + 1)) + 900000;

        console.log(`Processing request (simulated delay: ${delay}ms)...`);
        
        setTimeout(() => {
          // Set response headers
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          
          // Send the integrated response JSON
          res.end(JSON.stringify(responseData));
          
          // Log response details
          console.log('\n===== RESPONSE DETAILS =====');
          console.log(`Status Code: ${res.statusCode}`);
          console.log(`Response Time: ${delay}ms`);
          console.log(`Sections: ${responseData.data.length}`);
          console.log(`Total Points: ${responseData.data.reduce((total: number, section: any) => total + (section.points?.length || 0), 0)}`);
          console.log('=============================');
          console.log('Response sent successfully');
        }, delay);
        
      } catch (error) {
        // Handle JSON parsing errors
        console.error('Error parsing request:', error);
        res.statusCode = 400;
        res.end(JSON.stringify({ 
          success: false, 
          error: 'Invalid request format' 
        }));
      }
    });
  } else {
    // Handle invalid routes
    res.statusCode = 404;
    res.end(JSON.stringify({ 
      success: false, 
      error: 'Not found' 
    }));
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`Dummy server running at http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log(`- POST http://localhost:${PORT}/process-script`);
  console.log('Expected request format:');
  console.log(JSON.stringify({
    script: 'Your script content here...',
    tag: 'history',
    voiceId: 'OA004',
    generateVoiceOver: true,
    syncAudio: true
  }, null, 2));
});
