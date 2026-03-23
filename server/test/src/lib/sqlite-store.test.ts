/**
 * Tests for SqliteStore — the unified sql.js persistence backend.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SqliteStore } from '../../../src/lib/sqlite-store';
import { existsSync, rmSync } from 'fs';

describe('SqliteStore', () => {
  let store: SqliteStore;
  const testDir = '.ql-mcp-sqlite-test';

  beforeEach(async () => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
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
});
