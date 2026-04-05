/**
 * Tests for SARIF analysis tools — registration gating, tool handler responses,
 * and integration with sarif-utils library functions.
 */

import { existsSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerSarifTools } from '../../../src/tools/sarif-tools';
import { sessionDataManager } from '../../../src/lib/session-data-manager';
import { createProjectTempDir } from '../../../src/utils/temp-dir';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/** Minimal multi-rule SARIF for tool handler testing. */
function createTestSarif() {
  return {
    version: '2.1.0',
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [{
      tool: {
        driver: {
          name: 'CodeQL',
          version: '2.25.1',
          rules: [
            {
              id: 'js/sql-injection',
              name: 'js/sql-injection',
              shortDescription: { text: 'SQL injection' },
              help: { markdown: '# SQL Injection\n\nUse parameterized queries.' },
              properties: { kind: 'path-problem', precision: 'high', 'security-severity': '8.8', tags: ['security'] },
            },
            {
              id: 'js/xss',
              name: 'js/xss',
              shortDescription: { text: 'Cross-site scripting' },
              properties: { kind: 'path-problem', precision: 'high', 'security-severity': '6.1', tags: ['security'] },
            },
          ],
        },
      },
      results: [
        {
          ruleId: 'js/sql-injection',
          ruleIndex: 0,
          message: { text: 'SQL injection from user input.' },
          locations: [{ physicalLocation: { artifactLocation: { uri: 'src/db.js' }, region: { startLine: 42, startColumn: 5, endColumn: 38 } } }],
          codeFlows: [{ threadFlows: [{ locations: [
            { location: { physicalLocation: { artifactLocation: { uri: 'src/handler.js' }, region: { startLine: 10 } }, message: { text: 'req.query.id' } } },
            { location: { physicalLocation: { artifactLocation: { uri: 'src/db.js' }, region: { startLine: 42 } }, message: { text: 'query(...)' } } },
          ] }] }],
        },
        {
          ruleId: 'js/xss',
          ruleIndex: 1,
          message: { text: 'XSS vulnerability.' },
          locations: [{ physicalLocation: { artifactLocation: { uri: 'src/views.js' }, region: { startLine: 30, startColumn: 10, endColumn: 50 } } }],
        },
      ],
    }],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SARIF Tools', () => {
  let mockServer: McpServer;
  let testStorageDir: string;
  let testSarifPath: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = {
      tool: vi.fn(),
    } as unknown as McpServer;

    testStorageDir = createProjectTempDir('sarif-tools-test-');
    testSarifPath = join(testStorageDir, 'test.sarif');
    writeFileSync(testSarifPath, JSON.stringify(createTestSarif(), null, 2));
  });

  afterEach(() => {
    if (existsSync(testStorageDir)) {
      rmSync(testStorageDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe('registerSarifTools', () => {
    it('should not register tools when enableAnnotationTools is false', () => {
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

      registerSarifTools(mockServer);
      expect(mockServer.tool).not.toHaveBeenCalled();
    });

    it('should register 5 SARIF tools when enableAnnotationTools is true', () => {
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

      registerSarifTools(mockServer);
      expect(mockServer.tool).toHaveBeenCalledTimes(7);

      const toolNames = (mockServer.tool as any).mock.calls.map((call: any) => call[0]);
      expect(toolNames).toContain('sarif_compare_alerts');
      expect(toolNames).toContain('sarif_deduplicate_rules');
      expect(toolNames).toContain('sarif_diff_runs');
      expect(toolNames).toContain('sarif_extract_rule');
      expect(toolNames).toContain('sarif_list_rules');
      expect(toolNames).toContain('sarif_rule_to_markdown');
      expect(toolNames).toContain('sarif_store');
    });
  });

  describe('tool handlers', () => {
    let handlers: Record<string, Function>;

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

      registerSarifTools(mockServer);

      handlers = {};
      for (const call of (mockServer.tool as any).mock.calls) {
        handlers[call[0]] = call[3];
      }
    });

    describe('sarif_extract_rule', () => {
      it('should extract results for a specific ruleId', async () => {
        const result = await handlers.sarif_extract_rule({ sarifPath: testSarifPath, ruleId: 'js/sql-injection' });
        const parsed = JSON.parse(result.content[0].text);

        expect(parsed.ruleId).toBe('js/sql-injection');
        expect(parsed.resultCount).toBe(1);
        expect(parsed.extractedSarif.runs[0].tool.driver.rules).toHaveLength(1);
      });

      it('should return empty for non-existent ruleId', async () => {
        const result = await handlers.sarif_extract_rule({ sarifPath: testSarifPath, ruleId: 'js/nonexistent' });
        expect(result.content[0].text).toContain('No results or rule definition found');
      });

      it('should return error when no sarifPath or cacheKey provided', async () => {
        const result = await handlers.sarif_extract_rule({ ruleId: 'js/sql-injection' });
        expect(result.content[0].text).toContain('Either sarifPath or cacheKey is required');
      });

      it('should return error for invalid file path', async () => {
        const result = await handlers.sarif_extract_rule({ sarifPath: '/nonexistent/path.sarif', ruleId: 'js/sql-injection' });
        expect(result.content[0].text).toContain('Failed to read SARIF file');
      });

      it('should return error for invalid SARIF content', async () => {
        const badPath = join(testStorageDir, 'bad.sarif');
        writeFileSync(badPath, '{"not": "sarif"}');
        const result = await handlers.sarif_extract_rule({ sarifPath: badPath, ruleId: 'js/sql-injection' });
        expect(result.content[0].text).toContain('Invalid SARIF');
      });

      it('should return error for SARIF with empty runs', async () => {
        const emptyPath = join(testStorageDir, 'empty-runs.sarif');
        writeFileSync(emptyPath, '{"version": "2.1.0", "runs": []}');
        const result = await handlers.sarif_extract_rule({ sarifPath: emptyPath, ruleId: 'js/sql-injection' });
        expect(result.content[0].text).toContain('empty');
      });

      it('should return error for SARIF missing tool.driver', async () => {
        const noDriverPath = join(testStorageDir, 'no-driver.sarif');
        writeFileSync(noDriverPath, '{"version": "2.1.0", "runs": [{"tool": {}}]}');
        const result = await handlers.sarif_extract_rule({ sarifPath: noDriverPath, ruleId: 'js/sql-injection' });
        expect(result.content[0].text).toContain('tool.driver');
      });
    });

    describe('sarif_list_rules', () => {
      it('should list all rules with result counts', async () => {
        const result = await handlers.sarif_list_rules({ sarifPath: testSarifPath });
        const parsed = JSON.parse(result.content[0].text);

        expect(parsed.totalRules).toBe(2);
        expect(parsed.totalResults).toBe(2);
        expect(parsed.rules[0].ruleId).toBe('js/sql-injection');
        expect(parsed.rules[0].resultCount).toBe(1);
        expect(parsed.rules[1].ruleId).toBe('js/xss');
      });
    });

    describe('sarif_rule_to_markdown', () => {
      it('should generate markdown with rule summary and results', async () => {
        const result = await handlers.sarif_rule_to_markdown({ sarifPath: testSarifPath, ruleId: 'js/sql-injection' });
        const text = result.content[0].text;

        expect(text).toContain('## js/sql-injection');
        expect(text).toContain('SQL injection');
        expect(text).toContain('src/db.js');
        expect(text).toContain('```mermaid');
        expect(text).toContain('flowchart LR');
      });

      it('should return empty message for non-existent rule', async () => {
        const result = await handlers.sarif_rule_to_markdown({ sarifPath: testSarifPath, ruleId: 'js/nonexistent' });
        expect(result.content[0].text).toContain('No results found');
      });
    });

    describe('sarif_compare_alerts', () => {
      it('should detect no overlap for alerts at different locations', async () => {
        const result = await handlers.sarif_compare_alerts({
          alertA: { sarifPath: testSarifPath, ruleId: 'js/sql-injection', resultIndex: 0 },
          alertB: { sarifPath: testSarifPath, ruleId: 'js/xss', resultIndex: 0 },
          overlapMode: 'sink',
        });
        const parsed = JSON.parse(result.content[0].text);

        expect(parsed.overlaps).toBe(false);
        expect(parsed.overlapMode).toBe('sink');
        expect(parsed.alertA.ruleId).toBe('js/sql-injection');
        expect(parsed.alertB.ruleId).toBe('js/xss');
      });

      it('should return error for out-of-range resultIndex', async () => {
        const result = await handlers.sarif_compare_alerts({
          alertA: { sarifPath: testSarifPath, ruleId: 'js/sql-injection', resultIndex: 99 },
          alertB: { sarifPath: testSarifPath, ruleId: 'js/xss', resultIndex: 0 },
        });
        expect(result.content[0].text).toContain('resultIndex 99 out of range');
      });

      it('should support cross-file comparison', async () => {
        // Create a second SARIF file
        const sarifB = createTestSarif();
        const pathB = join(testStorageDir, 'test-b.sarif');
        writeFileSync(pathB, JSON.stringify(sarifB));

        const result = await handlers.sarif_compare_alerts({
          alertA: { sarifPath: testSarifPath, ruleId: 'js/sql-injection', resultIndex: 0 },
          alertB: { sarifPath: pathB, ruleId: 'js/sql-injection', resultIndex: 0 },
          overlapMode: 'sink',
        });
        const parsed = JSON.parse(result.content[0].text);

        expect(parsed.overlaps).toBe(true);
        expect(parsed.sharedLocations).toHaveLength(1);
      });
    });

    describe('sarif_diff_runs', () => {
      it('should detect identical runs', async () => {
        const result = await handlers.sarif_diff_runs({
          sarifPathA: testSarifPath,
          sarifPathB: testSarifPath,
          labelA: 'run1',
          labelB: 'run2',
        });
        const parsed = JSON.parse(result.content[0].text);

        expect(parsed.labelA).toBe('run1');
        expect(parsed.labelB).toBe('run2');
        expect(parsed.addedRules).toHaveLength(0);
        expect(parsed.removedRules).toHaveLength(0);
        expect(parsed.changedRules).toHaveLength(0);
        expect(parsed.unchangedRules).toHaveLength(2);
      });

      it('should detect changed result counts', async () => {
        const sarifB = createTestSarif();
        sarifB.runs[0].results = [sarifB.runs[0].results[0]]; // remove XSS result
        const pathB = join(testStorageDir, 'modified.sarif');
        writeFileSync(pathB, JSON.stringify(sarifB));

        const result = await handlers.sarif_diff_runs({
          sarifPathA: testSarifPath,
          sarifPathB: pathB,
        });
        const parsed = JSON.parse(result.content[0].text);

        expect(parsed.changedRules).toHaveLength(1);
        expect(parsed.changedRules[0].ruleId).toBe('js/xss');
        expect(parsed.changedRules[0].delta).toBe(-1);
      });

      it('should return error when sarifPathA is missing', async () => {
        const result = await handlers.sarif_diff_runs({
          sarifPathB: testSarifPath,
        });
        expect(result.content[0].text).toContain('Either sarifPath or cacheKey is required');
      });
    });

    describe('sarif_store', () => {
      let mockPutCacheEntry: ReturnType<typeof vi.fn>;

      beforeEach(() => {
        mockPutCacheEntry = vi.fn();
        vi.spyOn(sessionDataManager, 'getStore').mockReturnValue({
          putCacheEntry: mockPutCacheEntry,
        } as any);
      });

      it('should store SARIF from file path and return cache key', async () => {
        const result = await handlers.sarif_store({ sarifPath: testSarifPath });
        const parsed = JSON.parse(result.content[0].text);

        expect(parsed.cacheKey).toBeDefined();
        expect(parsed.cacheKey).toMatch(/^sarif-store-/);
        expect(parsed.source).toBe('file');
        expect(parsed.resultCount).toBe(2);
        expect(parsed.ruleCount).toBe(2);
        expect(parsed.toolName).toBe('CodeQL');
        expect(mockPutCacheEntry).toHaveBeenCalledTimes(1);
      });

      it('should store SARIF from inline content', async () => {
        const content = JSON.stringify(createTestSarif());
        const result = await handlers.sarif_store({ sarifContent: content });
        const parsed = JSON.parse(result.content[0].text);

        expect(parsed.cacheKey).toMatch(/^sarif-store-/);
        expect(parsed.source).toBe('inline');
        expect(parsed.resultCount).toBe(2);
        expect(mockPutCacheEntry).toHaveBeenCalledTimes(1);
      });

      it('should store SARIF with label', async () => {
        const result = await handlers.sarif_store({
          label: 'my-analysis',
          sarifPath: testSarifPath,
        });
        const parsed = JSON.parse(result.content[0].text);

        expect(parsed.label).toBe('my-analysis');
      });

      it('should return error when neither content nor path provided', async () => {
        const result = await handlers.sarif_store({});
        expect(result.content[0].text).toContain('Either sarifContent or sarifPath is required');
      });

      it('should return error for invalid SARIF content', async () => {
        const result = await handlers.sarif_store({ sarifContent: '{"not": "sarif"}' });
        expect(result.content[0].text).toContain('Invalid SARIF');
      });

      it('should return error for nonexistent file', async () => {
        const result = await handlers.sarif_store({ sarifPath: '/nonexistent/path.sarif' });
        expect(result.content[0].text).toContain('Failed to read SARIF file');
      });
    });

    describe('sarif_deduplicate_rules', () => {
      it('should find duplicate rules between identical SARIF files', async () => {
        const result = await handlers.sarif_deduplicate_rules({
          sarifPathA: testSarifPath,
          sarifPathB: testSarifPath,
        });
        const parsed = JSON.parse(result.content[0].text);

        expect(parsed.summary.totalRulesA).toBe(2);
        expect(parsed.summary.totalRulesB).toBe(2);
        // Same file = same rules with perfect overlap
        expect(parsed.duplicateGroups.length).toBeGreaterThan(0);

        // The js/sql-injection vs js/sql-injection pair should have overlap score 1.0
        const selfMatch = parsed.duplicateGroups.find(
          (g: any) => g.ruleIdA === 'js/sql-injection' && g.ruleIdB === 'js/sql-injection',
        );
        expect(selfMatch).toBeDefined();
        expect(selfMatch.overlapScore).toBe(1);
      });

      it('should return no duplicates when threshold is very high and rules differ', async () => {
        const sarifB = createTestSarif();
        // Change all locations so nothing overlaps
        sarifB.runs[0].results = [{
          ruleId: 'js/xss',
          ruleIndex: 1,
          message: { text: 'Different XSS.' },
          locations: [{ physicalLocation: { artifactLocation: { uri: 'src/other.js' }, region: { startLine: 999, startColumn: 1, endColumn: 10 } } }],
        }];
        sarifB.runs[0].tool.driver.rules = [sarifB.runs[0].tool.driver.rules[1]];
        const pathB = join(testStorageDir, 'different.sarif');
        writeFileSync(pathB, JSON.stringify(sarifB));

        const result = await handlers.sarif_deduplicate_rules({
          overlapThreshold: 0.99,
          sarifPathA: testSarifPath,
          sarifPathB: pathB,
        });
        const parsed = JSON.parse(result.content[0].text);

        expect(parsed.summary.overlapThreshold).toBe(0.99);
      });

      it('should return error when SARIF A is missing', async () => {
        const result = await handlers.sarif_deduplicate_rules({
          sarifPathB: testSarifPath,
        });
        expect(result.content[0].text).toContain('Either sarifPath or cacheKey is required');
      });
    });
  });
});
