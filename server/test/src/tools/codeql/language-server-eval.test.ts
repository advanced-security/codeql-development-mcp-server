/**
 * Tests for CodeQL Language Server Eval tool
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Mock the logger
vi.mock('../../../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Create mock language server instance methods
const mockStart = vi.fn();
const mockInitialize = vi.fn();
const mockEvaluateQL = vi.fn();
const mockShutdown = vi.fn();
const mockIsRunning = vi.fn();

// Mock the language-server module with a proper class
vi.mock('../../../../src/lib/language-server', () => ({
  CodeQLLanguageServer: class MockCodeQLLanguageServer {
    start = mockStart;
    initialize = mockInitialize;
    evaluateQL = mockEvaluateQL;
    shutdown = mockShutdown;
    isRunning = mockIsRunning;
  },
}));

import {
  registerLanguageServerEvalTool,
  shutdownLanguageServer,
  evaluateQLCode,
} from '../../../../src/tools/codeql/language-server-eval';

describe('Language Server Eval Tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRunning.mockReturnValue(false);
  });

  afterEach(async () => {
    // Reset the global language server state
    await shutdownLanguageServer();
  });

  describe('module structure', () => {
    it('should export registerLanguageServerEvalTool function', () => {
      expect(typeof registerLanguageServerEvalTool).toBe('function');
    });

    it('should export shutdownLanguageServer function', () => {
      expect(typeof shutdownLanguageServer).toBe('function');
    });

    it('should export evaluateQLCode function', () => {
      expect(typeof evaluateQLCode).toBe('function');
    });
  });

  describe('registerLanguageServerEvalTool', () => {
    it('should register the codeql_language_server_eval tool with the MCP server', () => {
      const mockServer = {
        tool: vi.fn(),
      } as unknown as McpServer;

      registerLanguageServerEvalTool(mockServer);

      expect(mockServer.tool).toHaveBeenCalledOnce();
      // Check the tool was registered with the correct name
      const toolCall = (mockServer.tool as any).mock.calls[0];
      expect(toolCall[0]).toBe('codeql_language_server_eval');
      // Check description mentions authoritative validation and compilation
      expect(toolCall[1]).toContain('Authoritative');
      expect(toolCall[1]).toContain('Compiles the query');
      expect(toolCall[1]).toContain('validate_codeql_query');
      // Check the schema has the expected parameters
      expect(toolCall[2]).toHaveProperty('ql_code');
      expect(toolCall[2]).toHaveProperty('workspace_uri');
      expect(toolCall[2]).toHaveProperty('search_path');
      expect(toolCall[2]).toHaveProperty('log_level');
      // Check there's a handler function
      expect(typeof toolCall[3]).toBe('function');
    });

    it('should define ql_code as a required string parameter', () => {
      const mockServer = {
        tool: vi.fn(),
      } as unknown as McpServer;

      registerLanguageServerEvalTool(mockServer);

      const schema = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(schema.ql_code).toBeDefined();
    });

    it('should define optional workspace_uri parameter', () => {
      const mockServer = {
        tool: vi.fn(),
      } as unknown as McpServer;

      registerLanguageServerEvalTool(mockServer);

      const schema = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(schema.workspace_uri).toBeDefined();
    });

    it('should define optional log_level parameter with enum values', () => {
      const mockServer = {
        tool: vi.fn(),
      } as unknown as McpServer;

      registerLanguageServerEvalTool(mockServer);

      const schema = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(schema.log_level).toBeDefined();
    });
  });

  describe('shutdownLanguageServer', () => {
    it('should be safe to call when no server is running', async () => {
      // This should not throw
      await expect(shutdownLanguageServer()).resolves.toBeUndefined();
    });
  });

  describe('evaluateQLCode', () => {
    it('should return valid result when no diagnostics are found', async () => {
      mockStart.mockResolvedValue(undefined);
      mockInitialize.mockResolvedValue(undefined);
      mockEvaluateQL.mockResolvedValue([]);

      const result = await evaluateQLCode({
        qlCode: 'import javascript\nselect 1',
      });

      expect(result.isValid).toBe(true);
      expect(result.diagnostics).toHaveLength(0);
      expect(result.summary.errorCount).toBe(0);
      expect(result.summary.warningCount).toBe(0);
      expect(result.summary.infoCount).toBe(0);
      expect(result.summary.hintCount).toBe(0);
      expect(result.formattedOutput).toContain('No issues found');
    });

    it('should return invalid result when errors are found', async () => {
      mockStart.mockResolvedValue(undefined);
      mockInitialize.mockResolvedValue(undefined);
      mockEvaluateQL.mockResolvedValue([
        {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
          severity: 1, // Error
          message: 'Syntax error',
          source: 'codeql',
        },
      ]);

      const result = await evaluateQLCode({
        qlCode: 'invalid code',
      });

      expect(result.isValid).toBe(false);
      expect(result.diagnostics).toHaveLength(1);
      expect(result.summary.errorCount).toBe(1);
      expect(result.formattedOutput).toContain('Syntax error');
      expect(result.formattedOutput).toContain('Error');
    });

    it('should count warnings separately from errors', async () => {
      mockStart.mockResolvedValue(undefined);
      mockInitialize.mockResolvedValue(undefined);
      mockEvaluateQL.mockResolvedValue([
        {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
          severity: 2, // Warning
          message: 'Deprecated syntax',
          source: 'codeql',
        },
      ]);

      const result = await evaluateQLCode({
        qlCode: 'some code with warnings',
      });

      // Valid because no errors, only warnings
      expect(result.isValid).toBe(true);
      expect(result.summary.errorCount).toBe(0);
      expect(result.summary.warningCount).toBe(1);
      expect(result.formattedOutput).toContain('Warning');
    });

    it('should count info and hint diagnostics', async () => {
      mockStart.mockResolvedValue(undefined);
      mockInitialize.mockResolvedValue(undefined);
      mockEvaluateQL.mockResolvedValue([
        {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
          severity: 3, // Information
          message: 'Info message',
        },
        {
          range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
          severity: 4, // Hint
          message: 'Hint message',
        },
      ]);

      const result = await evaluateQLCode({
        qlCode: 'some code',
      });

      expect(result.isValid).toBe(true);
      expect(result.summary.infoCount).toBe(1);
      expect(result.summary.hintCount).toBe(1);
      expect(result.formattedOutput).toContain('Information');
      expect(result.formattedOutput).toContain('Hint');
    });

    it('should handle multiple diagnostics of different severities', async () => {
      mockStart.mockResolvedValue(undefined);
      mockInitialize.mockResolvedValue(undefined);
      mockEvaluateQL.mockResolvedValue([
        {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
          severity: 1,
          message: 'Error 1',
        },
        {
          range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } },
          severity: 1,
          message: 'Error 2',
        },
        {
          range: { start: { line: 2, character: 0 }, end: { line: 2, character: 5 } },
          severity: 2,
          message: 'Warning 1',
        },
      ]);

      const result = await evaluateQLCode({
        qlCode: 'code with multiple issues',
      });

      expect(result.isValid).toBe(false);
      expect(result.diagnostics).toHaveLength(3);
      expect(result.summary.errorCount).toBe(2);
      expect(result.summary.warningCount).toBe(1);
      expect(result.formattedOutput).toContain('3 issue(s)');
    });

    it('should include diagnostic code when present', async () => {
      mockStart.mockResolvedValue(undefined);
      mockInitialize.mockResolvedValue(undefined);
      mockEvaluateQL.mockResolvedValue([
        {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
          severity: 1,
          message: 'Error message',
          code: 'ql/syntax-error',
          source: 'codeql-ls',
        },
      ]);

      const result = await evaluateQLCode({
        qlCode: 'invalid',
      });

      expect(result.formattedOutput).toContain('Code: ql/syntax-error');
      expect(result.formattedOutput).toContain('Source: codeql-ls');
    });

    it('should throw error when language server fails to start', async () => {
      mockStart.mockRejectedValue(new Error('Failed to start server'));

      await expect(evaluateQLCode({
        qlCode: 'some code',
      })).rejects.toThrow('QL evaluation failed: Failed to start server');
    });

    it('should reuse existing language server if running', async () => {
      // First call: server not running, will create and start
      mockIsRunning.mockReturnValue(false);
      mockStart.mockResolvedValue(undefined);
      mockInitialize.mockResolvedValue(undefined);
      mockEvaluateQL.mockResolvedValue([]);

      await evaluateQLCode({ qlCode: 'code 1' });

      // start should be called once for the first call
      expect(mockStart).toHaveBeenCalledTimes(1);

      // Now simulate server is running
      mockIsRunning.mockReturnValue(true);

      await evaluateQLCode({ qlCode: 'code 2' });

      // start should still only have been called once (reused)
      expect(mockStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('tool handler', () => {
    it('should return success response for valid code', async () => {
      mockStart.mockResolvedValue(undefined);
      mockInitialize.mockResolvedValue(undefined);
      mockEvaluateQL.mockResolvedValue([]);

      const mockServer = {
        tool: vi.fn(),
      } as unknown as McpServer;

      registerLanguageServerEvalTool(mockServer);

      const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];
      const result = await handler({
        ql_code: 'import javascript\nselect 1',
      });

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.isValid).toBe(true);
      expect(parsed.summary.errorCount).toBe(0);
    });

    it('should return response with diagnostics for invalid code', async () => {
      mockStart.mockResolvedValue(undefined);
      mockInitialize.mockResolvedValue(undefined);
      mockEvaluateQL.mockResolvedValue([
        {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
          severity: 1,
          message: 'Parse error',
          code: 'ql/parse',
        },
      ]);

      const mockServer = {
        tool: vi.fn(),
      } as unknown as McpServer;

      registerLanguageServerEvalTool(mockServer);

      const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];
      const result = await handler({
        ql_code: 'invalid syntax here',
      });

      expect(result.isError).toBeUndefined();
      
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.isValid).toBe(false);
      expect(parsed.diagnostics).toHaveLength(1);
      expect(parsed.diagnostics[0].line).toBe(1); // 1-based
      expect(parsed.diagnostics[0].severity).toBe('Error');
      expect(parsed.diagnostics[0].message).toBe('Parse error');
    });

    it('should return error response when evaluation fails', async () => {
      mockStart.mockRejectedValue(new Error('Connection refused'));

      const mockServer = {
        tool: vi.fn(),
      } as unknown as McpServer;

      registerLanguageServerEvalTool(mockServer);

      const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];
      const result = await handler({
        ql_code: 'some code',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('Connection refused');
    });

    it('should pass search_path option to server', async () => {
      mockStart.mockResolvedValue(undefined);
      mockInitialize.mockResolvedValue(undefined);
      mockEvaluateQL.mockResolvedValue([]);

      const mockServer = {
        tool: vi.fn(),
      } as unknown as McpServer;

      registerLanguageServerEvalTool(mockServer);

      const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];
      await handler({
        ql_code: 'import javascript',
        search_path: '/custom/ql/path',
      });

      // Verify the server was started and used to evaluate
      expect(mockStart).toHaveBeenCalled();
      expect(mockEvaluateQL).toHaveBeenCalled();
    });

    it('should pass log_level option to server', async () => {
      mockStart.mockResolvedValue(undefined);
      mockInitialize.mockResolvedValue(undefined);
      mockEvaluateQL.mockResolvedValue([]);

      const mockServer = {
        tool: vi.fn(),
      } as unknown as McpServer;

      registerLanguageServerEvalTool(mockServer);

      const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];
      await handler({
        ql_code: 'select 1',
        log_level: 'DEBUG',
      });

      expect(mockEvaluateQL).toHaveBeenCalled();
    });
  });
});