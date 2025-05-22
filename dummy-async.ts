/**
 * Dummy server for testing the asynchronous script processing API with WebSocket support
 * This server simulates:
 * 1. The /process-script endpoint that returns a job ID immediately
 * 2. A WebSocket server for real-time job updates
 * 3. A /jobs/:jobId endpoint to check job status
 */

// Import Node.js built-in modules
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { readFileSync } from 'fs';
import { join } from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { parse as parseUrl } from 'url';
import { v4 as uuidv4 } from 'uuid';

// Port to run the server on
const PORT = 3001;

// Load the integrated response JSON
const responseData = JSON.parse(readFileSync(join(process.cwd(), 'integrated-response.json'), 'utf-8'));

// Enum for job status
enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Job type
interface Job {
  id: string;
  status: JobStatus;
  progress: number;
  message: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  result?: any;
  request: any;
}

// Store for active jobs
const jobs = new Map<string, Job>();

// Store for WebSocket connections
const connections = new Map<string, Set<WebSocket>>();

/**
 * Create a new job
 */
function createJob(request: any): string {
  const jobId = uuidv4();
  
  const job: Job = {
    id: jobId,
    status: JobStatus.PENDING,
    progress: 0,
    message: 'Job created',
    createdAt: new Date(),
    updatedAt: new Date(),
    request
  };
  
  jobs.set(jobId, job);
  console.log(`Created job ${jobId}`);
  
  // Start processing the job in the background
  processJobInBackground(jobId);
  
  return jobId;
}

/**
 * Process a job in the background
 */
function processJobInBackground(jobId: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  
  // Update job status to processing
  updateJobStatus(jobId, JobStatus.PROCESSING, 'Processing started', 10);
  
  // Simulate processing steps with delays
  simulateProcessingSteps(jobId);
}

/**
 * Update a job's status and notify subscribers
 */
function updateJobStatus(jobId: string, status: JobStatus, message: string, progress: number): void {
  const job = jobs.get(jobId);
  if (!job) return;
  
  job.status = status;
  job.message = message;
  job.progress = progress;
  job.updatedAt = new Date();
  
  if (status === JobStatus.COMPLETED || status === JobStatus.FAILED) {
    job.completedAt = new Date();
  }
  
  console.log(`Updated job ${jobId}: ${status} - ${progress}% - ${message}`);
  
  // Notify all subscribers
  notifyJobSubscribers(jobId);
}

/**
 * Complete a job with results
 */
function completeJob(jobId: string, result: any): void {
  const job = jobs.get(jobId);
  if (!job) return;
  
  job.status = JobStatus.COMPLETED;
  job.progress = 100;
  job.message = 'Processing completed successfully';
  job.result = result;
  job.updatedAt = new Date();
  job.completedAt = new Date();
  
  console.log(`Completed job ${jobId}`);
  
  // Notify all subscribers
  notifyJobSubscribers(jobId);
}

/**
 * Fail a job with an error message
 */
function failJob(jobId: string, errorMessage: string): void {
  const job = jobs.get(jobId);
  if (!job) return;
  
  job.status = JobStatus.FAILED;
  job.message = errorMessage;
  job.updatedAt = new Date();
  job.completedAt = new Date();
  
  console.log(`Failed job ${jobId}: ${errorMessage}`);
  
  // Notify all subscribers
  notifyJobSubscribers(jobId);
}

/**
 * Notify all subscribers of a job update
 */
function notifyJobSubscribers(jobId: string): void {
  const subscribers = connections.get(jobId);
  if (!subscribers || subscribers.size === 0) return;
  
  const job = jobs.get(jobId);
  if (!job) return;
  
  const update = {
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    message: job.message,
    updatedAt: job.updatedAt,
    // Only include result if job is completed
    result: job.status === JobStatus.COMPLETED ? job.result : undefined
  };
  
  console.log(`Notifying ${subscribers.size} subscribers of job ${jobId} update`);
  
  for (const ws of subscribers) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(update));
    }
  }
}

/**
 * Simulate processing steps with delays
 */
function simulateProcessingSteps(jobId: string): void {
  const steps = [
    { delay: 2000, status: JobStatus.PROCESSING, message: 'Parsing script into sections', progress: 20 },
    { delay: 2000, status: JobStatus.PROCESSING, message: 'Extracting points from sections', progress: 40 },
    { delay: 5000, status: JobStatus.PROCESSING, message: 'Finding videos for points', progress: 60 },
    { delay: 6000, status: JobStatus.PROCESSING, message: 'Generating voice-overs', progress: 80 },
    { delay: 8000, status: JobStatus.PROCESSING, message: 'Finalizing results', progress: 90 }
  ];
  
  let totalDelay = 0;
  
  // Schedule each step
  steps.forEach((step, index) => {
    totalDelay += step.delay;
    
    setTimeout(() => {
      updateJobStatus(jobId, step.status, step.message, step.progress);
    }, totalDelay);
  });
  
  // Schedule completion
  setTimeout(() => {
    completeJob(jobId, responseData);
  }, totalDelay + 1000);
}

// Create HTTP server
const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  // Log all incoming requests
  console.log(`\n[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // Set CORS headers to allow requests from any origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.statusCode = 204; // No content
    res.end();
    return;
  }
  
  // Parse URL and query parameters
  const parsedUrl = parseUrl(req.url || '', true);
  const path = parsedUrl.pathname || '';
  
  // Handle POST requests to /process-script
  if (req.method === 'POST' && path === '/process-script') {
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
        console.log('==============================');
        
        // Create a new job for this request
        const jobId = createJob(requestData);
        
        // Set response headers
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 201; // Created
        
        // Send the job ID immediately
        res.end(JSON.stringify({ jobId }));
        
        // Log response details
        console.log('\n===== RESPONSE DETAILS =====');
        console.log(`Status Code: ${res.statusCode}`);
        console.log(`Job ID: ${jobId}`);
        console.log('=============================');
        console.log('Response sent successfully');
        
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
  } 
  // Handle GET requests to /jobs/:jobId
  else if (req.method === 'GET' && path.startsWith('/jobs/')) {
    const jobId = path.split('/')[2];
    
    if (!jobId) {
      res.statusCode = 400;
      res.end(JSON.stringify({ 
        success: false, 
        error: 'Job ID is required' 
      }));
      return;
    }
    
    const job = jobs.get(jobId);
    
    if (!job) {
      res.statusCode = 404;
      res.end(JSON.stringify({ 
        success: false, 
        error: `Job ${jobId} not found` 
      }));
      return;
    }
    
    // Set response headers
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    
    // Send the job status
    res.end(JSON.stringify({
      success: true,
      data: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        message: job.message,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        completedAt: job.completedAt,
        // Only include result if job is completed
        result: job.status === JobStatus.COMPLETED ? job.result : undefined
      }
    }));
  } 
  else {
    // Handle invalid routes
    res.statusCode = 404;
    res.end(JSON.stringify({ 
      success: false, 
      error: 'Not found' 
    }));
  }
});

// Create WebSocket server using the same HTTP server
const wsServer = new WebSocketServer({ server });

// WebSocket server connection handler
wsServer.on('connection', (ws: WebSocket, req: IncomingMessage) => {
  const url = req.url || '';
  const parts = url.split('/').filter(part => part.length > 0);
  const jobId = parts.length > 1 ? parts[parts.length - 2] : '';
  
  console.log(`WebSocket connection opened for job ${jobId}`);
  
  // Add this connection to the subscribers for this job
  if (jobId) {
    if (!connections.has(jobId)) {
      connections.set(jobId, new Set());
    }
    
    connections.get(jobId)?.add(ws);
    
    // Send initial job state
    const job = jobs.get(jobId);
    if (job) {
      const update = {
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        message: job.message,
        updatedAt: job.updatedAt,
        result: job.status === JobStatus.COMPLETED ? job.result : undefined
      };
      
      ws.send(JSON.stringify(update));
    }
  }
  
  // Handle WebSocket messages
  ws.on('message', (message: WebSocket.Data) => {
    try {
      const parsedMessage = JSON.parse(message.toString());
      
      // Handle unsubscribe command
      if (parsedMessage.command === 'unsubscribe' && jobId) {
        const subscribers = connections.get(jobId);
        if (subscribers) {
          subscribers.delete(ws);
          console.log(`WebSocket unsubscribed from job ${jobId}`);
        }
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  });
  
  // Handle WebSocket close
  ws.on('close', () => {
    console.log(`WebSocket connection closed for job ${jobId}`);
    
    // Remove this connection from all job subscribers
    if (jobId) {
      const subscribers = connections.get(jobId);
      if (subscribers) {
        subscribers.delete(ws);
        
        if (subscribers.size === 0) {
          connections.delete(jobId);
        }
      }
    }
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Dummy server running at http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log(`- POST http://localhost:${PORT}/process-script`);
  console.log(`- GET http://localhost:${PORT}/jobs/:jobId`);
  console.log(`- WebSocket ws://localhost:${PORT}/jobs/:jobId/updates`);
});

console.log('\nExample client usage:');
console.log(`
// Step 1: Submit a script processing request
fetch('http://localhost:${PORT}/process-script', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    script: 'Your script content here...',
    tag: 'history'
  })
})
.then(response => response.json())
.then(data => {
  const jobId = data.jobId;
  console.log('Job created:', jobId);
  
  // Step 2: Connect to WebSocket for real-time updates
  const ws = new WebSocket('ws://localhost:${PORT}/jobs/' + jobId + '/updates');
  
  ws.onopen = () => {
    console.log('WebSocket connection opened');
  };
  
  ws.onmessage = (event) => {
    const update = JSON.parse(event.data);
    console.log('Job update:', update);
    
    // If job is completed, close the WebSocket
    if (update.status === 'completed' || update.status === 'failed') {
      ws.close();
    }
  };
});
`);
