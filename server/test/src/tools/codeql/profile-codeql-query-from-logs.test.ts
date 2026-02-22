/**
 * Tests for the profile_codeql_query_from_logs MCP tool.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
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
        existsSync(join(outputDir, 'query-evaluation-profile.md'))
      ).toBe(true);

      // Text summary content
      const text = result.content[0].text;
      expect(text).toContain('Query log profiling completed successfully');
      expect(text).toContain('TestQuery.ql');
      expect(text).toContain('ExpensivePred');
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

    it('should write a Mermaid diagram file', async () => {
      tempDir = createTestTempDir('profile-mermaid-');
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

      const mdContent = readFileSync(
        join(outputDir, 'query-evaluation-profile.md'),
        'utf-8'
      );
      expect(mdContent).toContain('```mermaid');
      expect(mdContent).toContain('graph TD');
      expect(mdContent).toContain('TestQuery.ql');
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
        existsSync(join(tempDir, 'query-evaluation-profile.md'))
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
      expect(result.content[0].text).toContain(
        'Query log profiling completed successfully'
      );
    });
  });
});
