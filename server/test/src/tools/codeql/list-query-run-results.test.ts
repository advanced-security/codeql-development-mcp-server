/**
 * Tests for list_query_run_results tool
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createTestTempDir, cleanupTestTempDir } from '../../../utils/temp-dir';
import {
  discoverQueryRunResults,
  parseQueryLogMetadata,
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
      const result = await discoverQueryRunResults([testDir], { queryName: 'UI5Xss.ql' });

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

    it('should extract queryPath and databasePath from query.log', async () => {
      // Arrange: create a run directory with a realistic query.log
      const runDir = join(testDir, 'UI5Xss.ql-meta1');
      mkdirSync(runDir, { recursive: true });
      writeFileSync(join(runDir, 'timestamp'), '2026-02-18T10:00:00Z');
      writeFileSync(
        join(runDir, 'query.log'),
        [
          '[2026-02-15 12:52:37] [SPAMMY] execute query-server2> runQuery called with /path/to/src/UI5Xss/UI5Xss.ql',
          '[2026-02-15 12:52:40] Calling plumbing command: codeql resolve upgrades --dbscheme=/path/to/databases/my-db/db-javascript/semmlecode.javascript.dbscheme --format=json',
        ].join('\n'),
      );

      // Act
      const result = await discoverQueryRunResults([testDir]);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].queryPath).toBe('/path/to/src/UI5Xss/UI5Xss.ql');
      expect(result[0].databasePath).toBe('/path/to/databases/my-db');
      expect(result[0].language).toBe('javascript');
    });

    it('should filter by language when query.log provides it', async () => {
      // Arrange: create runs with different languages
      const jsRun = join(testDir, 'XssQuery.ql-js1');
      mkdirSync(jsRun, { recursive: true });
      writeFileSync(join(jsRun, 'timestamp'), 'x');
      writeFileSync(
        join(jsRun, 'query.log'),
        '[2026-02-15 12:52:40] Calling plumbing command: codeql resolve upgrades --dbscheme=/dbs/my-js-db/db-javascript/semmlecode.javascript.dbscheme --format=json\n',
      );

      const pyRun = join(testDir, 'SqlInjection.ql-py1');
      mkdirSync(pyRun, { recursive: true });
      writeFileSync(join(pyRun, 'timestamp'), 'x');
      writeFileSync(
        join(pyRun, 'query.log'),
        '[2026-02-15 12:52:40] Calling plumbing command: codeql resolve upgrades --dbscheme=/dbs/my-py-db/db-python/semmlecode.python.dbscheme --format=json\n',
      );

      const noLogRun = join(testDir, 'Other.ql-nolog');
      mkdirSync(noLogRun, { recursive: true });
      writeFileSync(join(noLogRun, 'timestamp'), 'x');

      // Act: filter by javascript language
      const jsResults = await discoverQueryRunResults([testDir], { language: 'javascript' });

      // Assert: only the javascript run matches
      expect(jsResults).toHaveLength(1);
      expect(jsResults[0].queryName).toBe('XssQuery.ql');
      expect(jsResults[0].language).toBe('javascript');
    });

    it('should filter by queryPath substring', async () => {
      // Arrange: create runs with query.log containing different query paths
      const run1 = join(testDir, 'UI5Xss.ql-qp1');
      mkdirSync(run1, { recursive: true });
      writeFileSync(join(run1, 'timestamp'), 'x');
      writeFileSync(
        join(run1, 'query.log'),
        '[2026-02-15 12:52:37] [SPAMMY] execute query-server2> runQuery called with /repo/javascript/frameworks/ui5/src/UI5Xss/UI5Xss.ql\n',
      );

      const run2 = join(testDir, 'LogInjection.ql-qp2');
      mkdirSync(run2, { recursive: true });
      writeFileSync(join(run2, 'timestamp'), 'x');
      writeFileSync(
        join(run2, 'query.log'),
        '[2026-02-15 12:52:37] [SPAMMY] execute query-server2> runQuery called with /repo/javascript/frameworks/cap/src/LogInjection/LogInjection.ql\n',
      );

      // Act: filter by queryPath containing "ui5"
      const results = await discoverQueryRunResults([testDir], { queryPath: 'ui5' });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].queryName).toBe('UI5Xss.ql');
      expect(results[0].queryPath).toBe('/repo/javascript/frameworks/ui5/src/UI5Xss/UI5Xss.ql');
    });

    it('should filter by exact queryPath', async () => {
      // Arrange
      const run1 = join(testDir, 'UI5Xss.ql-exact1');
      mkdirSync(run1, { recursive: true });
      writeFileSync(join(run1, 'timestamp'), 'x');
      writeFileSync(
        join(run1, 'query.log'),
        '[2026-02-15 12:52:37] [SPAMMY] execute query-server2> runQuery called with /repo/src/UI5Xss/UI5Xss.ql\n',
      );

      // Act: filter by exact query path
      const results = await discoverQueryRunResults([testDir], {
        queryPath: '/repo/src/UI5Xss/UI5Xss.ql',
      });

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].queryPath).toBe('/repo/src/UI5Xss/UI5Xss.ql');
    });

    it('should combine queryName and language filters', async () => {
      // Arrange: create multiple runs
      const jsXss = join(testDir, 'Xss.ql-combo1');
      mkdirSync(jsXss, { recursive: true });
      writeFileSync(join(jsXss, 'timestamp'), 'x');
      writeFileSync(
        join(jsXss, 'query.log'),
        '[ts] --dbscheme=/dbs/jsdb/db-javascript/semmlecode.javascript.dbscheme\n',
      );

      const pyXss = join(testDir, 'Xss.ql-combo2');
      mkdirSync(pyXss, { recursive: true });
      writeFileSync(join(pyXss, 'timestamp'), 'x');
      writeFileSync(
        join(pyXss, 'query.log'),
        '[ts] --dbscheme=/dbs/pydb/db-python/semmlecode.python.dbscheme\n',
      );

      const jsLog = join(testDir, 'LogInjection.ql-combo3');
      mkdirSync(jsLog, { recursive: true });
      writeFileSync(join(jsLog, 'timestamp'), 'x');
      writeFileSync(
        join(jsLog, 'query.log'),
        '[ts] --dbscheme=/dbs/jsdb2/db-javascript/semmlecode.javascript.dbscheme\n',
      );

      // Act: filter by both queryName=Xss.ql and language=javascript
      const results = await discoverQueryRunResults([testDir], {
        queryName: 'Xss.ql',
        language: 'javascript',
      });

      // Assert: only the JS Xss run matches
      expect(results).toHaveLength(1);
      expect(results[0].queryName).toBe('Xss.ql');
      expect(results[0].language).toBe('javascript');
    });

    it('should return runs without metadata when query.log is absent and no filter applied', async () => {
      // Arrange: run dir without query.log
      const runDir = join(testDir, 'NoLog.ql-nolog1');
      mkdirSync(runDir, { recursive: true });
      writeFileSync(join(runDir, 'timestamp'), '2026-02-18T00:00:00Z');

      // Act: no filters
      const results = await discoverQueryRunResults([testDir]);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].queryPath).toBeUndefined();
      expect(results[0].databasePath).toBeUndefined();
      expect(results[0].language).toBeUndefined();
    });

    it('should exclude runs without metadata when language filter is applied', async () => {
      // Arrange: run without query.log
      const runDir = join(testDir, 'NoLog.ql-excl1');
      mkdirSync(runDir, { recursive: true });
      writeFileSync(join(runDir, 'timestamp'), 'x');

      // Act: filter by language excludes runs where language is unknown
      const results = await discoverQueryRunResults([testDir], { language: 'javascript' });

      // Assert
      expect(results).toHaveLength(0);
    });

    it('should detect hasQueryLog and hasSummaryLog artifacts', async () => {
      // Arrange: run with query.log and summary log
      const runDir = join(testDir, 'Full.ql-artif1');
      mkdirSync(runDir, { recursive: true });
      writeFileSync(join(runDir, 'timestamp'), 'x');
      writeFileSync(join(runDir, 'query.log'), 'log content');
      writeFileSync(join(runDir, 'evaluator-log.summary.jsonl'), '{}');
      writeFileSync(join(runDir, 'evaluator-log.jsonl'), '{}');
      writeFileSync(join(runDir, 'results.bqrs'), '');

      // Act
      const results = await discoverQueryRunResults([testDir]);

      // Assert
      expect(results).toHaveLength(1);
      expect(results[0].hasQueryLog).toBe(true);
      expect(results[0].hasSummaryLog).toBe(true);
      expect(results[0].hasEvaluatorLog).toBe(true);
      expect(results[0].hasBqrs).toBe(true);
    });
  });

  describe('parseQueryLogMetadata', () => {
    it('should extract query path from runQuery line', () => {
      // Arrange
      const logContent = [
        '[2026-02-15 12:52:37] [SPAMMY] execute query-server2> runQuery called with /path/to/Query.ql',
        '[2026-02-15 12:52:38] some other log line',
      ].join('\n');

      // Act
      const metadata = parseQueryLogMetadata(logContent);

      // Assert
      expect(metadata.queryPath).toBe('/path/to/Query.ql');
    });

    it('should extract database path and language from dbscheme line', () => {
      // Arrange
      const logContent =
        '[2026-02-15 12:52:40] Calling plumbing command: codeql resolve upgrades --dbscheme=/databases/my-db/db-javascript/semmlecode.javascript.dbscheme --format=json\n';

      // Act
      const metadata = parseQueryLogMetadata(logContent);

      // Assert
      expect(metadata.databasePath).toBe('/databases/my-db');
      expect(metadata.language).toBe('javascript');
    });

    it('should extract python language from dbscheme path', () => {
      // Arrange
      const logContent =
        '[ts] --dbscheme=/dbs/pydb/db-python/semmlecode.python.dbscheme\n';

      // Act
      const metadata = parseQueryLogMetadata(logContent);

      // Assert
      expect(metadata.language).toBe('python');
      expect(metadata.databasePath).toBe('/dbs/pydb');
    });

    it('should extract java language from dbscheme path', () => {
      // Arrange
      const logContent =
        '[ts] --dbscheme=/dbs/javadb/db-java/semmlecode.dbscheme\n';

      // Act
      const metadata = parseQueryLogMetadata(logContent);

      // Assert
      expect(metadata.language).toBe('java');
      expect(metadata.databasePath).toBe('/dbs/javadb');
    });

    it('should return empty metadata when log has no relevant lines', () => {
      // Arrange
      const logContent = 'some irrelevant log line\nanother line\n';

      // Act
      const metadata = parseQueryLogMetadata(logContent);

      // Assert
      expect(metadata.queryPath).toBeUndefined();
      expect(metadata.databasePath).toBeUndefined();
      expect(metadata.language).toBeUndefined();
    });

    it('should handle empty log content', () => {
      // Act
      const metadata = parseQueryLogMetadata('');

      // Assert
      expect(metadata.queryPath).toBeUndefined();
      expect(metadata.databasePath).toBeUndefined();
      expect(metadata.language).toBeUndefined();
    });

    it('should extract language from semmlecode filename when db-<lang> path is absent', () => {
      // Arrange: QL pack dbscheme path without db-<language>/ segment
      // This occurs when query.log only has the "Found dbscheme through QL packs" line
      const logContent = [
        '[2026-02-15 12:58:31] [DETAILS] resolve library-path> Found dbscheme through QL packs: /Users/me/.codeql/packages/codeql/javascript-all/2.6.20/semmlecode.javascript.dbscheme.',
        '  "dbscheme" : "/Users/me/.codeql/packages/codeql/javascript-all/2.6.20/semmlecode.javascript.dbscheme",',
      ].join('\n');

      // Act
      const metadata = parseQueryLogMetadata(logContent);

      // Assert
      expect(metadata.language).toBe('javascript');
      // No database path since there's no db-<lang>/ segment
      expect(metadata.databasePath).toBeUndefined();
    });

    it('should extract language from codeql/<lang>-all/ QL pack path as last resort', () => {
      // Arrange: dbscheme reference only via QL pack path, no semmlecode.<lang>.dbscheme
      const logContent =
        '[ts] "dbscheme" : "/home/user/.codeql/packages/codeql/python-all/1.2.3/semmlecode.dbscheme"\n';

      // Act
      const metadata = parseQueryLogMetadata(logContent);

      // Assert
      expect(metadata.language).toBe('python');
    });

    it('should prefer db-<lang> path over fallback patterns', () => {
      // Arrange: log has both db-<lang> path AND QL pack path
      const logContent = [
        '[ts] --dbscheme=/dbs/mydb/db-javascript/semmlecode.javascript.dbscheme',
        '[ts] "dbscheme" : "/home/user/.codeql/packages/codeql/javascript-all/2.6.20/semmlecode.javascript.dbscheme"',
      ].join('\n');

      // Act
      const metadata = parseQueryLogMetadata(logContent);

      // Assert
      expect(metadata.language).toBe('javascript');
      expect(metadata.databasePath).toBe('/dbs/mydb');
    });
  });
});