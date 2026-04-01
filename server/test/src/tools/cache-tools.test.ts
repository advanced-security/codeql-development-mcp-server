/**
 * Tests for cache tools — registration gating, schema constraints, and response shapes.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { existsSync, rmSync } from 'fs';
import { registerCacheTools } from '../../../src/tools/cache-tools';
import { sessionDataManager } from '../../../src/lib/session-data-manager';
import { createProjectTempDir } from '../../../src/utils/temp-dir';

describe('Cache Tools', () => {
  let mockServer: McpServer;
  let testStorageDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = {
      tool: vi.fn(),
    } as unknown as McpServer;

    testStorageDir = createProjectTempDir('cache-tools-test-');
  });

  afterEach(() => {
    if (existsSync(testStorageDir)) {
      rmSync(testStorageDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe('registerCacheTools', () => {
    describe('opt-in behavior', () => {
      it('should not register cache tools when enableAnnotationTools is false', () => {
        vi.spyOn(sessionDataManager, 'getConfig').mockReturnValue({
          storageLocation: testStorageDir,
          autoTrackSessions: true,
          retentionDays: 90,
          includeCallParameters: true,
          includeCallResults: true,
          maxActiveSessionsPerQuery: 3,
          scoringFrequency: 'per_call',
          archiveCompletedSessions: true,
          enableAnnotationTools: false,
          enableRecommendations: true,
          enableMonitoringTools: false,
        });

        registerCacheTools(mockServer);

        expect(mockServer.tool).not.toHaveBeenCalled();
      });

      it('should register cache tools when enableAnnotationTools is true', () => {
        vi.spyOn(sessionDataManager, 'getConfig').mockReturnValue({
          storageLocation: testStorageDir,
          autoTrackSessions: true,
          retentionDays: 90,
          includeCallParameters: true,
          includeCallResults: true,
          maxActiveSessionsPerQuery: 3,
          scoringFrequency: 'per_call',
          archiveCompletedSessions: true,
          enableAnnotationTools: true,
          enableRecommendations: true,
          enableMonitoringTools: false,
        });

        registerCacheTools(mockServer);

        const toolCalls = (mockServer.tool as any).mock.calls;
        const toolNames = toolCalls.map((call: any) => call[0]);

        expect(toolNames).toContain('query_results_cache_clear');
        expect(toolNames).toContain('query_results_cache_compare');
        expect(toolNames).toContain('query_results_cache_lookup');
        expect(toolNames).toContain('query_results_cache_retrieve');
        expect(mockServer.tool).toHaveBeenCalledTimes(4);
      });
    });

    describe('schema validation', () => {
      beforeEach(() => {
        vi.spyOn(sessionDataManager, 'getConfig').mockReturnValue({
          storageLocation: testStorageDir,
          autoTrackSessions: true,
          retentionDays: 90,
          includeCallParameters: true,
          includeCallResults: true,
          maxActiveSessionsPerQuery: 3,
          scoringFrequency: 'per_call',
          archiveCompletedSessions: true,
          enableAnnotationTools: true,
          enableRecommendations: true,
          enableMonitoringTools: false,
        });
      });

      it('should validate lineRange as positive integer tuple with start <= end', () => {
        registerCacheTools(mockServer);

        const retrieveCall = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'query_results_cache_retrieve',
        );
        const schema = retrieveCall[2];
        const lineRange = schema.lineRange;

        // Valid range
        expect(lineRange.safeParse([1, 5]).success).toBe(true);

        // start > end should fail refinement
        expect(lineRange.safeParse([5, 1]).success).toBe(false);

        // 0 is not >= 1
        expect(lineRange.safeParse([0, 5]).success).toBe(false);

        // Floats should fail
        expect(lineRange.safeParse([1.5, 3]).success).toBe(false);
      });

      it('should validate resultIndices as non-negative integer tuple', () => {
        registerCacheTools(mockServer);

        const retrieveCall = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'query_results_cache_retrieve',
        );
        const schema = retrieveCall[2];
        const resultIndices = schema.resultIndices;

        // Valid range
        expect(resultIndices.safeParse([0, 5]).success).toBe(true);

        // start > end should fail refinement
        expect(resultIndices.safeParse([5, 1]).success).toBe(false);

        // Negative should fail
        expect(resultIndices.safeParse([-1, 3]).success).toBe(false);
      });

      it('should validate maxLines as positive integer', () => {
        registerCacheTools(mockServer);

        const retrieveCall = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'query_results_cache_retrieve',
        );
        const schema = retrieveCall[2];
        const maxLines = schema.maxLines;

        expect(maxLines.safeParse(10).success).toBe(true);
        expect(maxLines.safeParse(0).success).toBe(false);
        expect(maxLines.safeParse(-1).success).toBe(false);
        expect(maxLines.safeParse(1.5).success).toBe(false);
      });

      it('should validate maxResults as positive integer', () => {
        registerCacheTools(mockServer);

        const retrieveCall = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'query_results_cache_retrieve',
        );
        const schema = retrieveCall[2];
        const maxResults = schema.maxResults;

        expect(maxResults.safeParse(10).success).toBe(true);
        expect(maxResults.safeParse(0).success).toBe(false);
        expect(maxResults.safeParse(-1).success).toBe(false);
      });
    });

    describe('handler behavior', () => {
      beforeEach(async () => {
        vi.spyOn(sessionDataManager, 'getConfig').mockReturnValue({
          storageLocation: testStorageDir,
          autoTrackSessions: true,
          retentionDays: 90,
          includeCallParameters: true,
          includeCallResults: true,
          maxActiveSessionsPerQuery: 3,
          scoringFrequency: 'per_call',
          archiveCompletedSessions: true,
          enableAnnotationTools: true,
          enableRecommendations: true,
          enableMonitoringTools: false,
        });

        await sessionDataManager.initialize();
      });

      afterEach(() => {
        sessionDataManager.getStore().close();
      });

      it('should return not found for missing cache key', async () => {
        registerCacheTools(mockServer);

        const retrieveHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'query_results_cache_retrieve',
        )[3];

        const result = await retrieveHandler({ cacheKey: 'nonexistent' });
        expect(result.content[0].text).toContain('No cached result found');
      });

      it('should return line-based content for graphtext cache entries', async () => {
        const store = sessionDataManager.getStore();
        store.putCacheEntry({
          cacheKey: 'test-graphtext',
          queryName: 'PrintAST',
          queryPath: '/test.ql',
          databasePath: '/db',
          language: 'cpp',
          codeqlVersion: '2.25.0',
          outputFormat: 'graphtext',
          resultContent: 'Function foo\n  Param x\nFunction bar\n  Param y\n',
        });

        registerCacheTools(mockServer);

        const retrieveHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'query_results_cache_retrieve',
        )[3];

        const result = await retrieveHandler({ cacheKey: 'test-graphtext' });
        const text = result.content[0].text;
        expect(text).toContain('totalLines');
        expect(text).toContain('Function foo');
      });

      it('should return sarifSubset field for SARIF cache entries', async () => {
        const sarif = {
          version: '2.1.0',
          runs: [{
            tool: { driver: { name: 'codeql' } },
            results: [
              { ruleId: 'r1', message: { text: 'msg1' }, locations: [] },
              { ruleId: 'r2', message: { text: 'msg2' }, locations: [] },
            ],
          }],
        };
        const store = sessionDataManager.getStore();
        store.putCacheEntry({
          cacheKey: 'test-sarif',
          queryName: 'Q',
          queryPath: '/q.ql',
          databasePath: '/db',
          language: 'javascript',
          codeqlVersion: '2.25.0',
          outputFormat: 'sarif-latest',
          resultContent: JSON.stringify(sarif),
          resultCount: 2,
        });

        registerCacheTools(mockServer);

        const retrieveHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'query_results_cache_retrieve',
        )[3];

        const result = await retrieveHandler({ cacheKey: 'test-sarif' });
        const parsed = JSON.parse(result.content[0].text);

        // Should use sarifSubset, not results
        expect(parsed).toHaveProperty('sarifSubset');
        expect(parsed).not.toHaveProperty('results');
        expect(parsed.totalResults).toBe(2);
        expect(parsed.returnedResults).toBe(2);
        expect(parsed.sarifSubset.runs[0].results).toHaveLength(2);
      });

      it('should return plain text for non-JSON SARIF fallback', async () => {
        const store = sessionDataManager.getStore();
        store.putCacheEntry({
          cacheKey: 'bad-sarif',
          queryName: 'Q',
          queryPath: '/q.ql',
          databasePath: '/db',
          language: 'python',
          codeqlVersion: '2.25.0',
          outputFormat: 'sarif-latest',
          resultContent: 'This is NOT valid JSON at all',
        });

        registerCacheTools(mockServer);

        const retrieveHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'query_results_cache_retrieve',
        )[3];

        const result = await retrieveHandler({ cacheKey: 'bad-sarif' });
        // Should return plain text fallback (not throw)
        expect(result.content[0].text).toContain('This is NOT valid JSON');
      });

      it('should lookup cache entries by query name', async () => {
        const store = sessionDataManager.getStore();
        store.putCacheEntry({
          cacheKey: 'lookup-key',
          queryName: 'CallGraphTo',
          queryPath: '/cg.ql',
          databasePath: '/db1',
          language: 'cpp',
          codeqlVersion: '2.25.0',
          outputFormat: 'graphtext',
          resultContent: 'content1',
        });

        registerCacheTools(mockServer);

        const lookupHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'query_results_cache_lookup',
        )[3];

        const result = await lookupHandler({ queryName: 'CallGraphTo' });
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.cached).toBe(true);
        expect(parsed.count).toBe(1);
      });

      it('should clear cache entries', async () => {
        const store = sessionDataManager.getStore();
        store.putCacheEntry({
          cacheKey: 'to-clear',
          queryName: 'Q',
          queryPath: '/q.ql',
          databasePath: '/db',
          language: 'cpp',
          codeqlVersion: '2.25.0',
          outputFormat: 'csv',
          resultContent: 'data',
        });

        registerCacheTools(mockServer);

        const clearHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'query_results_cache_clear',
        )[3];

        const result = await clearHandler({ cacheKey: 'to-clear' });
        expect(result.content[0].text).toContain('Cleared 1');
      });

      it('should require at least one filter for cache clear', async () => {
        registerCacheTools(mockServer);

        const clearHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'query_results_cache_clear',
        )[3];

        const result = await clearHandler({});
        expect(result.content[0].text).toContain('At least one filter');
      });

      it('should lookup cache entry by exact cacheKey', async () => {
        const store = sessionDataManager.getStore();
        store.putCacheEntry({
          cacheKey: 'exact-key-abc',
          queryName: 'PrintAST',
          queryPath: '/print-ast.ql',
          databasePath: '/db1',
          language: 'javascript',
          codeqlVersion: '2.25.0',
          outputFormat: 'graphtext',
          resultContent: 'AST output',
          resultCount: 5,
        });

        registerCacheTools(mockServer);

        const lookupHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'query_results_cache_lookup',
        )[3];

        const result = await lookupHandler({ cacheKey: 'exact-key-abc' });
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.cached).toBe(true);
        expect(parsed.cacheKey).toBe('exact-key-abc');
        expect(parsed.queryName).toBe('PrintAST');
        expect(parsed.language).toBe('javascript');
        expect(parsed.resultCount).toBe(5);
      });

      it('should return cached:false for non-existent cacheKey lookup', async () => {
        registerCacheTools(mockServer);

        const lookupHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'query_results_cache_lookup',
        )[3];

        const result = await lookupHandler({ cacheKey: 'nonexistent-key' });
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.cached).toBe(false);
        expect(parsed.cacheKey).toBe('nonexistent-key');
      });

      it('should lookup cache entries by language filter', async () => {
        const store = sessionDataManager.getStore();
        store.putCacheEntry({
          cacheKey: 'js-entry-1',
          queryName: 'PrintAST',
          queryPath: '/print-ast.ql',
          databasePath: '/db1',
          language: 'javascript',
          codeqlVersion: '2.25.0',
          outputFormat: 'graphtext',
          resultContent: 'content1',
        });
        store.putCacheEntry({
          cacheKey: 'js-entry-2',
          queryName: 'CallGraphTo',
          queryPath: '/cg.ql',
          databasePath: '/db2',
          language: 'javascript',
          codeqlVersion: '2.25.0',
          outputFormat: 'graphtext',
          resultContent: 'content2',
        });
        store.putCacheEntry({
          cacheKey: 'cpp-entry-1',
          queryName: 'PrintAST',
          queryPath: '/print-ast.ql',
          databasePath: '/db3',
          language: 'cpp',
          codeqlVersion: '2.25.0',
          outputFormat: 'graphtext',
          resultContent: 'content3',
        });

        registerCacheTools(mockServer);

        const lookupHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'query_results_cache_lookup',
        )[3];

        const result = await lookupHandler({ language: 'javascript' });
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.cached).toBe(true);
        expect(parsed.count).toBe(2);
        expect(parsed.entries).toHaveLength(2);
        // All entries should be JavaScript
        for (const entry of parsed.entries) {
          expect(entry.language).toBe('javascript');
        }
      });

      it('should lookup cache entries by databasePath filter', async () => {
        const store = sessionDataManager.getStore();
        store.putCacheEntry({
          cacheKey: 'db1-entry',
          queryName: 'PrintAST',
          queryPath: '/print-ast.ql',
          databasePath: '/db1',
          language: 'javascript',
          codeqlVersion: '2.25.0',
          outputFormat: 'graphtext',
          resultContent: 'content1',
        });
        store.putCacheEntry({
          cacheKey: 'db2-entry',
          queryName: 'PrintAST',
          queryPath: '/print-ast.ql',
          databasePath: '/db2',
          language: 'javascript',
          codeqlVersion: '2.25.0',
          outputFormat: 'graphtext',
          resultContent: 'content2',
        });

        registerCacheTools(mockServer);

        const lookupHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'query_results_cache_lookup',
        )[3];

        const result = await lookupHandler({ databasePath: '/db1' });
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.cached).toBe(true);
        expect(parsed.count).toBe(1);
        expect(parsed.entries[0].databasePath).toBe('/db1');
      });

      it('should respect limit parameter in cache lookup', async () => {
        const store = sessionDataManager.getStore();
        for (let i = 0; i < 5; i++) {
          store.putCacheEntry({
            cacheKey: `limit-entry-${i}`,
            queryName: 'Q',
            queryPath: '/q.ql',
            databasePath: `/db${i}`,
            language: 'javascript',
            codeqlVersion: '2.25.0',
            outputFormat: 'graphtext',
            resultContent: `content${i}`,
          });
        }

        registerCacheTools(mockServer);

        const lookupHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'query_results_cache_lookup',
        )[3];

        const result = await lookupHandler({ language: 'javascript', limit: 2 });
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.cached).toBe(true);
        expect(parsed.count).toBe(2);
        expect(parsed.entries).toHaveLength(2);
      });

      it('should use latest entry resultCount for comparison', async () => {
        const store = sessionDataManager.getStore();
        // Cache entry without resultCount (simulates old cache entries)
        store.putCacheEntry({
          cacheKey: 'compare-no-count',
          queryName: 'UI5Clickjacking',
          queryPath: '/ui5.ql',
          databasePath: '/db1',
          language: 'javascript',
          codeqlVersion: '2.25.0',
          outputFormat: 'sarif-latest',
          resultContent: '{}',
          resultCount: 5,
        });

        registerCacheTools(mockServer);

        const compareHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'query_results_cache_compare',
        )[3];

        const result = await compareHandler({ queryName: 'UI5Clickjacking' });
        const parsed = JSON.parse(result.content[0].text);
        expect(parsed.comparison[0].resultCount).toBe(5);
      });
    });
  });
});
