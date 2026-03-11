/**
 * Tests for resolve-files tool
 */

import { describe, expect, it } from 'vitest';
import { codeqlResolveFilesTool } from '../../../../src/tools/codeql/resolve-files';

describe('Resolve Files Tool', () => {
  describe('Tool Definition', () => {
    it('should have correct command and subcommand', () => {
      expect(codeqlResolveFilesTool.command).toBe('codeql');
      expect(codeqlResolveFilesTool.subcommand).toBe('resolve files');
    });

    it('should have correct name', () => {
      expect(codeqlResolveFilesTool.name).toBe('codeql_resolve_files');
    });

    it('should have examples', () => {
      expect(codeqlResolveFilesTool.examples).toBeDefined();
      expect(Array.isArray(codeqlResolveFilesTool.examples)).toBe(true);
      expect(codeqlResolveFilesTool.examples!.length).toBeGreaterThan(0);
    });

    it('should have input schema with expected fields', () => {
      const schema = codeqlResolveFilesTool.inputSchema;

      expect(schema).toHaveProperty('additionalArgs');
      expect(schema).toHaveProperty('also-match');
      expect(schema).toHaveProperty('dir');
      expect(schema).toHaveProperty('exclude');
      expect(schema).toHaveProperty('follow-symlinks');
      expect(schema).toHaveProperty('format');
      expect(schema).toHaveProperty('include');
      expect(schema).toHaveProperty('include-extension');
      expect(schema).toHaveProperty('prune');
    });

    it('should have result processor', () => {
      expect(codeqlResolveFilesTool.resultProcessor).toBeDefined();
      expect(typeof codeqlResolveFilesTool.resultProcessor).toBe('function');
    });
  });

  describe('Result Processor', () => {
    const processor = codeqlResolveFilesTool.resultProcessor!;

    it('should return error message for failed commands', () => {
      const result = {
        success: false,
        stdout: '',
        stderr: 'Error occurred',
        exitCode: 1,
        error: 'Command failed'
      };

      const output = processor(result, {});

      expect(output).toContain('Command failed');
      expect(output).toContain('exit code');
    });

    it('should return stdout for successful commands', () => {
      const result = {
        success: true,
        stdout: '/path/to/file.qll\n/path/to/other.qll',
        stderr: '',
        exitCode: 0
      };

      const output = processor(result, {});

      expect(output).toContain('/path/to/file.qll');
      expect(output).toContain('/path/to/other.qll');
    });

    it('should include warnings for successful commands with stderr', () => {
      const result = {
        success: true,
        stdout: '/path/to/file.qll',
        stderr: 'Some warning',
        exitCode: 0
      };

      const output = processor(result, {});

      expect(output).toContain('/path/to/file.qll');
      expect(output).toContain('Some warning');
    });
  });
});
