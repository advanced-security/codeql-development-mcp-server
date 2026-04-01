/**
 * Tests for result-processor — query result caching behavior.
 */

import { existsSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { computeQueryCacheKey } from '../../../src/lib/result-processor';
import { readDatabaseMetadata } from '../../../src/lib/database-resolver';
import { createProjectTempDir } from '../../../src/utils/temp-dir';

// We can't easily test processQueryRunResults end-to-end because it
// depends on sessionDataManager and CLI execution.  Instead we test
// the exported pure function and verify the language/queryName logic
// by testing resolveDatabaseLanguage indirectly through integration.

describe('computeQueryCacheKey', () => {
  it('should produce deterministic keys for the same inputs', () => {
    const keyA = computeQueryCacheKey({
      codeqlVersion: '2.25.0',
      databasePath: '/db',
      outputFormat: 'sarif-latest',
      queryPath: '/q.ql',
    });
    const keyB = computeQueryCacheKey({
      codeqlVersion: '2.25.0',
      databasePath: '/db',
      outputFormat: 'sarif-latest',
      queryPath: '/q.ql',
    });
    expect(keyA).toBe(keyB);
    expect(keyA).toHaveLength(16);
  });

  it('should produce different keys for different databases', () => {
    const keyA = computeQueryCacheKey({
      codeqlVersion: '2.25.0',
      databasePath: '/db1',
      outputFormat: 'sarif-latest',
      queryPath: '/q.ql',
    });
    const keyB = computeQueryCacheKey({
      codeqlVersion: '2.25.0',
      databasePath: '/db2',
      outputFormat: 'sarif-latest',
      queryPath: '/q.ql',
    });
    expect(keyA).not.toBe(keyB);
  });

  it('should produce different keys for different external predicates', () => {
    const keyA = computeQueryCacheKey({
      codeqlVersion: '2.25.0',
      databasePath: '/db',
      externalPredicates: { sourceFiles: 'a.js' },
      outputFormat: 'sarif-latest',
      queryPath: '/q.ql',
    });
    const keyB = computeQueryCacheKey({
      codeqlVersion: '2.25.0',
      databasePath: '/db',
      externalPredicates: { sourceFiles: 'b.js' },
      outputFormat: 'sarif-latest',
      queryPath: '/q.ql',
    });
    expect(keyA).not.toBe(keyB);
  });
});

/**
 * Test language resolution via readDatabaseMetadata (the shared function
 * used by result-processor for resolving language from database metadata).
 */
describe('database language resolution for caching', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = createProjectTempDir('resolve-lang-test-');
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should resolve language from codeql-database.yml', () => {
    writeFileSync(join(testDir, 'codeql-database.yml'), 'primaryLanguage: javascript\n');
    const metadata = readDatabaseMetadata(testDir);
    expect(metadata.language).toBe('javascript');
  });

  it('should return undefined language when file is missing', () => {
    const metadata = readDatabaseMetadata(testDir);
    expect(metadata.language).toBeUndefined();
  });

  it('should resolve language from codeql-database.yaml', () => {
    writeFileSync(join(testDir, 'codeql-database.yaml'), 'primaryLanguage: python\n');
    const metadata = readDatabaseMetadata(testDir);
    expect(metadata.language).toBe('python');
  });
});
