# Script2Video API Documentation

## Overview

This API processes scripts, extracts meaningful sections and points, and finds relevant videos for each point using the Pexels API. It supports optional voice-over generation and synchronization with the video content. The system follows an asynchronous job-based processing approach with WebSocket support for real-time updates.

Built with Bun and TypeScript using the Elysia framework, this API provides a clean, modular architecture with clear separation of concerns.

## Architecture

### Directory Structure

```
src/
├── api/                     # API routes, controllers, and middleware
│   ├── controllers/         # Business logic for handling requests
│   ├── middleware/          # Request processing middleware
│   └── routes/              # Route definitions and handlers
├── config/                  # Configuration settings
│   ├── constants.ts         # Application constants
│   └── env.ts               # Environment variable handling
├── integrations/            # External API integrations
│   ├── pexels/              # Pexels API for video search
│   ├── sync/                # Assembly AI for transcription and sync
│   └── voice/               # TTS services for voice generation
├── services/                # Core business logic
│   ├── alignment/           # Align text with audio timing
│   ├── job/                 # Async job management
│   ├── script/              # Script parsing and processing
│   ├── sync/                # Audio synchronization
│   ├── video/               # Video search and management
│   └── voice/               # Voice-over generation
├── types/                   # TypeScript type definitions
│   ├── assembly-types.ts    # Types for transcription/alignment
│   ├── job-types.ts         # Types for async job management
│   ├── script-types.ts      # Types for script processing
│   ├── tts-types.ts         # Types for text-to-speech
│   └── video-types.ts       # Types for video processing
├── utils/                   # Utility functions
│   ├── logger.ts            # Logging functionality
│   └── text-processing.ts   # Text manipulation utilities
├── index.ts                 # Entry point
└── server.ts                # Server configuration
```

### Key Components

#### 1. Script Processing Pipeline

The script processing pipeline consists of several stages:

1. **Script Parsing**: The script is parsed into logical sections (paragraphs)
2. **Point Extraction**: Each section is analyzed to extract key points
3. **Video Search**: For each point, relevant videos are found via the Pexels API
4. **Voice-Over Generation** (optional): Audio is generated for each section
5. **Audio Synchronization** (optional): Timing information is added to align audio with points

#### 2. Asynchronous Job Processing

To handle potentially long-running operations, the API uses an asynchronous job system:

1. **Job Creation**: When a request is received, a job is created and a job ID is returned immediately
2. **Background Processing**: The actual processing happens in the background
3. **Real-time Updates**: Clients can receive real-time updates via WebSocket
4. **Result Retrieval**: The final result can be retrieved via REST API or WebSocket

#### 3. WebSocket Integration

WebSocket support allows clients to receive real-time progress updates during processing:

1. **Connection**: Clients connect to a WebSocket endpoint with the job ID
2. **Updates**: The server sends progress updates as the job proceeds
3. **Completion**: When the job completes, the full result is sent through the WebSocket

## API Endpoints

### Public Endpoints

#### POST /process-script

Creates a new script processing job and returns a job ID immediately.

**Request Body:**

```json
{
  "script": "Your full script text here...",
  "tag": "history",
  "generateVoiceOver": false,
  "voiceId": "OA001",
  "syncAudio": false
}
```

**Parameters:**

- `script` (string, required): The full text of the script to process
- `tag` (string, required): A tag to help find relevant videos (e.g., "history", "nature", "technology")
- `generateVoiceOver` (boolean, optional): Whether to generate voice-overs for each section
- `voiceId` (string, optional): The voice ID to use for voice-over generation
- `syncAudio` (boolean, optional): Whether to synchronize the voice-overs with the points

**Response (201 Created):**

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### GET /jobs/:jobId

Retrieves the current status of a job.

**Path Parameters:**

- `jobId` (string, required): The ID of the job to check

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "processing",
    "progress": 60,
    "message": "Finding videos for points",
    "createdAt": "2025-05-22T10:00:00.000Z",
    "updatedAt": "2025-05-22T10:01:30.000Z"
  }
}
```

When the job is completed, the response includes the full result:

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "progress": 100,
    "updatedAt": "2025-05-22T10:02:30.000Z",
    "result": {
      "success": true,
      "data": [
        {
          "sectionId": "section1",
          "points": [
            {
              "text": "Welcome to a journey through time",
              "videoId": "1234567",
              "videoUrl": "https://www.pexels.com/video/1234567",
              "videoThumbnail": "https://images.pexels.com/videos/1234567/thumbnail.jpg"
            }
            // More points...
          ],
          "audioUrl": "https://example.com/audio1.mp3"
        }
        // More sections...
      ]
    }
  }
}
```

#### GET /health

Health check endpoint to verify the API is running.

**Response (200 OK):**

```json
{
  "status": "ok",
  "timestamp": "2025-05-22T10:00:00.000Z"
}
```

#### POST /voice/webhook

Webhook endpoint for receiving callbacks from the voice generation service. This is called by external voice services when a voice-over generation is complete.

### WebSocket: /jobs/:jobId/updates

Connect to this WebSocket endpoint to receive real-time updates about job progress.

**Path Parameters:**

- `jobId` (string, required): The ID of the job to subscribe to

**Connection Example:**

```javascript
const ws = new WebSocket(`ws://localhost:3000/jobs/${jobId}/updates`);

ws.onopen = () => {
  console.log('WebSocket connection opened');
};

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log('Job update:', update);
  
  // If job is completed or failed, close the WebSocket
  if (update.status === 'completed' || update.status === 'failed') {
    ws.close();
  }
};
```

**WebSocket Messages:**

Progress Update:
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "progress": 60,
  "message": "Finding videos for points",
  "updatedAt": "2025-05-22T10:01:30.000Z"
}
```

Completion with Results:
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "progress": 100,
  "message": "Processing completed successfully",
  "updatedAt": "2025-05-22T10:02:30.000Z",
  "result": {
    "success": true,
    "data": [...]
  }
}
```

## Internal Components

### Script Service

The `ScriptService` is responsible for the core script processing logic:

- **Script Parsing**: Uses `sectionParser` to split the script into logical sections
- **Point Extraction**: Uses `pointExtractor` to identify key points within each section
- **Voice-Over Generation**: Optional generation of audio for each section
- **Video Search**: Finding relevant videos for each point
- **Audio Synchronization**: Adding timing information to align audio with points

```typescript
// Example usage inside the API
const result = await scriptService.processScript({
  script: "Your script text...",
  tag: "history",
  generateVoiceOver: true,
  voiceId: "OA001",
  syncAudio: true
});
```

### Job Service

The `JobService` manages asynchronous processing jobs:

- **Job Creation**: Creating new jobs with unique IDs
- **Status Tracking**: Tracking job status, progress, and results
- **WebSocket Management**: Managing WebSocket connections and notifications
- **Job Cleanup**: Cleaning up completed jobs to prevent memory leaks

```typescript
// Example job creation
const jobId = jobService.createScriptProcessingJob(request);

// Example job status update
jobService.updateJobStatus(jobId, JobStatus.PROCESSING, "Finding videos", 50);

// Example job completion
jobService.completeScriptProcessingJob(jobId, result);
```

### Video Service

The `VideoService` handles video search and management:

- **Video Search**: Finding videos using the Pexels API
- **Video Caching**: Caching video results to improve performance
- **Video Metadata**: Managing video metadata and direct URLs

```typescript
// Example video search
const video = await videoService.findVideoForPoint("Ancient Egypt pyramids", "history");
```

### Voice Service

The `VoiceService` manages voice-over generation:

- **Voice Generation**: Generating voice-overs using TTS services
- **Voice Tracking**: Tracking voice-over generation status
- **Voice Retrieval**: Retrieving generated voice-overs

```typescript
// Example voice-over generation
const voiceOver = await voiceService.generateVoiceOver(
  "Welcome to a journey through time",
  "OA001" // Voice ID
);
```

### Sync Service

The `SyncService` handles synchronization of voice-overs with points:

- **Transcription**: Transcribing voice-overs to get word-level timing
- **Alignment**: Aligning script points with transcription
- **Timing**: Adding timing information to points for synchronized playback

```typescript
// Example synchronization
const pointsWithTiming = await syncService.synchronizeVoiceOverWithPoints(
  voiceOverId,
  processedSection
);
```

## Setting Up the Project

### Prerequisites

- [Bun](https://bun.sh/) 1.2.11 or later
- [Pexels API Key](https://www.pexels.com/api/)
- [AssemblyAI API Key](https://www.assemblyai.com/) (for voice synchronization)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Copy the `.env.example` file to `.env` and add your API keys:
   ```bash
   cp .env.example .env
   # Then edit the .env file with your API keys
   ```

### Running the API

Development mode with auto-reload:
```bash
bun run dev
```

Production mode:
```bash
bun run start
```

The API will be available at http://localhost:3000 by default.

## Example Usage

### Basic Script Processing

```javascript
// Send a request to process a script
const response = await fetch('http://localhost:3000/process-script', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    script: 'Welcome to a journey through time that stretches far beyond the story of Adam as the very first human. Our tale begins long before the Garden of Eden, in the dusty scrolls and clay tablets of ancient civilizations.',
    tag: 'history'
  })
});

const { jobId } = await response.json();
console.log('Job created with ID:', jobId);

// Connect to WebSocket for real-time updates
const ws = new WebSocket(`ws://localhost:3000/jobs/${jobId}/updates`);

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  console.log(`Progress: ${update.progress}% - ${update.message}`);
  
  if (update.status === 'completed') {
    console.log('Processing completed!');
    console.log('Result:', update.result);
    ws.close();
  }
};
```

### Checking Job Status (Alternative to WebSocket)

```javascript
async function checkJobStatus(jobId) {
  const response = await fetch(`http://localhost:3000/jobs/${jobId}`);
  const data = await response.json();
  
  console.log(`Job status: ${data.data.status} - ${data.data.progress}%`);
  
  if (data.data.status === 'completed') {
    console.log('Result:', data.data.result);
    return true;
  }
  
  return false;
}

// Poll for job status every 2 seconds
const intervalId = setInterval(async () => {
  const isComplete = await checkJobStatus(jobId);
  if (isComplete) {
    clearInterval(intervalId);
  }
}, 2000);
```

## Advanced Usage

### Voice-Over Generation

```javascript
const response = await fetch('http://localhost:3000/process-script', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    script: 'Your script text here...',
    tag: 'history',
    generateVoiceOver: true,
    voiceId: 'OA001', // Alloy voice
    syncAudio: true   // Synchronize voice-over with points
  })
});
```

## Troubleshooting

### Common Issues

1. **Long Processing Times**: For long scripts or when generating voice-overs, processing can take several minutes. Use the WebSocket connection to monitor progress.

2. **No Videos Found**: If no videos are found for certain points, try using more general tags or checking the Pexels API limits.

3. **WebSocket Disconnection**: If the WebSocket disconnects, you can reconnect or fall back to polling the `/jobs/:jobId` endpoint.

### Debugging

The API includes comprehensive logging throughout the codebase. Check the console output for detailed information about the processing steps and any errors that occur.

## Internal API Endpoints

The following endpoints are used internally by the system and are not intended for direct use by API consumers:

- `/internal/voice/*`: Voice-over generation endpoints (except the webhook)
- `/internal/sync/*`: Synchronization endpoints

These endpoints support the main asynchronous processing functionality but should only be used by advanced users who understand the internal system architecture.

## Disclaimer

**This project is under active development.** While I've made every effort to create a stable and reliable API, please be aware that:

1. Some bugs may exist in the codebase that I haven't discovered yet since am lazy.
2. The API structure and response format may change as I continue to improve the system, but frankly I don't know what I'm doing - this my be my last commit - DUNNO.
3. Error handling for edge cases might not be comprehensive
4. Performance optimizations are still being implemented
In total am a lazy person who doesn't know what they're doing.

We welcome bug reports, feature requests, and contributions to help improve the API. Please report any issues you encounter so I can address them in future updates.
