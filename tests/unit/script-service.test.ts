/**
 * Unit tests for script service
 */
import { expect, describe, it, mock, spyOn } from 'bun:test';
import { scriptService } from '../../src/services/script/script-service';
import { sectionParser } from '../../src/services/script/section-parser';
import { pointExtractor } from '../../src/services/script/point-extractor';
import { videoService } from '../../src/services/video/video-service';
import type { Section } from '../../src/types/script-types';

// Mock dependencies
mock.module('../../src/services/script/section-parser', () => ({
  sectionParser: {
    parseScriptIntoSections: () => [
      { id: 'section1', text: 'Test section 1', points: [] }
    ]
  }
}));

mock.module('../../src/services/script/point-extractor', () => ({
  pointExtractor: {
    extractPointsFromSections: (sections: Section[]) => 
      sections.map((section: Section) => ({
        ...section,
        points: ['Point 1', 'Point 2']
      }))
  }
}));

mock.module('../../src/services/video/video-service', () => ({
  videoService: {
    findVideoForPoint: async () => ({
      id: 'test-id',
      url: 'https://test.com/video',
      width: 1920,
      height: 1080,
      duration: 10,
      image: 'https://test.com/image.jpg'
    })
  }
}));

describe('ScriptService', () => {
  it('should process a script and return sections with videos', async () => {
    // Spy on the dependencies
    const parseScriptSpy = spyOn(sectionParser, 'parseScriptIntoSections');
    const extractPointsSpy = spyOn(pointExtractor, 'extractPointsFromSections');
    const findVideoSpy = spyOn(videoService, 'findVideoForPoint');
    
    // Process a test script
    const result = await scriptService.processScript('Test script', 'test-tag');
    
    // Verify the result
    expect(result).toHaveLength(1);
    expect(result[0]?.sectionId).toBe('section1');
    expect(result[0]?.points).toHaveLength(2);
    expect(result[0]?.points[0]?.videoId).toBe('test-id');
    
    // Verify the dependencies were called
    expect(parseScriptSpy).toHaveBeenCalledTimes(1);
    expect(extractPointsSpy).toHaveBeenCalledTimes(1);
    expect(findVideoSpy).toHaveBeenCalledTimes(2);
  });
});
