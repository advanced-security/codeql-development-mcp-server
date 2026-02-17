/**
 * Tests for discovery configuration: env var parsing for database and
 * query-run-results directory discovery.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getDatabaseBaseDirs,
  getQueryRunResultsDirs,
} from '../../../src/lib/discovery-config';

describe('Discovery Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getDatabaseBaseDirs', () => {
    it('should return empty array when env var is not set', () => {
      delete process.env.CODEQL_DATABASES_BASE_DIRS;
      expect(getDatabaseBaseDirs()).toEqual([]);
    });

    it('should return empty array when env var is empty string', () => {
      process.env.CODEQL_DATABASES_BASE_DIRS = '';
      expect(getDatabaseBaseDirs()).toEqual([]);
    });

    it('should parse single directory', () => {
      process.env.CODEQL_DATABASES_BASE_DIRS = '/path/to/databases';
      expect(getDatabaseBaseDirs()).toEqual(['/path/to/databases']);
    });

    it('should parse colon-separated directories', () => {
      process.env.CODEQL_DATABASES_BASE_DIRS = '/path/one:/path/two:/path/three';
      expect(getDatabaseBaseDirs()).toEqual(['/path/one', '/path/two', '/path/three']);
    });

    it('should trim whitespace from paths', () => {
      process.env.CODEQL_DATABASES_BASE_DIRS = ' /path/one : /path/two ';
      expect(getDatabaseBaseDirs()).toEqual(['/path/one', '/path/two']);
    });

    it('should filter out empty segments from consecutive colons', () => {
      process.env.CODEQL_DATABASES_BASE_DIRS = '/path/one::/path/two';
      expect(getDatabaseBaseDirs()).toEqual(['/path/one', '/path/two']);
    });
  });

  describe('getQueryRunResultsDirs', () => {
    it('should return empty array when env var is not set', () => {
      delete process.env.CODEQL_QUERY_RUN_RESULTS_DIRS;
      expect(getQueryRunResultsDirs()).toEqual([]);
    });

    it('should return empty array when env var is empty string', () => {
      process.env.CODEQL_QUERY_RUN_RESULTS_DIRS = '';
      expect(getQueryRunResultsDirs()).toEqual([]);
    });

    it('should parse single directory', () => {
      process.env.CODEQL_QUERY_RUN_RESULTS_DIRS = '/path/to/queries';
      expect(getQueryRunResultsDirs()).toEqual(['/path/to/queries']);
    });

    it('should parse colon-separated directories', () => {
      process.env.CODEQL_QUERY_RUN_RESULTS_DIRS = '/global/queries:/workspace/queries';
      expect(getQueryRunResultsDirs()).toEqual(['/global/queries', '/workspace/queries']);
    });

    it('should trim whitespace from paths', () => {
      process.env.CODEQL_QUERY_RUN_RESULTS_DIRS = ' /path/one : /path/two ';
      expect(getQueryRunResultsDirs()).toEqual(['/path/one', '/path/two']);
    });

    it('should filter out empty segments from consecutive colons', () => {
      process.env.CODEQL_QUERY_RUN_RESULTS_DIRS = '/path/one::/path/two';
      expect(getQueryRunResultsDirs()).toEqual(['/path/one', '/path/two']);
    });
  });
});
