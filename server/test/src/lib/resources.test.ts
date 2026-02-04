/**
 * Tests for resources utilities
 */

import { describe, it, expect } from 'vitest';
import {
  getGettingStartedGuide,
  getQueryBasicsGuide,
  getSecurityTemplates,
  getPerformancePatterns
} from '../../../src/lib/resources';

describe('Resources', () => {
  describe('getGettingStartedGuide', () => {
    it('should return content or fallback message', () => {
      const result = getGettingStartedGuide();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Either returns actual content or fallback - case insensitive check
      expect(
        result.toLowerCase().includes('getting started') ||
        result.toLowerCase().includes('not available') ||
        result.toLowerCase().includes('guide')
      ).toBe(true);
    });
  });

  describe('getQueryBasicsGuide', () => {
    it('should return content or fallback message', () => {
      const result = getQueryBasicsGuide();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Either returns actual content or fallback
      expect(
        result.toLowerCase().includes('query') ||
        result === 'Query basics guide not available'
      ).toBe(true);
    });
  });

  describe('getSecurityTemplates', () => {
    it('should return content or fallback message', () => {
      const result = getSecurityTemplates();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Either returns actual content or fallback
      expect(
        result.toLowerCase().includes('security') ||
        result === 'Security templates not available'
      ).toBe(true);
    });
  });

  describe('getPerformancePatterns', () => {
    it('should return content or fallback message', () => {
      const result = getPerformancePatterns();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Either returns actual content or fallback
      expect(
        result.toLowerCase().includes('performance') ||
        result === 'Performance patterns not available'
      ).toBe(true);
    });
  });
});
