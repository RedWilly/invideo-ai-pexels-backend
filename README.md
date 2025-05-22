# Script Processing API

A backend API infrastructure similar to InVideo AI that processes scripts, splits them into sections and points, and finds relevant videos for each point using the Pexels API.

## Modular Architecture

This project follows a clean, modular architecture with clear separation of concerns:

```
src/
├── config/                  # Configuration settings
├── api/                     # API routes and controllers
│   ├── routes/              # Route definitions
│   ├── controllers/         # Route handlers
│   └── middleware/          # API middleware
├── services/                # Business logic
│   ├── script/              # Script processing services
│   └── video/               # Video search services
├── integrations/            # External API integrations
│   └── pexels/              # Pexels API integration
├── utils/                   # Utility functions
├── types/                   # Type definitions
└── server.ts               # Main application entry point
```

## Setup

### Install dependencies

```bash
bun install
```

### Configure Environment Variables

Copy the `.env.example` file to `.env` and add your Pexels API key:

```bash
cp .env.example .env
# Then edit the .env file with your API key
```

### Run the API server

```bash
# Production
bun run start

# Development with hot reload
bun run dev
```

The API will be available at http://localhost:3000

## Testing

The project includes both unit and integration tests:

```bash
# Run all tests
bun test

# Run only unit tests
bun test:unit

# Run only integration tests
bun test:integration

# Run the API test script
bun test:api
```

## API Endpoints

### POST /process-script

Asynchronously processes a script and returns a job ID immediately. The actual processing happens in the background.

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

**Response (201 Created):**

```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### GET /jobs/:jobId

Get the status of a processing job.

**Response:**

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

When the job is completed, the response will include the full result:

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
    }
  }
}
```

### WebSocket: /jobs/:jobId/updates

Connect to this WebSocket endpoint to receive real-time updates about job progress.

**Example WebSocket Messages:**

```json
// Progress update
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "progress": 60,
  "message": "Finding videos for points",
  "updatedAt": "2025-05-22T10:01:30.000Z"
}

// Completion with results
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

### GET /health

Health check endpoint to verify the API is running.

**Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-05-16T09:00:00.000Z"
}
```

## How It Works

1. **Job Creation**: When a script processing request is received, a job is created and a job ID is returned immediately
2. **Background Processing**: The script is processed asynchronously in the background:
   - **Script Parsing**: The script is split into sections (paragraphs)
   - **Point Extraction**: Each section is split into points using advanced text processing rules
   - **Video Search**: For each point, the API searches for a relevant video on Pexels using the point text combined with the provided tag
   - **Voice-Over Generation** (optional): If requested, voice-overs are generated for each section
   - **Audio Synchronization** (optional): If requested, voice-overs are synchronized with points
3. **Real-time Updates**: Clients can receive real-time updates via WebSocket
4. **Final Result**: When processing is complete, the full result is available via WebSocket and REST API

## Key Components

- **Job Service**: Manages asynchronous processing jobs and WebSocket notifications
- **Script Service**: Handles the core logic of processing scripts
- **Video Service**: Manages video search functionality
- **Voice Service**: Handles voice-over generation (internal)
- **Sync Service**: Manages synchronization of voice-overs with points (internal)
- **Pexels Integration**: Provides a clean abstraction over the Pexels API
- **Error Handling**: Comprehensive error handling and logging throughout the application

### POST /voice/webhook

Webhook endpoint for receiving callbacks from the voice generation service. This endpoint is called by the external voice service when a voice-over generation is complete.

## Internal API Endpoints

The following endpoints are used internally by the system and are not intended for direct use by API consumers:

- `/internal/voice/*`: Voice-over generation endpoints (except the webhook)
- `/internal/sync/*`: Synchronization endpoints

These endpoints support the main asynchronous processing functionality and should not be called directly.

This project was created using `bun init` in bun v1.2.11. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
