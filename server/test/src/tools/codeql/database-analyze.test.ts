/**
 * Tests for database-analyze tool, including overlay-evaluation support.
 */

import { describe, it, expect } from 'vitest';
import { codeqlDatabaseAnalyzeTool } from '../../../../src/tools/codeql/database-analyze';

describe('Database Analyze Tool', () => {
  describe('Tool Definition', () => {
    it('should have correct name', () => {
      expect(codeqlDatabaseAnalyzeTool.name).toBe('codeql_database_analyze');
    });

    it('should have correct command and subcommand', () => {
      expect(codeqlDatabaseAnalyzeTool.command).toBe('codeql');
      expect(codeqlDatabaseAnalyzeTool.subcommand).toBe('database analyze');
    });

    it('should have examples', () => {
      expect(codeqlDatabaseAnalyzeTool.examples).toBeDefined();
      expect(codeqlDatabaseAnalyzeTool.examples!.length).toBeGreaterThan(0);
    });
  });

  describe('Overlay evaluation schema', () => {
    it('should expose an optional boolean "evaluate-as-overlay" parameter', () => {
      const evaluateAsOverlay = codeqlDatabaseAnalyzeTool.inputSchema['evaluate-as-overlay'];
      expect(evaluateAsOverlay).toBeDefined();
      expect(evaluateAsOverlay.isOptional()).toBe(true);
      expect(evaluateAsOverlay.safeParse(true).success).toBe(true);
      expect(evaluateAsOverlay.safeParse('not-a-boolean').success).toBe(false);
    });

    it('should expose an optional boolean "cache-at-frontier" parameter', () => {
      const cacheAtFrontier = codeqlDatabaseAnalyzeTool.inputSchema['cache-at-frontier'];
      expect(cacheAtFrontier).toBeDefined();
      expect(cacheAtFrontier.isOptional()).toBe(true);
      expect(cacheAtFrontier.safeParse(true).success).toBe(true);
      expect(cacheAtFrontier.safeParse('not-a-boolean').success).toBe(false);
    });

    it('should describe evaluate-as-overlay as an advanced/experimental option', () => {
      const description = codeqlDatabaseAnalyzeTool.inputSchema['evaluate-as-overlay'].description ?? '';
      expect(description.toLowerCase()).toContain('overlay');
      expect(description.toLowerCase()).toMatch(/experimental|advanced/);
    });
  });
});
