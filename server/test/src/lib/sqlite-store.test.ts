/**
 * Tests for SqliteStore — the unified sql.js persistence backend.
 */

import { existsSync, rmSync } from 'fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SqliteStore } from '../../../src/lib/sqlite-store';
import { createProjectTempDir } from '../../../src/utils/temp-dir';

describe('SqliteStore', () => {
  let store: SqliteStore;
  let testDir: string;

  beforeEach(async () => {
    testDir = createProjectTempDir('sqlite-store-test-');
    store = new SqliteStore(testDir);
    await store.initialize();
  });

  afterEach(() => {
    store.close();
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Session Storage', () => {
    it('should store and retrieve a session', () => {
      const sessionData = { sessionId: 'test-1', status: 'active', queryPath: '/test.ql' };
      store.putSession('test-1', sessionData);

      const retrieved = store.getSession('test-1') as Record<string, unknown>;
      expect(retrieved).toBeDefined();
      expect(retrieved.sessionId).toBe('test-1');
      expect(retrieved.status).toBe('active');
    });

    it('should return null for non-existent session', () => {
      expect(store.getSession('missing')).toBeNull();
    });

    it('should overwrite existing session on put', () => {
      store.putSession('test-1', { status: 'active' });
      store.putSession('test-1', { status: 'completed' });

      const retrieved = store.getSession('test-1') as Record<string, unknown>;
      expect(retrieved.status).toBe('completed');
    });

    it('should list all sessions', () => {
      store.putSession('a', { id: 'a' });
      store.putSession('b', { id: 'b' });
      store.putSession('c', { id: 'c' });

      const all = store.getAllSessions();
      expect(all).toHaveLength(3);
    });

    it('should delete a session', () => {
      store.putSession('test-1', { id: 'test-1' });
      store.deleteSession('test-1');

      expect(store.getSession('test-1')).toBeNull();
      expect(store.countSessions()).toBe(0);
    });

    it('should count sessions', () => {
      expect(store.countSessions()).toBe(0);
      store.putSession('a', {});
      store.putSession('b', {});
      expect(store.countSessions()).toBe(2);
    });
  });

  describe('Annotation Storage', () => {
    it('should create and retrieve an annotation', () => {
      const id = store.createAnnotation('note', 'file:/test.ql:L5', 'Test note', 'label1', '{"key":"val"}');
      expect(id).toBeGreaterThan(0);

      const annotation = store.getAnnotation(id);
      expect(annotation).toBeDefined();
      expect(annotation!.category).toBe('note');
      expect(annotation!.entity_key).toBe('file:/test.ql:L5');
      expect(annotation!.content).toBe('Test note');
      expect(annotation!.label).toBe('label1');
      expect(annotation!.metadata).toBe('{"key":"val"}');
    });

    it('should return null for non-existent annotation', () => {
      expect(store.getAnnotation(9999)).toBeNull();
    });

    it('should list annotations by category', () => {
      store.createAnnotation('note', 'a', 'note 1');
      store.createAnnotation('bookmark', 'b', 'bm 1');
      store.createAnnotation('note', 'c', 'note 2');

      const notes = store.listAnnotations({ category: 'note' });
      expect(notes).toHaveLength(2);
      expect(notes.every(a => a.category === 'note')).toBe(true);
    });

    it('should list annotations by entity key prefix', () => {
      store.createAnnotation('note', 'repo:owner/foo:file.ql:L1', 'a');
      store.createAnnotation('note', 'repo:owner/foo:file.ql:L20', 'b');
      store.createAnnotation('note', 'repo:owner/bar:other.ql:L1', 'c');

      const results = store.listAnnotations({ entityKeyPrefix: 'repo:owner/foo' });
      expect(results).toHaveLength(2);
    });

    it('should list annotations by exact entity key', () => {
      store.createAnnotation('note', 'exact-key', 'yes');
      store.createAnnotation('note', 'exact-key-longer', 'no');

      const results = store.listAnnotations({ entityKey: 'exact-key' });
      expect(results).toHaveLength(1);
      expect(results[0].content).toBe('yes');
    });

    it('should search annotations by content', () => {
      store.createAnnotation('note', 'a', 'Found a vulnerability in auth');
      store.createAnnotation('note', 'b', 'No issues here');
      store.createAnnotation('note', 'c', null, null, '{"detail":"vulnerability in parser"}');

      const results = store.listAnnotations({ search: 'vulnerability' });
      expect(results).toHaveLength(2);
    });

    it('should support limit and offset', () => {
      for (let i = 0; i < 10; i++) {
        store.createAnnotation('note', `key-${i}`, `content ${i}`);
      }

      const page1 = store.listAnnotations({ limit: 3 });
      expect(page1).toHaveLength(3);

      const page2 = store.listAnnotations({ limit: 3, offset: 3 });
      expect(page2).toHaveLength(3);
      expect(page2[0].id).not.toBe(page1[0].id);
    });

    it('should update an annotation', () => {
      const id = store.createAnnotation('note', 'key', 'old content', 'old label');

      const updated = store.updateAnnotation(id, { content: 'new content', label: 'new label' });
      expect(updated).toBe(true);

      const annotation = store.getAnnotation(id);
      expect(annotation!.content).toBe('new content');
      expect(annotation!.label).toBe('new label');
    });

    it('should return false when updating non-existent annotation', () => {
      const updated = store.updateAnnotation(9999, { content: 'test' });
      expect(updated).toBe(false);
    });

    it('should delete by id', () => {
      const id = store.createAnnotation('note', 'key', 'content');
      const deleted = store.deleteAnnotations({ id });
      expect(deleted).toBe(1);
      expect(store.getAnnotation(id)).toBeNull();
    });

    it('should delete by category', () => {
      store.createAnnotation('temp', 'a', 'a');
      store.createAnnotation('temp', 'b', 'b');
      store.createAnnotation('keep', 'c', 'c');

      const deleted = store.deleteAnnotations({ category: 'temp' });
      expect(deleted).toBe(2);
      expect(store.listAnnotations({ category: 'keep' })).toHaveLength(1);
    });

    it('should delete by entity key prefix', () => {
      store.createAnnotation('audit', 'repo:owner/foo:f1:L1', 'a');
      store.createAnnotation('audit', 'repo:owner/foo:f2:L5', 'b');
      store.createAnnotation('audit', 'repo:owner/bar:f1:L1', 'c');

      const deleted = store.deleteAnnotations({ entityKeyPrefix: 'repo:owner/foo' });
      expect(deleted).toBe(2);
    });

    it('should throw when deleting without a filter', () => {
      expect(() => store.deleteAnnotations({})).toThrow('at least one filter');
    });
  });

  describe('Persistence', () => {
    it('should persist data across close/reopen', async () => {
      store.putSession('persist-test', { val: 42 });
      store.createAnnotation('note', 'persist-key', 'persist-content');
      store.close();

      const store2 = new SqliteStore(testDir);
      await store2.initialize();

      const session = store2.getSession('persist-test') as Record<string, unknown>;
      expect(session.val).toBe(42);

      const annotations = store2.listAnnotations({ entityKey: 'persist-key' });
      expect(annotations).toHaveLength(1);
      expect(annotations[0].content).toBe('persist-content');

      store2.close();
    });
  });

  describe('Query Result Cache', () => {
    it('should store and retrieve a cache entry', () => {
      store.putCacheEntry({
        cacheKey: 'abc123',
        queryName: 'PrintAST',
        queryPath: '/path/to/PrintAST.ql',
        databasePath: '/path/to/db',
        language: 'cpp',
        codeqlVersion: '2.25.0',
        outputFormat: 'graphtext',
        resultContent: 'node1\n  edge1\nnode2\n  edge2\n',
        resultCount: 2,
      });

      const meta = store.getCacheEntryMeta('abc123');
      expect(meta).not.toBeNull();
      expect(meta!.queryName).toBe('PrintAST');
      expect(meta!.language).toBe('cpp');
      expect(meta!.resultCount).toBe(2);

      const content = store.getCacheContent('abc123');
      expect(content).toBe('node1\n  edge1\nnode2\n  edge2\n');
    });

    it('should return null for non-existent cache key', () => {
      expect(store.getCacheEntryMeta('missing')).toBeNull();
      expect(store.getCacheContent('missing')).toBeNull();
    });

    it('should overwrite existing cache entry with same key', () => {
      store.putCacheEntry({
        cacheKey: 'dup',
        queryName: 'Q',
        queryPath: '/q.ql',
        databasePath: '/db',
        language: 'java',
        codeqlVersion: '2.25.0',
        outputFormat: 'csv',
        resultContent: 'old',
      });
      store.putCacheEntry({
        cacheKey: 'dup',
        queryName: 'Q',
        queryPath: '/q.ql',
        databasePath: '/db',
        language: 'java',
        codeqlVersion: '2.25.0',
        outputFormat: 'csv',
        resultContent: 'new',
      });
      expect(store.getCacheContent('dup')).toBe('new');
    });

    it('should retrieve subset by line range', () => {
      store.putCacheEntry({
        cacheKey: 'lines',
        queryName: 'PrintCFG',
        queryPath: '/p.ql',
        databasePath: '/db',
        language: 'cpp',
        codeqlVersion: '2.25.0',
        outputFormat: 'graphtext',
        resultContent: 'line1\nline2\nline3\nline4\nline5\n',
      });

      const subset = store.getCacheContentSubset('lines', { lineRange: [2, 4] });
      expect(subset).not.toBeNull();
      expect(subset!.returnedLines).toBe(3);
      expect(subset!.content).toBe('line2\nline3\nline4');
      expect(subset!.totalLines).toBe(6); // 5 lines + trailing newline
    });

    it('should retrieve subset by grep', () => {
      store.putCacheEntry({
        cacheKey: 'grep',
        queryName: 'PrintAST',
        queryPath: '/p.ql',
        databasePath: '/db',
        language: 'cpp',
        codeqlVersion: '2.25.0',
        outputFormat: 'graphtext',
        resultContent: 'Function foo\n  Param x\nFunction bar\n  Param y\n',
      });

      const subset = store.getCacheContentSubset('grep', { grep: 'Function' });
      expect(subset).not.toBeNull();
      expect(subset!.returnedLines).toBe(2);
      expect(subset!.content).toContain('Function foo');
      expect(subset!.content).toContain('Function bar');
    });

    it('should enforce maxLines cap', () => {
      const lines = Array.from({ length: 100 }, (_, i) => `line${i}`).join('\n');
      store.putCacheEntry({
        cacheKey: 'big',
        queryName: 'Q',
        queryPath: '/q.ql',
        databasePath: '/db',
        language: 'python',
        codeqlVersion: '2.25.0',
        outputFormat: 'csv',
        resultContent: lines,
      });

      const subset = store.getCacheContentSubset('big', { maxLines: 10 });
      expect(subset!.returnedLines).toBe(10);
      expect(subset!.truncated).toBe(true);
    });

    it('should retrieve SARIF subset by resultIndices', () => {
      const sarif = {
        version: '2.1.0',
        runs: [{
          tool: { driver: { name: 'codeql' } },
          results: [
            { ruleId: 'r1', message: { text: 'msg1' }, locations: [] },
            { ruleId: 'r2', message: { text: 'msg2' }, locations: [] },
            { ruleId: 'r3', message: { text: 'msg3' }, locations: [] },
          ],
        }],
      };
      store.putCacheEntry({
        cacheKey: 'sarif1',
        queryName: 'Q',
        queryPath: '/q.ql',
        databasePath: '/db',
        language: 'javascript',
        codeqlVersion: '2.25.0',
        outputFormat: 'sarif-latest',
        resultContent: JSON.stringify(sarif),
        resultCount: 3,
      });

      // resultIndices is inclusive: [0, 1] returns indices 0 and 1 (2 results)
      const subset = store.getCacheSarifSubset('sarif1', { resultIndices: [0, 1] });
      expect(subset).not.toBeNull();
      expect(subset!.totalResults).toBe(3);
      expect(subset!.returnedResults).toBe(2);
      const parsed = JSON.parse(subset!.content);
      expect(parsed.runs[0].results).toHaveLength(2);
    });

    it('should retrieve SARIF subset by fileFilter', () => {
      const sarif = {
        version: '2.1.0',
        runs: [{
          tool: { driver: { name: 'codeql' } },
          results: [
            { ruleId: 'r1', message: { text: 'in handler' }, locations: [{ physicalLocation: { artifactLocation: { uri: 'src/handler.ts' } } }] },
            { ruleId: 'r2', message: { text: 'in db' }, locations: [{ physicalLocation: { artifactLocation: { uri: 'src/db.ts' } } }] },
            { ruleId: 'r3', message: { text: 'in handler too' }, locations: [{ physicalLocation: { artifactLocation: { uri: 'src/handler.ts' } } }] },
          ],
        }],
      };
      store.putCacheEntry({
        cacheKey: 'sarif2',
        queryName: 'Q',
        queryPath: '/q.ql',
        databasePath: '/db',
        language: 'javascript',
        codeqlVersion: '2.25.0',
        outputFormat: 'sarif-latest',
        resultContent: JSON.stringify(sarif),
        resultCount: 3,
      });

      const subset = store.getCacheSarifSubset('sarif2', { fileFilter: 'handler.ts' });
      expect(subset).not.toBeNull();
      expect(subset!.returnedResults).toBe(2);
    });

    it('should list cache entries with filters', () => {
      store.putCacheEntry({
        cacheKey: 'a', queryName: 'PrintAST', queryPath: '/a.ql',
        databasePath: '/db1', language: 'cpp', codeqlVersion: '2.25.0',
        outputFormat: 'graphtext', resultContent: 'a',
      });
      store.putCacheEntry({
        cacheKey: 'b', queryName: 'CallGraphFrom', queryPath: '/b.ql',
        databasePath: '/db1', language: 'cpp', codeqlVersion: '2.25.0',
        outputFormat: 'sarif-latest', resultContent: 'b',
      });
      store.putCacheEntry({
        cacheKey: 'c', queryName: 'PrintAST', queryPath: '/c.ql',
        databasePath: '/db2', language: 'java', codeqlVersion: '2.25.0',
        outputFormat: 'graphtext', resultContent: 'c',
      });

      expect(store.listCacheEntries({ queryName: 'PrintAST' })).toHaveLength(2);
      expect(store.listCacheEntries({ databasePath: '/db1' })).toHaveLength(2);
      expect(store.listCacheEntries({ language: 'java' })).toHaveLength(1);
    });

    it('should clear cache entries by filter', () => {
      store.putCacheEntry({
        cacheKey: 'x', queryName: 'Q', queryPath: '/q.ql',
        databasePath: '/db1', language: 'cpp', codeqlVersion: '2.25.0',
        outputFormat: 'csv', resultContent: 'x',
      });
      store.putCacheEntry({
        cacheKey: 'y', queryName: 'Q', queryPath: '/q.ql',
        databasePath: '/db2', language: 'cpp', codeqlVersion: '2.25.0',
        outputFormat: 'csv', resultContent: 'y',
      });

      const cleared = store.clearCacheEntries({ databasePath: '/db1' });
      expect(cleared).toBe(1);
      expect(store.listCacheEntries()).toHaveLength(1);
    });

    it('should clear all cache entries', () => {
      store.putCacheEntry({
        cacheKey: 'p', queryName: 'Q', queryPath: '/q.ql',
        databasePath: '/db', language: 'cpp', codeqlVersion: '2.25.0',
        outputFormat: 'csv', resultContent: 'p',
      });
      store.putCacheEntry({
        cacheKey: 'q', queryName: 'Q', queryPath: '/q.ql',
        databasePath: '/db', language: 'cpp', codeqlVersion: '2.25.0',
        outputFormat: 'csv', resultContent: 'q',
      });

      const cleared = store.clearCacheEntries({ all: true });
      expect(cleared).toBe(2);
      expect(store.listCacheEntries()).toHaveLength(0);
    });
  });
});
