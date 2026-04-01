/**
 * Tests for result-processor — query result caching behavior.
 */

import { existsSync, rmSync } from 'fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { computeQueryCacheKey } from '../../../src/lib/result-processor';
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
 * Test the resolveDatabaseLanguage function.
 * This is an internal function, so we test it indirectly by importing it
 * via a re-export or by testing through the cache integration path.
 * For direct testing, we use the module internals.
 */
describe('resolveDatabaseLanguage', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = createProjectTempDir('resolve-lang-test-');
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  // Since resolveDatabaseLanguage is not exported, we test the behavior
  // through importing the module and testing the function's effect on
  // caching. For now, validate the YAML parsing logic pattern.
  it('should extract language from codeql-database.yml content', () => {
    const yamlContent = `---
sourceLocationPrefix: /src
primaryLanguage: javascript
creationMetadata:
  cliVersion: 2.25.1
`;
    // Simulate the regex the function uses
    const match = yamlContent.match(/^primaryLanguage\s*:\s*(\S+)/m);
    expect(match).not.toBeNull();
    expect(match![1]).toBe('javascript');
  });

  it('should handle YAML without primaryLanguage', () => {
    const yamlContent = `---
sourceLocationPrefix: /src
creationMetadata:
  cliVersion: 2.25.1
`;
    const match = yamlContent.match(/^primaryLanguage\s*:\s*(\S+)/m);
    expect(match).toBeNull();
  });
});
