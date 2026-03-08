/**
 * Tests for resources utilities
 */

import { describe, it, expect } from 'vitest';
import {
  getGettingStartedGuide,
  getPerformancePatterns,
  getQueryBasicsGuide,
  getSecurityTemplates,
  getServerPrompts,
  getServerTools,
  getTestDrivenDevelopment,
} from '../../../src/lib/resources';

describe('Resources', () => {
  describe('getGettingStartedGuide', () => {
    it('should return embedded getting started guide content', () => {
      const result = getGettingStartedGuide();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      // Content is embedded at build time, so it always contains real content
      expect(result).toContain('Getting Started');
    });
  });

  describe('getPerformancePatterns', () => {
    it('should return embedded performance patterns content', () => {
      const result = getPerformancePatterns();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Performance');
    });
  });

  describe('getQueryBasicsGuide', () => {
    it('should return embedded query basics guide content', () => {
      const result = getQueryBasicsGuide();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Query');
    });
  });

  describe('getSecurityTemplates', () => {
    it('should return embedded security templates content', () => {
      const result = getSecurityTemplates();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Security');
    });
  });

  describe('getServerPrompts', () => {
    it('should return embedded server prompts content', () => {
      const result = getServerPrompts();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Prompts');
    });
  });

  describe('getServerTools', () => {
    it('should return embedded server tools content', () => {
      const result = getServerTools();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Tools');
    });
  });

  describe('getTestDrivenDevelopment', () => {
    it('should return embedded test-driven development content', () => {
      const result = getTestDrivenDevelopment();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Test-Driven Development');
    });
  });
});
