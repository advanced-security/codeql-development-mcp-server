/**
 * Tests for search-ql-code tool
 */

import { afterEach, describe, expect, it } from 'vitest';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { searchQlCode } from '../../../../src/tools/codeql/search-ql-code';
import { cleanupTestTempDir, createTestTempDir } from '../../../utils/temp-dir';

let tempDir: string;

afterEach(() => {
  if (tempDir) {
    cleanupTestTempDir(tempDir);
  }
});

/**
 * Helper to create a temp directory with QL files for testing.
 */
function setupTestFiles(files: Record<string, string>): string {
  tempDir = createTestTempDir('search-ql-code');
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(tempDir, name), content, 'utf-8');
  }
  return tempDir;
}

describe('searchQlCode', () => {
  describe('basic text search', () => {
    it('should find a simple text match', async () => {
      const dir = setupTestFiles({
        'Example.qll': 'class RemoteFlowSource extends DataFlow::Node {\n  // body\n}'
      });

      const result = await searchQlCode({ pattern: 'RemoteFlowSource', paths: [dir] });

      expect(result.totalMatches).toBe(1);
      expect(result.results).toHaveLength(1);
      expect(result.results[0].lineNumber).toBe(1);
      expect(result.results[0].lineContent).toContain('RemoteFlowSource');
      expect(result.results[0].filePath).toContain('Example.qll');
      expect(result.truncated).toBe(false);
    });

    it('should find multiple matches across files', async () => {
      const dir = setupTestFiles({
        'A.qll': 'predicate isSource() { any() }\n',
        'B.qll': 'predicate isSink() { any() }\npredicate isSource() { none() }\n'
      });

      const result = await searchQlCode({ pattern: 'isSource', paths: [dir] });

      expect(result.totalMatches).toBe(2);
      expect(result.results).toHaveLength(2);
    });

    it('should return zero results for non-matching pattern', async () => {
      const dir = setupTestFiles({
        'Test.ql': 'import javascript\nselect 1\n'
      });

      const result = await searchQlCode({ pattern: 'NonExistentPattern', paths: [dir] });

      expect(result.totalMatches).toBe(0);
      expect(result.results).toHaveLength(0);
      expect(result.truncated).toBe(false);
    });
  });

  describe('regex search', () => {
    it('should support regex patterns', async () => {
      const dir = setupTestFiles({
        'Test.qll': 'class FooSource extends Node {}\nclass BarSource extends Node {}\nclass BazSink extends Node {}\n'
      });

      const result = await searchQlCode({ pattern: '\\bclass\\s+\\w+Source\\b', paths: [dir] });

      expect(result.totalMatches).toBe(2);
      expect(result.results[0].lineContent).toContain('FooSource');
      expect(result.results[1].lineContent).toContain('BarSource');
    });
  });

  describe('case sensitivity', () => {
    it('should be case sensitive by default', async () => {
      const dir = setupTestFiles({
        'Test.qll': 'class RemoteFlowSource {}\nclass remoteflowsource {}\n'
      });

      const result = await searchQlCode({ pattern: 'RemoteFlowSource', paths: [dir] });

      expect(result.totalMatches).toBe(1);
    });

    it('should support case insensitive search', async () => {
      const dir = setupTestFiles({
        'Test.qll': 'class RemoteFlowSource {}\nclass remoteflowsource {}\n'
      });

      const result = await searchQlCode({
        pattern: 'RemoteFlowSource',
        paths: [dir],
        caseSensitive: false
      });

      expect(result.totalMatches).toBe(2);
    });
  });

  describe('context lines', () => {
    it('should include context lines when requested', async () => {
      const dir = setupTestFiles({
        'Test.qll': 'line1\nline2\nMATCH\nline4\nline5\n'
      });

      const result = await searchQlCode({
        pattern: 'MATCH',
        paths: [dir],
        contextLines: 1
      });

      expect(result.results).toHaveLength(1);
      expect(result.results[0].contextBefore).toEqual(['line2']);
      expect(result.results[0].contextAfter).toEqual(['line4']);
    });

    it('should handle context at start of file', async () => {
      const dir = setupTestFiles({
        'Test.qll': 'MATCH\nline2\nline3\n'
      });

      const result = await searchQlCode({
        pattern: 'MATCH',
        paths: [dir],
        contextLines: 2
      });

      expect(result.results[0].contextBefore).toEqual([]);
      expect(result.results[0].contextAfter).toEqual(['line2', 'line3']);
    });

    it('should not include context when contextLines is 0', async () => {
      const dir = setupTestFiles({
        'Test.qll': 'line1\nMATCH\nline3\n'
      });

      const result = await searchQlCode({
        pattern: 'MATCH',
        paths: [dir],
        contextLines: 0
      });

      expect(result.results[0].contextBefore).toBeUndefined();
      expect(result.results[0].contextAfter).toBeUndefined();
    });
  });

  describe('maxResults truncation', () => {
    it('should truncate results when exceeding maxResults', async () => {
      const lines = Array.from({ length: 20 }, (_, i) => `match_line_${i}`).join('\n');
      const dir = setupTestFiles({ 'Test.qll': lines });

      const result = await searchQlCode({
        pattern: 'match_line',
        paths: [dir],
        maxResults: 5
      });

      expect(result.returnedMatches).toBe(5);
      expect(result.totalMatches).toBe(20);
      expect(result.truncated).toBe(true);
      expect(result.results).toHaveLength(5);
    });

    it('should not set truncated when within limit', async () => {
      const dir = setupTestFiles({
        'Test.qll': 'match1\nmatch2\nmatch3\n'
      });

      const result = await searchQlCode({
        pattern: 'match',
        paths: [dir],
        maxResults: 100
      });

      expect(result.truncated).toBe(false);
    });
  });

  describe('file extensions', () => {
    it('should only search .ql and .qll files by default', async () => {
      const dir = setupTestFiles({
        'Test.ql': 'findme\n',
        'Test.qll': 'findme\n',
        'Test.txt': 'findme\n',
        'Test.py': 'findme\n'
      });

      const result = await searchQlCode({ pattern: 'findme', paths: [dir] });

      expect(result.totalMatches).toBe(2);
      expect(result.filesSearched).toBe(2);
    });

    it('should search custom extensions when specified', async () => {
      const dir = setupTestFiles({
        'Test.ql': 'findme\n',
        'Test.txt': 'findme\n'
      });

      const result = await searchQlCode({
        pattern: 'findme',
        paths: [dir],
        includeExtensions: ['.txt']
      });

      expect(result.totalMatches).toBe(1);
      expect(result.results[0].filePath).toContain('Test.txt');
    });
  });

  describe('invalid regex', () => {
    it('should throw for invalid regex pattern', async () => {
      const dir = setupTestFiles({ 'Test.qll': 'content\n' });

      await expect(searchQlCode({ pattern: '[invalid', paths: [dir] })).rejects.toThrow();
    });
  });

  describe('non-existent path', () => {
    it('should return empty results for non-existent path', async () => {
      const result = await searchQlCode({
        pattern: 'anything',
        paths: ['/nonexistent/path/that/does/not/exist']
      });

      expect(result.totalMatches).toBe(0);
      expect(result.results).toHaveLength(0);
      expect(result.filesSearched).toBe(0);
    });
  });

  describe('filesSearched count', () => {
    it('should report correct number of files searched', async () => {
      const dir = setupTestFiles({
        'A.qll': 'content\n',
        'B.qll': 'content\n',
        'C.ql': 'content\n'
      });

      const result = await searchQlCode({ pattern: 'content', paths: [dir] });

      expect(result.filesSearched).toBe(3);
    });
  });

  describe('Windows line endings', () => {
    it('should handle files with \\r\\n line endings', async () => {
      const dir = setupTestFiles({
        'Test.qll': 'line1\r\nMATCH_HERE\r\nline3\r\n'
      });

      const result = await searchQlCode({ pattern: 'MATCH_HERE', paths: [dir] });

      expect(result.totalMatches).toBe(1);
      expect(result.results[0].lineNumber).toBe(2);
      expect(result.results[0].lineContent).toBe('MATCH_HERE');
    });

    it('should not include \\r in context lines', async () => {
      const dir = setupTestFiles({
        'Test.qll': 'before\r\nMATCH\r\nafter\r\n'
      });

      const result = await searchQlCode({
        pattern: 'MATCH',
        paths: [dir],
        contextLines: 1
      });

      expect(result.results[0].contextBefore).toEqual(['before']);
      expect(result.results[0].contextAfter).toEqual(['after']);
    });
  });
});
