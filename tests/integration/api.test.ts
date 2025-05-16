/**
 * Integration tests for the API
 */
import { expect, describe, it, beforeAll, afterAll } from 'bun:test';
import { createApp } from '../../src/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { ScriptProcessingResponse } from '../../src/types/script-types';

describe('API Integration Tests', () => {
  const app = createApp();
  const testScript = path.join(import.meta.dir, '../fixtures/test-script.txt');
  
  // Test the script processing endpoint
  describe('POST /process-script', () => {
    it('should process a script and return sections with videos', async () => {
      // Read the test script
      const script = await fs.readFile(testScript, 'utf-8');
      
      // Make a request to the API
      const response = await app.handle(
        new Request('http://localhost/process-script', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            script,
            tag: 'history'
          })
        })
      );
      
      // Check the response
      expect(response.status).toBe(200);
      
      // Parse the response body
      const body = await response.json() as ScriptProcessingResponse;
      
      // Verify the structure
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data)).toBe(true);
      
      // Check that sections were processed
      expect(body.data?.length).toBeGreaterThan(0);
      
      // Check that each section has points
      if (body.data) {
        for (const section of body.data) {
          expect(section.sectionId).toBeDefined();
          expect(Array.isArray(section.points)).toBe(true);
          expect(section.points.length).toBeGreaterThan(0);
          
          // Check that each point has video information
          for (const point of section.points) {
            expect(point.text).toBeDefined();
            expect(typeof point.videoId).toBe('string');
            expect(typeof point.videoUrl).toBe('string');
            expect(typeof point.videoThumbnail).toBe('string');
          }
        }
      }
    });
    
    it('should return an error for invalid requests', async () => {
      // Make a request with missing fields
      const response = await app.handle(
        new Request('http://localhost/process-script', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            // Missing required fields
          })
        })
      );
      
      // Check the response
      expect(response.status).toBe(400);
      
      // Parse the response body
      const body = await response.json() as ScriptProcessingResponse;
      
      // Verify the error structure
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    });
  });
  
  // Test the health check endpoint
  describe('GET /health', () => {
    it('should return a 200 status and health information', async () => {
      const response = await app.handle(
        new Request('http://localhost/health', {
          method: 'GET'
        })
      );
      
      // Check the response
      expect(response.status).toBe(200);
      
      // Parse the response body
      const body = await response.json() as { status: string; timestamp: string };
      
      // Verify the structure
      expect(body.status).toBe('ok');
      expect(body.timestamp).toBeDefined();
    });
  });
});
