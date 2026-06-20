/**
 * Tests for query-run tool, including overlay-evaluation support.
 */

import { describe, it, expect } from 'vitest';
import { codeqlQueryRunTool } from '../../../../src/tools/codeql/query-run';

describe('Query Run Tool', () => {
  describe('Tool Definition', () => {
    it('should have correct name', () => {
      expect(codeqlQueryRunTool.name).toBe('codeql_query_run');
    });

    it('should have correct command and subcommand', () => {
      expect(codeqlQueryRunTool.command).toBe('codeql');
      expect(codeqlQueryRunTool.subcommand).toBe('query run');
    });

    it('should have examples', () => {
      expect(codeqlQueryRunTool.examples).toBeDefined();
      expect(codeqlQueryRunTool.examples!.length).toBeGreaterThan(0);
    });
  });

  describe('Overlay evaluation schema', () => {
    it('should expose an optional boolean "evaluate-as-overlay" parameter', () => {
      const evaluateAsOverlay = codeqlQueryRunTool.inputSchema['evaluate-as-overlay'];
      expect(evaluateAsOverlay).toBeDefined();
      expect(evaluateAsOverlay.isOptional()).toBe(true);
      expect(evaluateAsOverlay.safeParse(true).success).toBe(true);
      expect(evaluateAsOverlay.safeParse('not-a-boolean').success).toBe(false);
    });

    it('should expose an optional boolean "cache-at-frontier" parameter', () => {
      const cacheAtFrontier = codeqlQueryRunTool.inputSchema['cache-at-frontier'];
      expect(cacheAtFrontier).toBeDefined();
      expect(cacheAtFrontier.isOptional()).toBe(true);
      expect(cacheAtFrontier.safeParse(true).success).toBe(true);
      expect(cacheAtFrontier.safeParse('not-a-boolean').success).toBe(false);
    });

    it('should describe evaluate-as-overlay as an advanced/experimental option', () => {
      const description = codeqlQueryRunTool.inputSchema['evaluate-as-overlay'].description ?? '';
      expect(description.toLowerCase()).toContain('overlay');
      expect(description.toLowerCase()).toMatch(/experimental|advanced/);
    });
  });
});
