/**
 * Tests for database-create tool, including overlay-database support.
 */

import { describe, it, expect } from 'vitest';
import { codeqlDatabaseCreateTool } from '../../../../src/tools/codeql/database-create';

describe('Database Create Tool', () => {
  describe('Tool Definition', () => {
    it('should have correct name', () => {
      expect(codeqlDatabaseCreateTool.name).toBe('codeql_database_create');
    });

    it('should have correct command and subcommand', () => {
      expect(codeqlDatabaseCreateTool.command).toBe('codeql');
      expect(codeqlDatabaseCreateTool.subcommand).toBe('database create');
    });

    it('should have examples', () => {
      expect(codeqlDatabaseCreateTool.examples).toBeDefined();
      expect(codeqlDatabaseCreateTool.examples!.length).toBeGreaterThan(0);
    });
  });

  describe('Overlay database schema', () => {
    it('should expose an optional boolean "overlay-base" parameter', () => {
      const overlayBase = codeqlDatabaseCreateTool.inputSchema['overlay-base'];
      expect(overlayBase).toBeDefined();
      expect(overlayBase.isOptional()).toBe(true);
      expect(overlayBase.safeParse(true).success).toBe(true);
      expect(overlayBase.safeParse('not-a-boolean').success).toBe(false);
    });

    it('should expose an optional string "overlay-changes" parameter', () => {
      const overlayChanges = codeqlDatabaseCreateTool.inputSchema['overlay-changes'];
      expect(overlayChanges).toBeDefined();
      expect(overlayChanges.isOptional()).toBe(true);
      expect(overlayChanges.safeParse('/path/to/changes.json').success).toBe(true);
    });

    it('should expose an optional "cache-cleanup" enum with the overlay mode', () => {
      const cacheCleanup = codeqlDatabaseCreateTool.inputSchema['cache-cleanup'];
      expect(cacheCleanup).toBeDefined();
      expect(cacheCleanup.isOptional()).toBe(true);
      expect(cacheCleanup.safeParse('overlay').success).toBe(true);
      expect(cacheCleanup.safeParse('clear').success).toBe(true);
      expect(cacheCleanup.safeParse('trim').success).toBe(true);
      expect(cacheCleanup.safeParse('fit').success).toBe(true);
      expect(cacheCleanup.safeParse('bogus-mode').success).toBe(false);
    });

    it('should describe overlay-base as an advanced/experimental option', () => {
      const description = codeqlDatabaseCreateTool.inputSchema['overlay-base'].description ?? '';
      expect(description.toLowerCase()).toContain('overlay');
      expect(description.toLowerCase()).toMatch(/experimental|advanced/);
    });

    it('should mention the JSON changes file format for overlay-changes', () => {
      const description = codeqlDatabaseCreateTool.inputSchema['overlay-changes'].description ?? '';
      expect(description.toLowerCase()).toContain('overlay');
      expect(description.toLowerCase()).toContain('changes');
    });
  });

  describe('Extractor environment schema', () => {
    it('should expose an optional string-array "extractorEnv" parameter', () => {
      const extractorEnv = codeqlDatabaseCreateTool.inputSchema['extractorEnv'];
      expect(extractorEnv).toBeDefined();
      expect(extractorEnv.isOptional()).toBe(true);
      expect(extractorEnv.safeParse(['LGTM_INDEX_XML_MODE=ALL']).success).toBe(true);
      expect(extractorEnv.safeParse('LGTM_INDEX_XML_MODE=ALL').success).toBe(false);
    });

    it('should document the LGTM_/CODEQL_EXTRACTOR_ restriction and a UI5 example', () => {
      const description = codeqlDatabaseCreateTool.inputSchema['extractorEnv'].description ?? '';
      expect(description).toContain('LGTM_');
      expect(description).toContain('LGTM_INDEX_XML_MODE');
    });
  });
});
