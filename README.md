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

Processes a script and finds relevant videos for each point.

**Request Body:**

```json
{
  "script": "Your full script text here...",
  "tag": "history"
}
```

**Response:**

```json
{
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
      ]
    }
  ]
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

1. **Script Parsing**: The script is split into sections (paragraphs)
2. **Point Extraction**: Each section is split into points using advanced text processing rules
3. **Video Search**: For each point, the API searches for a relevant video on Pexels using the point text combined with the provided tag
4. **Response**: The API returns a structured response with all sections, points, and corresponding videos

## Key Components

- **Script Service**: Handles the core logic of processing scripts
- **Video Service**: Manages video search functionality
- **Pexels Integration**: Provides a clean abstraction over the Pexels API
- **Error Handling**: Comprehensive error handling and logging throughout the application

This project was created using `bun init` in bun v1.2.11. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
