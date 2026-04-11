/**
 * Tests for query-compile tool
 */

import { describe, it, expect } from 'vitest';
import { codeqlQueryCompileTool } from '../../../../src/tools/codeql/query-compile';

describe('Query Compile Tool', () => {
  describe('Tool Definition', () => {
    it('should have correct name', () => {
      expect(codeqlQueryCompileTool.name).toBe('codeql_query_compile');
    });

    it('should have correct command and subcommand', () => {
      expect(codeqlQueryCompileTool.command).toBe('codeql');
      expect(codeqlQueryCompileTool.subcommand).toBe('query compile');
    });

    it('should have input schema with expected fields', () => {
      const schema = codeqlQueryCompileTool.inputSchema;

      expect(schema).toHaveProperty('query');
      expect(schema).toHaveProperty('database');
      expect(schema).toHaveProperty('dump-dil');
      expect(schema).toHaveProperty('library');
      expect(schema).toHaveProperty('logDir');
      expect(schema).toHaveProperty('output');
      expect(schema).toHaveProperty('warnings');
      expect(schema).toHaveProperty('verbose');
      expect(schema).toHaveProperty('additionalArgs');
    });

    it('should have dump-dil as optional boolean parameter', () => {
      const dumpDil = codeqlQueryCompileTool.inputSchema['dump-dil'];
      expect(dumpDil).toBeDefined();
      expect(dumpDil.isOptional()).toBe(true);
    });

    it('should have logDir as optional string parameter', () => {
      const logDir = codeqlQueryCompileTool.inputSchema['logDir'];
      expect(logDir).toBeDefined();
      expect(logDir.isOptional()).toBe(true);
    });

    it('should have logDir description matching the pattern used by other CLI tools', () => {
      const logDir = codeqlQueryCompileTool.inputSchema['logDir'];
      const description = logDir.description;
      // Must mention CODEQL_QUERY_LOG_DIR env var like query-run, test-run, database-analyze
      expect(description).toContain('CODEQL_QUERY_LOG_DIR');
      // Must mention the default path
      expect(description).toContain('.tmp/query-logs');
    });

    it('should have examples', () => {
      expect(codeqlQueryCompileTool.examples).toBeDefined();
      expect(codeqlQueryCompileTool.examples!.length).toBeGreaterThan(0);
    });
  });
});
