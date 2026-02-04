/**
 * Tests for query-format tool
 */

import { describe, it, expect } from 'vitest';
import { codeqlQueryFormatTool } from '../../../../src/tools/codeql/query-format';

describe('Query Format Tool', () => {
  describe('Tool Definition', () => {
    it('should have correct name', () => {
      expect(codeqlQueryFormatTool.name).toBe('codeql_query_format');
    });

    it('should have correct command and subcommand', () => {
      expect(codeqlQueryFormatTool.command).toBe('codeql');
      expect(codeqlQueryFormatTool.subcommand).toBe('query format');
    });

    it('should have input schema with expected fields', () => {
      const schema = codeqlQueryFormatTool.inputSchema;

      expect(schema).toHaveProperty('files');
      expect(schema).toHaveProperty('output');
      expect(schema).toHaveProperty('in-place');
      expect(schema).toHaveProperty('check-only');
      expect(schema).toHaveProperty('backup');
      expect(schema).toHaveProperty('no-syntax-errors');
      expect(schema).toHaveProperty('verbose');
      expect(schema).toHaveProperty('additionalArgs');
    });

    it('should have examples', () => {
      expect(codeqlQueryFormatTool.examples).toBeDefined();
      expect(Array.isArray(codeqlQueryFormatTool.examples)).toBe(true);
      expect(codeqlQueryFormatTool.examples!.length).toBeGreaterThan(0);
    });

    it('should have custom result processor', () => {
      expect(codeqlQueryFormatTool.resultProcessor).toBeDefined();
      expect(typeof codeqlQueryFormatTool.resultProcessor).toBe('function');
    });
  });

  describe('Result Processor', () => {
    const processor = codeqlQueryFormatTool.resultProcessor!;

    it('should treat exit code 1 with check-only as success', () => {
      const result = {
        success: false,
        stdout: 'file.ql would change by autoformatting.',
        stderr: '',
        exitCode: 1
      };

      const output = processor(result, { 'check-only': true });

      expect(output).toContain('would change');
      expect(result.success).toBe(true); // Should be modified to true
    });

    it('should return stdout or stderr for check-only with changes', () => {
      const result = {
        success: false,
        stdout: '',
        stderr: 'file.ql requires formatting',
        exitCode: 1
      };

      const output = processor(result, { 'check-only': true });

      expect(output).toContain('requires formatting');
    });

    it('should return default message for check-only with no output', () => {
      const result = {
        success: false,
        stdout: '',
        stderr: '',
        exitCode: 1
      };

      const output = processor(result, { 'check-only': true });

      expect(output).toBe('File would change by autoformatting.');
    });

    it('should handle normal success without check-only', () => {
      const result = {
        success: true,
        stdout: 'Formatted successfully',
        stderr: '',
        exitCode: 0
      };

      const output = processor(result, {});

      expect(output).toContain('Formatted successfully');
    });

    it('should handle normal failure without check-only', () => {
      const result = {
        success: false,
        stdout: '',
        stderr: 'Syntax error in query',
        exitCode: 2
      };

      const output = processor(result, {});

      expect(output).toContain('Syntax error');
    });

    it('should not modify success flag for non-check-only errors', () => {
      const result = {
        success: false,
        stdout: '',
        stderr: 'Error',
        exitCode: 1
      };

      processor(result, { 'check-only': false });

      expect(result.success).toBe(false);
    });

    it('should handle in-place formatting output', () => {
      const result = {
        success: true,
        stdout: '',
        stderr: '',
        exitCode: 0
      };

      const output = processor(result, { 'in-place': true });

      expect(output).toBe('Command executed successfully (no output)');
    });
  });
});
