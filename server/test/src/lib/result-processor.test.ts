/**
 * Tests for result-processor — query result caching behavior.
 */

import { existsSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Module-scope mocks must be declared before importing the module under test.
const { mockExecuteCodeQLCommand, mockGetActualCodeqlVersion, spyExtractQueryMetadata } = vi.hoisted(() => ({
  mockExecuteCodeQLCommand: vi.fn(),
  mockGetActualCodeqlVersion: vi.fn(() => '2.25.0'),
  spyExtractQueryMetadata: vi.fn(),
}));
vi.mock('../../../src/lib/cli-executor', () => ({
  executeCodeQLCommand: mockExecuteCodeQLCommand,
  getActualCodeqlVersion: mockGetActualCodeqlVersion,
}));
vi.mock('../../../src/lib/query-results-evaluator', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/lib/query-results-evaluator')>();
  spyExtractQueryMetadata.mockImplementation(actual.extractQueryMetadata);
  return {
    ...actual,
    extractQueryMetadata: spyExtractQueryMetadata,
  };
});

import { computeQueryCacheKey, processQueryRunResults } from '../../../src/lib/result-processor';
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

/**
 * processQueryRunResults should infer a default output format from the query's
 * @kind metadata when the caller does not explicitly request one. This ensures
 * problem/path-problem/graph queries are interpreted (and auto-cached) without
 * forcing every caller to specify `format`.
 */
describe('processQueryRunResults format inference from @kind', () => {
  let testDir: string;
  const noopLogger = { error: () => {}, info: () => {} };

  beforeEach(() => {
    testDir = createProjectTempDir('format-infer-test-');
    mockExecuteCodeQLCommand.mockReset();
    spyExtractQueryMetadata.mockClear();
    // Default: bqrs interpret call succeeds with empty stdout.
    mockExecuteCodeQLCommand.mockResolvedValue({
      exitCode: 0, stderr: '', stdout: '', success: true,
    });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  function writeQuery(kind: string): string {
    const queryPath = join(testDir, 'q.ql');
    writeFileSync(queryPath, `/**\n * @id test/q\n * @name Test\n * @kind ${kind}\n */\nfrom int x select x\n`);
    return queryPath;
  }

  it('infers sarif-latest for @kind problem when format is not provided', async () => {
    const queryPath = writeQuery('problem');
    const bqrsPath = join(testDir, 'results.bqrs');
    writeFileSync(bqrsPath, '');

    await processQueryRunResults(
      { exitCode: 0, stderr: '', stdout: '', success: true },
      { output: bqrsPath, query: queryPath },
      noopLogger,
    );

    expect(mockExecuteCodeQLCommand).toHaveBeenCalled();
    const [subcommand, opts] = mockExecuteCodeQLCommand.mock.calls[0];
    expect(subcommand).toBe('bqrs interpret');
    expect(opts.format).toBe('sarif-latest');
  });

  it('infers sarif-latest for @kind path-problem when format is not provided', async () => {
    const queryPath = writeQuery('path-problem');
    const bqrsPath = join(testDir, 'results.bqrs');
    writeFileSync(bqrsPath, '');

    await processQueryRunResults(
      { exitCode: 0, stderr: '', stdout: '', success: true },
      { output: bqrsPath, query: queryPath },
      noopLogger,
    );

    expect(mockExecuteCodeQLCommand).toHaveBeenCalled();
    const [, opts] = mockExecuteCodeQLCommand.mock.calls[0];
    expect(opts.format).toBe('sarif-latest');
  });

  it('infers graphtext for @kind graph when format is not provided', async () => {
    const queryPath = writeQuery('graph');
    const bqrsPath = join(testDir, 'results.bqrs');
    writeFileSync(bqrsPath, '');

    await processQueryRunResults(
      { exitCode: 0, stderr: '', stdout: '', success: true },
      { output: bqrsPath, query: queryPath },
      noopLogger,
    );

    expect(mockExecuteCodeQLCommand).toHaveBeenCalled();
    const [, opts] = mockExecuteCodeQLCommand.mock.calls[0];
    expect(opts.format).toBe('graphtext');
  });

  it('does not interpret @kind table queries when format is not provided', async () => {
    const queryPath = writeQuery('table');
    const bqrsPath = join(testDir, 'results.bqrs');
    writeFileSync(bqrsPath, '');

    await processQueryRunResults(
      { exitCode: 0, stderr: '', stdout: '', success: true },
      { output: bqrsPath, query: queryPath },
      noopLogger,
    );

    expect(mockExecuteCodeQLCommand).not.toHaveBeenCalled();
  });

  it('honours an explicit format over inference', async () => {
    const queryPath = writeQuery('problem');
    const bqrsPath = join(testDir, 'results.bqrs');
    writeFileSync(bqrsPath, '');

    await processQueryRunResults(
      { exitCode: 0, stderr: '', stdout: '', success: true },
      { format: 'csv', output: bqrsPath, query: queryPath },
      noopLogger,
    );

    expect(mockExecuteCodeQLCommand).toHaveBeenCalled();
    const [, opts] = mockExecuteCodeQLCommand.mock.calls[0];
    expect(opts.format).toBe('csv');
  });

  it('extracts query metadata only once per invocation when inferring format', async () => {
    const queryPath = writeQuery('problem');
    const bqrsPath = join(testDir, 'results.bqrs');
    writeFileSync(bqrsPath, '');

    await processQueryRunResults(
      { exitCode: 0, stderr: '', stdout: '', success: true },
      { output: bqrsPath, query: queryPath },
      noopLogger,
    );

    // Should be called once (for inference) and reused by interpretBQRSFile,
    // not extracted a second time.
    expect(spyExtractQueryMetadata).toHaveBeenCalledTimes(1);
    expect(spyExtractQueryMetadata).toHaveBeenCalledWith(queryPath);
  });

  it('extracts query metadata only once per invocation when format is explicit', async () => {
    const queryPath = writeQuery('problem');
    const bqrsPath = join(testDir, 'results.bqrs');
    writeFileSync(bqrsPath, '');

    await processQueryRunResults(
      { exitCode: 0, stderr: '', stdout: '', success: true },
      { format: 'sarif-latest', output: bqrsPath, query: queryPath },
      noopLogger,
    );

    // Even with an explicit format we still need metadata for id/kind in
    // bqrs interpret, but it should only be extracted once.
    expect(spyExtractQueryMetadata).toHaveBeenCalledTimes(1);
  });
});
