/**
 * Tests for log directory manager utilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getOrCreateLogDirectory } from '../../../src/lib/log-directory-manager';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { createTestTempDir, cleanupTestTempDir } from '../../utils/temp-dir';

describe('Log Directory Manager', () => {
  const testBaseDir = createTestTempDir('test-log-dir-manager');

  beforeEach(() => {
    // Clean up test directory before each test
    if (existsSync(testBaseDir)) {
      rmSync(testBaseDir, { recursive: true, force: true });
    }
    // Set environment variable for tests
    process.env.CODEQL_QUERY_LOG_DIR = testBaseDir;
  });

  afterEach(() => {
    // Clean up after tests
    cleanupTestTempDir(testBaseDir);
    // Reset environment variable
    delete process.env.CODEQL_QUERY_LOG_DIR;
  });

  describe('getOrCreateLogDirectory', () => {
    it('should create base directory if it does not exist', () => {
      expect(existsSync(testBaseDir)).toBe(false);

      const result = getOrCreateLogDirectory();

      expect(existsSync(testBaseDir)).toBe(true);
      expect(result).toContain(testBaseDir);
    });

    it('should create a unique subdirectory with timestamp and random ID', () => {
      const result = getOrCreateLogDirectory();

      expect(result).toMatch(/query-run-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-f0-9]{8}$/);
      expect(existsSync(result)).toBe(true);
    });

    it('should return different directories on subsequent calls', () => {
      const result1 = getOrCreateLogDirectory();
      const result2 = getOrCreateLogDirectory();

      expect(result1).not.toBe(result2);
      expect(existsSync(result1)).toBe(true);
      expect(existsSync(result2)).toBe(true);
    });

    it('should use provided logDir when given', () => {
      const customLogDir = join(testBaseDir, 'custom-log-dir');

      const result = getOrCreateLogDirectory(customLogDir);

      expect(result).toBe(customLogDir);
      expect(existsSync(customLogDir)).toBe(true);
    });

    it('should create provided logDir if it does not exist', () => {
      const customLogDir = join(testBaseDir, 'nested', 'log', 'dir');
      expect(existsSync(customLogDir)).toBe(false);

      const result = getOrCreateLogDirectory(customLogDir);

      expect(result).toBe(customLogDir);
      expect(existsSync(customLogDir)).toBe(true);
    });

    it('should return existing logDir if it already exists', () => {
      const customLogDir = join(testBaseDir, 'existing-dir');
      mkdirSync(customLogDir, { recursive: true });

      const result = getOrCreateLogDirectory(customLogDir);

      expect(result).toBe(customLogDir);
    });

    it('should throw error if logDir is outside base directory', () => {
      const outsideDir = join(testBaseDir, '..', '..', 'outside-base-dir');

      expect(() => getOrCreateLogDirectory(outsideDir)).toThrow(
        /Provided log directory is outside the allowed base directory/
      );
    });

    it('should handle path traversal attempts', () => {
      const traversalPath = join(testBaseDir, '..', '..', 'etc', 'passwd');

      expect(() => getOrCreateLogDirectory(traversalPath)).toThrow(
        /Provided log directory is outside the allowed base directory/
      );
    });

    it('should use default base directory when env var is not set', () => {
      delete process.env.CODEQL_QUERY_LOG_DIR;

      const result = getOrCreateLogDirectory();

      // Default now goes to project-local .tmp/query-logs/
      expect(result).toContain('.tmp/query-logs');

      // Clean up
      rmSync(result, { recursive: true, force: true });
    });
  });
});
