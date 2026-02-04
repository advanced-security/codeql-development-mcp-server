/**
 * Tests for resolve-queries tool
 */

import { describe, it, expect } from 'vitest';
import { codeqlResolveQueriesTool } from '../../../../src/tools/codeql/resolve-queries';

describe('Resolve Queries Tool', () => {
  describe('Tool Definition', () => {
    it('should have correct name', () => {
      expect(codeqlResolveQueriesTool.name).toBe('codeql_resolve_queries');
    });

    it('should have correct command and subcommand', () => {
      expect(codeqlResolveQueriesTool.command).toBe('codeql');
      expect(codeqlResolveQueriesTool.subcommand).toBe('resolve queries');
    });

    it('should have input schema with expected fields', () => {
      const schema = codeqlResolveQueriesTool.inputSchema;

      expect(schema).toHaveProperty('directory');
      expect(schema).toHaveProperty('language');
      expect(schema).toHaveProperty('format');
      expect(schema).toHaveProperty('additional-packs');
      expect(schema).toHaveProperty('verbose');
      expect(schema).toHaveProperty('additionalArgs');
    });

    it('should have examples', () => {
      expect(codeqlResolveQueriesTool.examples).toBeDefined();
      expect(Array.isArray(codeqlResolveQueriesTool.examples)).toBe(true);
      expect(codeqlResolveQueriesTool.examples!.length).toBeGreaterThan(0);
    });

    it('should have custom result processor', () => {
      expect(codeqlResolveQueriesTool.resultProcessor).toBeDefined();
      expect(typeof codeqlResolveQueriesTool.resultProcessor).toBe('function');
    });
  });

  describe('Result Processor', () => {
    const processor = codeqlResolveQueriesTool.resultProcessor!;

    it('should return error message for failed commands', () => {
      const result = {
        success: false,
        stdout: '',
        stderr: 'Error occurred',
        exitCode: 1,
        error: 'Command failed'
      };

      const output = processor(result, { format: 'text' });

      expect(output).toContain('Command failed');
      expect(output).toContain('exit code');
    });

    it('should return only stdout for JSON format', () => {
      const result = {
        success: true,
        stdout: '["query1.ql", "query2.ql"]',
        stderr: 'Warning: something happened',
        exitCode: 0
      };

      const output = processor(result, { format: 'json' });

      expect(output).toBe('["query1.ql", "query2.ql"]');
      expect(output).not.toContain('Warning');
    });

    it('should return only stdout for betterjson format', () => {
      const result = {
        success: true,
        stdout: '{"queries": []}',
        stderr: 'Some warning',
        exitCode: 0
      };

      const output = processor(result, { format: 'betterjson' });

      expect(output).toBe('{"queries": []}');
    });

    it('should return only stdout for bylanguage format', () => {
      const result = {
        success: true,
        stdout: '{"java": [], "javascript": []}',
        stderr: 'Info message',
        exitCode: 0
      };

      const output = processor(result, { format: 'bylanguage' });

      expect(output).toBe('{"java": [], "javascript": []}');
    });

    it('should include warnings for text format', () => {
      const result = {
        success: true,
        stdout: 'query1.ql\nquery2.ql',
        stderr: 'Warning: deprecated syntax',
        exitCode: 0
      };

      const output = processor(result, { format: 'text' });

      expect(output).toContain('query1.ql');
      expect(output).toContain('Warnings/Info');
      expect(output).toContain('deprecated syntax');
    });

    it('should handle empty output', () => {
      const result = {
        success: true,
        stdout: '',
        stderr: '',
        exitCode: 0
      };

      const output = processor(result, { format: 'text' });

      expect(output).toBe('Command executed successfully (no output)');
    });

    it('should return empty array for JSON format with no stdout', () => {
      const result = {
        success: true,
        stdout: '',
        stderr: '',
        exitCode: 0
      };

      const output = processor(result, { format: 'json' });

      expect(output).toBe('[]');
    });
  });
});
