/**
 * Tests for resources utilities
 */

import { describe, it, expect } from 'vitest';
import {
  getDataflowMigration,
  getDiffInformedAnalysis,
  getLearningQueryBasics,
  getOverlayDatabases,
  getPerformancePatterns,
  getQueryUnitTesting,
  getSecurityTemplates,
  getServerOverview,
  getServerPrompts,
  getServerQueries,
  getServerTools,
  getTestDrivenDevelopment,
} from '../../../src/lib/resources';

describe('Resources', () => {
  describe('getLearningQueryBasics', () => {
    it('should return embedded query basics learning content', () => {
      const result = getLearningQueryBasics();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Query');
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

  describe('getSecurityTemplates', () => {
    it('should return embedded security templates content', () => {
      const result = getSecurityTemplates();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Security');
    });
  });

  describe('getServerOverview', () => {
    it('should return embedded server overview content', () => {
      const result = getServerOverview();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Getting Started');
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

  describe('getServerQueries', () => {
    it('should return embedded server queries content', () => {
      const result = getServerQueries();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('PrintAST');
    });
  });

  describe('getServerTools', () => {
    it('should return embedded server tools content', () => {
      const result = getServerTools();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Tools');
    });

    it('should document the search_ql_code tool', () => {
      const result = getServerTools();

      expect(result).toContain('search_ql_code');
    });

    it('should document the codeql_resolve_files tool', () => {
      const result = getServerTools();

      expect(result).toContain('codeql_resolve_files');
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

  describe('getQueryUnitTesting', () => {
    it('should return embedded query unit testing content', () => {
      const result = getQueryUnitTesting();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('Unit Testing');
    });
  });

  describe('getDataflowMigration', () => {
    it('should return embedded dataflow migration content', () => {
      const result = getDataflowMigration();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('v1 to v2');
    });
  });

  describe('getDiffInformedAnalysis', () => {
    it('should return embedded diff-informed analysis content', () => {
      const result = getDiffInformedAnalysis();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('observeDiffInformedIncrementalMode');
    });

    it('should document the local diff-range mechanism (restrictAlertsTo + --model-packs)', () => {
      const result = getDiffInformedAnalysis();

      // The resource must teach how to supply a diff range locally rather than
      // claiming it is impossible outside the scanning environment.
      expect(result).toContain('restrictAlertsTo');
      expect(result).toContain('--model-packs');
      expect(result).not.toContain('no `codeql database analyze` flag to inject a diff range locally');
    });
  });

  describe('getOverlayDatabases', () => {
    it('should return embedded overlay databases content', () => {
      const result = getOverlayDatabases();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('overlay-base');
    });
  });
});
