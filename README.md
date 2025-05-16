# Script Processing API

A backend API infrastructure similar to InVideo AI that processes scripts, splits them into sections and points, and finds relevant videos for each point using the Pexels API.

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
        },
        // More points...
      ]
    },
    // More sections...
  ]
}
```

## How It Works

1. The API receives a script and a tag
2. It splits the script into sections (paragraphs)
3. Each section is split into points using the `splitSection` function
4. For each point, it searches for a relevant video on Pexels using the first few words of the point combined with the tag
5. The API returns a structured response with all sections, points, and corresponding videos

This project was created using `bun init` in bun v1.2.11. [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
