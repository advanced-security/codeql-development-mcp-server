/**
 * Tests for list_query_run_results tool
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createTestTempDir, cleanupTestTempDir } from '../../../utils/temp-dir';
import {
  discoverQueryRunResults,
  QueryRunResult,
} from '../../../../src/tools/codeql/list-query-run-results';

describe('list_query_run_results', () => {
  let testDir: string;

  beforeEach(() => {
    testDir = createTestTempDir('list-query-run-results');
  });

  afterEach(() => {
    cleanupTestTempDir(testDir);
  });

  describe('discoverQueryRunResults', () => {
    it('should return empty array when no result dirs are provided', async () => {
      const result = await discoverQueryRunResults([]);
      expect(result).toEqual([]);
    });

    it('should return empty array when result dir does not exist', async () => {
      const result = await discoverQueryRunResults([join(testDir, 'nonexistent')]);
      expect(result).toEqual([]);
    });

    it('should discover a query run result directory with artifacts', async () => {
      // Arrange: create a fake vscode-codeql query run directory
      const runDir = join(testDir, 'UI5Xss.ql-abc123');
      mkdirSync(runDir, { recursive: true });
      writeFileSync(join(runDir, 'evaluator-log.jsonl'), '{}');
      writeFileSync(join(runDir, 'results.bqrs'), '');
      writeFileSync(join(runDir, 'results-interpreted.sarif'), '{}');
      writeFileSync(join(runDir, 'timestamp'), '2026-02-16T20:00:00Z');

      // Act
      const result = await discoverQueryRunResults([testDir]);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].queryName).toBe('UI5Xss.ql');
      expect(result[0].runId).toBe('abc123');
      expect(result[0].hasEvaluatorLog).toBe(true);
      expect(result[0].hasBqrs).toBe(true);
      expect(result[0].hasSarif).toBe(true);
    });

    it('should discover run with partial artifacts', async () => {
      // Arrange: run dir with only query.log and timestamp
      const runDir = join(testDir, 'MyQuery.ql-xyz789');
      mkdirSync(runDir, { recursive: true });
      writeFileSync(join(runDir, 'query.log'), 'log content');
      writeFileSync(join(runDir, 'timestamp'), '2026-01-01T00:00:00Z');

      // Act
      const result = await discoverQueryRunResults([testDir]);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].queryName).toBe('MyQuery.ql');
      expect(result[0].hasEvaluatorLog).toBe(false);
      expect(result[0].hasBqrs).toBe(false);
      expect(result[0].hasSarif).toBe(false);
    });

    it('should discover multiple runs across multiple dirs', async () => {
      // Arrange
      const dir1 = join(testDir, 'dir1');
      const dir2 = join(testDir, 'dir2');
      const run1 = join(dir1, 'A.ql-111');
      const run2 = join(dir2, 'B.ql-222');
      for (const d of [run1, run2]) {
        mkdirSync(d, { recursive: true });
        writeFileSync(join(d, 'timestamp'), 'x');
      }

      // Act
      const result = await discoverQueryRunResults([dir1, dir2]);

      // Assert
      expect(result).toHaveLength(2);
    });

    it('should filter by query name', async () => {
      // Arrange
      for (const name of ['UI5Xss.ql-aaa', 'LogInjection.ql-bbb', 'UI5Xss.ql-ccc']) {
        const runDir = join(testDir, name);
        mkdirSync(runDir, { recursive: true });
        writeFileSync(join(runDir, 'timestamp'), 'x');
      }

      // Act
      const result = await discoverQueryRunResults([testDir], 'UI5Xss.ql');

      // Assert
      expect(result).toHaveLength(2);
      expect(result.every((r: QueryRunResult) => r.queryName === 'UI5Xss.ql')).toBe(true);
    });

    it('should skip directories that do not match query run naming pattern', async () => {
      // Arrange: directory without the <name>-<id> pattern
      const notARun = join(testDir, 'random-directory');
      mkdirSync(notARun, { recursive: true });
      writeFileSync(join(notARun, 'some-file.txt'), '');

      const realRun = join(testDir, 'Test.ql-abc');
      mkdirSync(realRun, { recursive: true });
      writeFileSync(join(realRun, 'timestamp'), 'x');

      // Act
      const result = await discoverQueryRunResults([testDir]);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].queryName).toBe('Test.ql');
    });

    it('should read timestamp from timestamp file', async () => {
      // Arrange
      const runDir = join(testDir, 'Q.ql-ts1');
      mkdirSync(runDir, { recursive: true });
      writeFileSync(join(runDir, 'timestamp'), '2026-02-16T15:30:00.000Z');

      // Act
      const result = await discoverQueryRunResults([testDir]);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].timestamp).toBe('2026-02-16T15:30:00.000Z');
    });
  });
});
