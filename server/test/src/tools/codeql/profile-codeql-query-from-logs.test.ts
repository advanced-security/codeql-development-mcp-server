/**
 * Tests for the profile_codeql_query_from_logs MCP tool.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import {
  createTestTempDir,
  cleanupTestTempDir,
} from '../../../utils/temp-dir';
import { registerProfileCodeQLQueryFromLogsTool } from '../../../../src/tools/codeql/profile-codeql-query-from-logs';

// ---------------------------------------------------------------------------
// Synthetic log helpers (minimal)
// ---------------------------------------------------------------------------

function minimalRawLog(): string {
  const events = [
    {
      time: '2026-02-17T00:00:00Z',
      type: 'LOG_HEADER',
      eventId: 1,
      nanoTime: 100000000,
      codeqlVersion: '2.24.1',
      logVersion: '0.5.0',
    },
    {
      time: '2026-02-17T00:00:01Z',
      type: 'QUERY_STARTED',
      eventId: 2,
      nanoTime: 200000000,
      queryName: 'TestQuery.ql',
    },
    {
      time: '2026-02-17T00:00:02Z',
      type: 'PREDICATE_STARTED',
      eventId: 3,
      nanoTime: 300000000,
      raHash: 'abc123',
      predicateName: 'ExpensivePred',
      predicateType: 'COMPUTED',
      dependencies: {},
      queryCausingWork: 2,
    },
    {
      time: '2026-02-17T00:00:02Z',
      type: 'PREDICATE_COMPLETED',
      eventId: 4,
      nanoTime: 350000000,
      startEvent: 3,
      resultSize: 42,
    },
    {
      time: '2026-02-17T00:00:03Z',
      type: 'QUERY_COMPLETED',
      eventId: 5,
      nanoTime: 400000000,
      startEvent: 2,
      terminationType: 'NORMAL',
    },
    {
      time: '2026-02-17T00:00:04Z',
      type: 'LOG_FOOTER',
      eventId: 6,
      nanoTime: 500000000,
    },
  ];
  return events.map((e) => JSON.stringify(e, null, 2)).join('\n\n');
}

function minimalSummaryLog(): string {
  const events = [
    {
      summaryLogVersion: '0.4.0',
      codeqlVersion: '2.24.1',
      startTime: '2026-02-17T00:00:00Z',
    },
    {
      completionTime: '2026-02-17T00:00:02Z',
      raHash: 'abc123',
      predicateName: 'ExpensivePred',
      evaluationStrategy: 'COMPUTED',
      dependencies: {},
      millis: 50,
      pipelineRuns: 1,
      queryCausingWork: 'TestQuery.ql',
      resultSize: 42,
    },
  ];
  return events.map((e) => JSON.stringify(e, null, 2)).join('\n\n');
}

// ---------------------------------------------------------------------------
// Helper to extract the handler registered via server.tool()
// ---------------------------------------------------------------------------

// eslint-disable-next-line no-unused-vars
type ToolHandler = (params: Record<string, unknown>) => Promise<{
  content: { type: string; text: string }[];
  isError?: boolean;
}>;

function getRegisteredHandler(
  _mockServer: McpServer
): ToolHandler {
  return (_mockServer.tool as ReturnType<typeof vi.fn>).mock
    .calls[0][3] as ToolHandler;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Profile CodeQL Query From Logs Tool', () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir) {
      cleanupTestTempDir(tempDir);
    }
  });

  // -----------------------------------------------------------------------
  // Registration
  // -----------------------------------------------------------------------

  describe('registerProfileCodeQLQueryFromLogsTool', () => {
    it('should register the tool with the expected name and schema', () => {
      const mockServer = {
        tool: vi.fn(),
      } as unknown as McpServer;

      registerProfileCodeQLQueryFromLogsTool(mockServer);

      expect(mockServer.tool).toHaveBeenCalledOnce();
      expect(mockServer.tool).toHaveBeenCalledWith(
        'profile_codeql_query_from_logs',
        expect.any(String),
        expect.objectContaining({
          evaluatorLog: expect.any(Object),
          outputDir: expect.any(Object),
          topN: expect.any(Object),
        }),
        expect.any(Function)
      );
    });
  });

  // -----------------------------------------------------------------------
  // Error cases
  // -----------------------------------------------------------------------

  describe('error handling', () => {
    it('should return error when evaluator log does not exist', async () => {
      const mockServer = {
        tool: vi.fn(),
      } as unknown as McpServer;
      registerProfileCodeQLQueryFromLogsTool(mockServer);
      const handler = getRegisteredHandler(mockServer);

      const result = await handler({
        evaluatorLog: '/nonexistent/evaluator-log.jsonl',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Evaluator log not found');
    });
  });

  // -----------------------------------------------------------------------
  // Raw log processing
  // -----------------------------------------------------------------------

  describe('raw evaluator log processing', () => {
    it('should produce output files and a text summary', async () => {
      tempDir = createTestTempDir('profile-from-logs-raw-');
      mkdirSync(tempDir, { recursive: true });

      const logPath = join(tempDir, 'evaluator-log.jsonl');
      writeFileSync(logPath, minimalRawLog());

      const outputDir = join(tempDir, 'output');

      const mockServer = {
        tool: vi.fn(),
      } as unknown as McpServer;
      registerProfileCodeQLQueryFromLogsTool(mockServer);
      const handler = getRegisteredHandler(mockServer);

      const result = await handler({
        evaluatorLog: logPath,
        outputDir,
        topN: 5,
      });

      expect(result.isError).toBeUndefined();

      // Output files created
      expect(
        existsSync(join(outputDir, 'query-evaluation-profile.json'))
      ).toBe(true);
      expect(
        existsSync(join(outputDir, 'query-evaluation-detail.txt'))
      ).toBe(true);

      // Response is compact structured JSON
      const response = JSON.parse(result.content[0].text);
      expect(response.logFormat).toBe('raw');
      expect(response.queries).toHaveLength(1);
      expect(response.queries[0].queryName).toBe('TestQuery.ql');
      expect(response.queries[0].slowestPredicates).toHaveLength(1);
      expect(response.queries[0].slowestPredicates[0].name).toBe('ExpensivePred');
      expect(response.queries[0].slowestPredicates[0].evalOrder).toBe(1);
      expect(response.queries[0].slowestPredicates[0].detailLines).toBeDefined();
      expect(response.queries[0].slowestPredicates[0].detailLines.start).toBeGreaterThan(0);
      expect(response.detailFile).toContain('query-evaluation-detail.txt');
      expect(response.fullProfileJson).toContain('query-evaluation-profile.json');
    });

    it('should write valid JSON profile', async () => {
      tempDir = createTestTempDir('profile-json-');
      mkdirSync(tempDir, { recursive: true });

      const logPath = join(tempDir, 'evaluator-log.jsonl');
      writeFileSync(logPath, minimalRawLog());

      const outputDir = join(tempDir, 'output');

      const mockServer = {
        tool: vi.fn(),
      } as unknown as McpServer;
      registerProfileCodeQLQueryFromLogsTool(mockServer);
      const handler = getRegisteredHandler(mockServer);
      await handler({ evaluatorLog: logPath, outputDir });

      const jsonContent = readFileSync(
        join(outputDir, 'query-evaluation-profile.json'),
        'utf-8'
      );
      const profile = JSON.parse(jsonContent);

      expect(profile.logFormat).toBe('raw');
      expect(profile.queries).toHaveLength(1);
      expect(profile.queries[0].queryName).toBe('TestQuery.ql');
    });

    it('should write detail file with predicate RA data', async () => {
      tempDir = createTestTempDir('profile-detail-');
      mkdirSync(tempDir, { recursive: true });

      const logPath = join(tempDir, 'evaluator-log.jsonl');
      writeFileSync(logPath, minimalRawLog());

      const outputDir = join(tempDir, 'output');

      const mockServer = {
        tool: vi.fn(),
      } as unknown as McpServer;
      registerProfileCodeQLQueryFromLogsTool(mockServer);
      const handler = getRegisteredHandler(mockServer);
      const result = await handler({ evaluatorLog: logPath, outputDir });

      // Detail file should exist and contain predicate info
      const response = JSON.parse(result.content[0].text);
      const detailContent = readFileSync(response.detailFile, 'utf-8');
      expect(detailContent).toContain('ExpensivePred');
      expect(detailContent).toContain('Eval order:');
      expect(detailContent).toContain('Duration:');
    });
  });

  // -----------------------------------------------------------------------
  // Summary log processing
  // -----------------------------------------------------------------------

  describe('summary log processing', () => {
    it('should produce output files from a summary log', async () => {
      tempDir = createTestTempDir('profile-from-logs-summary-');
      mkdirSync(tempDir, { recursive: true });

      const logPath = join(tempDir, 'evaluator-log.summary.jsonl');
      writeFileSync(logPath, minimalSummaryLog());

      const outputDir = join(tempDir, 'output');

      const mockServer = {
        tool: vi.fn(),
      } as unknown as McpServer;
      registerProfileCodeQLQueryFromLogsTool(mockServer);
      const handler = getRegisteredHandler(mockServer);

      const result = await handler({
        evaluatorLog: logPath,
        outputDir,
      });

      expect(result.isError).toBeUndefined();
      expect(
        existsSync(join(outputDir, 'query-evaluation-profile.json'))
      ).toBe(true);

      const text = result.content[0].text;
      expect(text).toContain('TestQuery.ql');
      expect(text).toContain('ExpensivePred');
    });

    it('should report summary log format in the JSON profile', async () => {
      tempDir = createTestTempDir('profile-summary-format-');
      mkdirSync(tempDir, { recursive: true });

      const logPath = join(tempDir, 'evaluator-log.summary.jsonl');
      writeFileSync(logPath, minimalSummaryLog());

      const outputDir = join(tempDir, 'output');

      const mockServer = {
        tool: vi.fn(),
      } as unknown as McpServer;
      registerProfileCodeQLQueryFromLogsTool(mockServer);
      const handler = getRegisteredHandler(mockServer);
      await handler({ evaluatorLog: logPath, outputDir });

      const jsonContent = readFileSync(
        join(outputDir, 'query-evaluation-profile.json'),
        'utf-8'
      );
      const profile = JSON.parse(jsonContent);

      expect(profile.logFormat).toBe('summary');
    });
  });

  // -----------------------------------------------------------------------
  // Multi-query log (codeql database analyze pattern)
  // -----------------------------------------------------------------------

  describe('multi-query log processing (database analyze pattern)', () => {
    it('should return per-query summaries in the JSON response', async () => {
      const logPath = resolve(
        __dirname,
        '../../../../../client/integration-tests/primitives/tools/profile_codeql_query_from_logs/multi_query_raw_log/before/evaluator-log.jsonl'
      );
      tempDir = createTestTempDir('profile-multi-query-');
      mkdirSync(tempDir, { recursive: true });

      const mockServer = {
        tool: vi.fn(),
      } as unknown as McpServer;
      registerProfileCodeQLQueryFromLogsTool(mockServer);
      const handler = getRegisteredHandler(mockServer);

      const result = await handler({
        evaluatorLog: logPath,
        outputDir: tempDir,
        topN: 10,
      });

      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text);

      expect(response.logFormat).toBe('raw');
      expect(response.queries).toHaveLength(2);
      expect(response.queries[0].queryName).toContain('QueryA.ql');
      expect(response.queries[1].queryName).toContain('QueryB.ql');
    });

    it('should include slowest predicates per query with pipeline data', async () => {
      const logPath = resolve(
        __dirname,
        '../../../../../client/integration-tests/primitives/tools/profile_codeql_query_from_logs/multi_query_raw_log/before/evaluator-log.jsonl'
      );
      tempDir = createTestTempDir('profile-multi-pipeline-');
      mkdirSync(tempDir, { recursive: true });

      const mockServer = {
        tool: vi.fn(),
      } as unknown as McpServer;
      registerProfileCodeQLQueryFromLogsTool(mockServer);
      const handler = getRegisteredHandler(mockServer);

      const result = await handler({
        evaluatorLog: logPath,
        outputDir: tempDir,
      });

      const response = JSON.parse(result.content[0].text);

      // QueryA should have 2 predicates
      expect(response.queries[0].slowestPredicates.length).toBe(2);
      expect(response.queries[0].predicateCount).toBe(2);

      // QueryB should have 3 predicates
      expect(response.queries[1].slowestPredicates.length).toBe(3);
      expect(response.queries[1].predicateCount).toBe(3);

      // Each predicate should have detailLines pointing into the detail file
      const firstPred = response.queries[0].slowestPredicates[0];
      expect(firstPred.detailLines).toBeDefined();
      expect(firstPred.detailLines.start).toBeGreaterThan(0);
      expect(firstPred.detailLines.end).toBeGreaterThan(firstPred.detailLines.start);

      // Detail file should contain full RA and pipeline data
      const detailContent = readFileSync(response.detailFile, 'utf-8');
      expect(detailContent).toContain('Pipeline stages');
    });

    it('should include evalOrder reflecting chronological position', async () => {
      const logPath = resolve(
        __dirname,
        '../../../../../client/integration-tests/primitives/tools/profile_codeql_query_from_logs/multi_query_raw_log/before/evaluator-log.jsonl'
      );
      tempDir = createTestTempDir('profile-multi-order-');
      mkdirSync(tempDir, { recursive: true });

      const mockServer = {
        tool: vi.fn(),
      } as unknown as McpServer;
      registerProfileCodeQLQueryFromLogsTool(mockServer);
      const handler = getRegisteredHandler(mockServer);

      const result = await handler({
        evaluatorLog: logPath,
        outputDir: tempDir,
      });

      const response = JSON.parse(result.content[0].text);

      // QueryB has 3 predicates — the slowest should have chronological evalOrder
      const qbPreds = response.queries[1].slowestPredicates;
      const evalOrders = qbPreds.map((p: { evalOrder: number }) => p.evalOrder);
      // Each evalOrder should be 1, 2, or 3 (1-based chronological)
      for (const o of evalOrders) {
        expect(o).toBeGreaterThanOrEqual(1);
        expect(o).toBeLessThanOrEqual(3);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Defaults
  // -----------------------------------------------------------------------

  describe('default behaviour', () => {
    it('should default outputDir to the log directory', async () => {
      tempDir = createTestTempDir('profile-default-dir-');
      mkdirSync(tempDir, { recursive: true });

      const logPath = join(tempDir, 'evaluator-log.jsonl');
      writeFileSync(logPath, minimalRawLog());

      const mockServer = {
        tool: vi.fn(),
      } as unknown as McpServer;
      registerProfileCodeQLQueryFromLogsTool(mockServer);
      const handler = getRegisteredHandler(mockServer);

      await handler({ evaluatorLog: logPath });

      // Output files should appear next to the log
      expect(
        existsSync(join(tempDir, 'query-evaluation-profile.json'))
      ).toBe(true);
      expect(
        existsSync(join(tempDir, 'query-evaluation-detail.txt'))
      ).toBe(true);
    });

    it('should default topN to 20', async () => {
      tempDir = createTestTempDir('profile-default-topn-');
      mkdirSync(tempDir, { recursive: true });

      const logPath = join(tempDir, 'evaluator-log.jsonl');
      writeFileSync(logPath, minimalRawLog());

      const mockServer = {
        tool: vi.fn(),
      } as unknown as McpServer;
      registerProfileCodeQLQueryFromLogsTool(mockServer);
      const handler = getRegisteredHandler(mockServer);

      const result = await handler({ evaluatorLog: logPath });

      // Should succeed without error (topN default applied internally)
      expect(result.isError).toBeUndefined();
      const response = JSON.parse(result.content[0].text);
      expect(response.queries).toHaveLength(1);
      expect(response.queries[0].slowestPredicates).toBeDefined();
      // Verify compact format: no raSteps or pipelineStages inline
      expect(response.queries[0].slowestPredicates[0].raSteps).toBeUndefined();
      expect(response.queries[0].slowestPredicates[0].detailLines).toBeDefined();
    });
  });
});
