/**
 * Tests for CodeQL LSP Diagnostics tool (codeql_lsp_diagnostics).
 *
 * Mocks the CodeQLServerManager to avoid spawning real CodeQL processes.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Create mock language server instance methods
const mockEvaluateQL = vi.fn().mockResolvedValue([]);
const mockInitialize = vi.fn().mockResolvedValue(undefined);
const mockIsRunning = vi.fn().mockReturnValue(true);

const mockLanguageServer = {
  evaluateQL: mockEvaluateQL,
  initialize: mockInitialize,
  isRunning: mockIsRunning,
};

const mockGetLanguageServer = vi.fn().mockResolvedValue(mockLanguageServer);
const mockShutdownServer = vi.fn().mockResolvedValue(undefined);

// Mock the server-manager module
vi.mock('../../../../src/lib/server-manager', () => ({
  getServerManager: vi.fn(() => ({
    getLanguageServer: mockGetLanguageServer,
    shutdownServer: mockShutdownServer,
  })),
}));

// Mock package-paths
vi.mock('../../../../src/utils/package-paths', () => ({
  getPackageRootDir: vi.fn(() => '/mock/pkg'),
  packageRootDir: '/mock/pkg',
}));

// Mock temp-dir to avoid filesystem operations against /mock/pkg/.tmp
vi.mock('../../../../src/utils/temp-dir', () => ({
  createProjectTempDir: vi.fn((prefix: string) => `/mock/pkg/.tmp/${prefix}test`),
  getProjectTmpBase: vi.fn(() => '/mock/pkg/.tmp'),
  getProjectTmpDir: vi.fn((name: string) => `/mock/pkg/.tmp/${name}`),
}));

import {
  lspDiagnostics,
  registerLspDiagnosticsTool,
  shutdownDiagnosticsServer,
} from '../../../../src/tools/lsp/lsp-diagnostics';

describe('LSP Diagnostics Tool', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRunning.mockReturnValue(true);
    mockEvaluateQL.mockResolvedValue([]);
    mockInitialize.mockResolvedValue(undefined);
    mockGetLanguageServer.mockResolvedValue(mockLanguageServer);
  });

  afterEach(async () => {
    await shutdownDiagnosticsServer();
  });

  describe('module structure', () => {
    it('should export lspDiagnostics function', () => {
      expect(typeof lspDiagnostics).toBe('function');
    });

    it('should export registerLspDiagnosticsTool function', () => {
      expect(typeof registerLspDiagnosticsTool).toBe('function');
    });

    it('should export shutdownDiagnosticsServer function', () => {
      expect(typeof shutdownDiagnosticsServer).toBe('function');
    });
  });

  describe('registerLspDiagnosticsTool', () => {
    it('should register the codeql_lsp_diagnostics tool with the MCP server', () => {
      const mockServer = { tool: vi.fn() } as unknown as McpServer;

      registerLspDiagnosticsTool(mockServer);

      expect(mockServer.tool).toHaveBeenCalledOnce();
      const toolCall = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(toolCall[0]).toBe('codeql_lsp_diagnostics');
      expect(toolCall[1]).toContain('Authoritative');
      expect(toolCall[1]).toContain('Compiles the query');
      expect(toolCall[1]).toContain('validate_codeql_query');
      expect(toolCall[2]).toHaveProperty('ql_code');
      expect(toolCall[2]).toHaveProperty('workspace_uri');
      expect(toolCall[2]).toHaveProperty('search_path');
      expect(toolCall[2]).toHaveProperty('log_level');
      expect(typeof toolCall[3]).toBe('function');
    });

    it('should define optional log_level parameter', () => {
      const mockServer = { tool: vi.fn() } as unknown as McpServer;
      registerLspDiagnosticsTool(mockServer);
      const schema = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(schema.log_level).toBeDefined();
    });

    it('should define optional workspace_uri parameter', () => {
      const mockServer = { tool: vi.fn() } as unknown as McpServer;
      registerLspDiagnosticsTool(mockServer);
      const schema = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(schema.workspace_uri).toBeDefined();
    });

    it('should define ql_code as a required string parameter', () => {
      const mockServer = { tool: vi.fn() } as unknown as McpServer;
      registerLspDiagnosticsTool(mockServer);
      const schema = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(schema.ql_code).toBeDefined();
    });
  });

  describe('shutdownDiagnosticsServer', () => {
    it('should delegate to server manager shutdownServer', async () => {
      await shutdownDiagnosticsServer();
      expect(mockShutdownServer).toHaveBeenCalledWith('language');
    });

    it('should be safe to call multiple times', async () => {
      await expect(shutdownDiagnosticsServer()).resolves.toBeUndefined();
      await expect(shutdownDiagnosticsServer()).resolves.toBeUndefined();
    });
  });

  describe('lspDiagnostics', () => {
    it('should return valid result when no diagnostics are found', async () => {
      mockEvaluateQL.mockResolvedValue([]);

      const result = await lspDiagnostics({ qlCode: 'import javascript\nselect 1' });

      expect(result.isValid).toBe(true);
      expect(result.diagnostics).toHaveLength(0);
      expect(result.summary.errorCount).toBe(0);
      expect(result.summary.warningCount).toBe(0);
      expect(result.summary.infoCount).toBe(0);
      expect(result.summary.hintCount).toBe(0);
      expect(result.formattedOutput).toContain('No issues found');
    });

    it('should return invalid result when errors are found', async () => {
      mockEvaluateQL.mockResolvedValue([{
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
        severity: 1,
        message: 'Syntax error',
        source: 'codeql',
      }]);

      const result = await lspDiagnostics({ qlCode: 'invalid code' });

      expect(result.isValid).toBe(false);
      expect(result.diagnostics).toHaveLength(1);
      expect(result.summary.errorCount).toBe(1);
      expect(result.formattedOutput).toContain('Syntax error');
    });

    it('should count warnings separately from errors', async () => {
      mockEvaluateQL.mockResolvedValue([{
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
        severity: 2,
        message: 'Deprecated syntax',
        source: 'codeql',
      }]);

      const result = await lspDiagnostics({ qlCode: 'some code' });

      expect(result.isValid).toBe(true);
      expect(result.summary.errorCount).toBe(0);
      expect(result.summary.warningCount).toBe(1);
      expect(result.formattedOutput).toContain('Warning');
    });

    it('should count info and hint diagnostics', async () => {
      mockEvaluateQL.mockResolvedValue([
        { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } }, severity: 3, message: 'Info' },
        { range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } }, severity: 4, message: 'Hint' },
      ]);

      const result = await lspDiagnostics({ qlCode: 'some code' });

      expect(result.isValid).toBe(true);
      expect(result.summary.infoCount).toBe(1);
      expect(result.summary.hintCount).toBe(1);
    });

    it('should handle multiple diagnostics of different severities', async () => {
      mockEvaluateQL.mockResolvedValue([
        { range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } }, severity: 1, message: 'Error 1' },
        { range: { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } }, severity: 1, message: 'Error 2' },
        { range: { start: { line: 2, character: 0 }, end: { line: 2, character: 5 } }, severity: 2, message: 'Warning 1' },
      ]);

      const result = await lspDiagnostics({ qlCode: 'code' });

      expect(result.isValid).toBe(false);
      expect(result.diagnostics).toHaveLength(3);
      expect(result.summary.errorCount).toBe(2);
      expect(result.summary.warningCount).toBe(1);
      expect(result.formattedOutput).toContain('3 issue(s)');
    });

    it('should include diagnostic code when present', async () => {
      mockEvaluateQL.mockResolvedValue([{
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
        severity: 1,
        message: 'Error message',
        code: 'ql/syntax-error',
        source: 'codeql-ls',
      }]);

      const result = await lspDiagnostics({ qlCode: 'invalid' });

      expect(result.formattedOutput).toContain('Code: ql/syntax-error');
      expect(result.formattedOutput).toContain('Source: codeql-ls');
    });

    it('should throw error when server manager fails', async () => {
      mockGetLanguageServer.mockRejectedValue(new Error('Failed to start server'));

      await expect(lspDiagnostics({ qlCode: 'some code' }))
        .rejects.toThrow('QL evaluation failed: Failed to start server');
    });

    it('should pass workspaceUri to the language server initialize', async () => {
      await lspDiagnostics({ qlCode: 'select 1', workspaceUri: 'file:///custom/workspace' });
      expect(mockInitialize).toHaveBeenCalledWith('file:///custom/workspace');
    });

    it('should reuse server via manager', async () => {
      await lspDiagnostics({ qlCode: 'code 1' });
      await lspDiagnostics({ qlCode: 'code 2' });

      expect(mockGetLanguageServer).toHaveBeenCalledTimes(2);
      expect(mockEvaluateQL).toHaveBeenCalledTimes(2);
    });
  });

  describe('tool handler', () => {
    it('should return success response for valid code', async () => {
      mockEvaluateQL.mockResolvedValue([]);

      const mockServer = { tool: vi.fn() } as unknown as McpServer;
      registerLspDiagnosticsTool(mockServer);

      const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];
      const result = await handler({ ql_code: 'import javascript\nselect 1' });

      expect(result.isError).toBeUndefined();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.isValid).toBe(true);
      expect(parsed.summary.errorCount).toBe(0);
    });

    it('should return response with diagnostics for invalid code', async () => {
      mockEvaluateQL.mockResolvedValue([{
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
        severity: 1,
        message: 'Parse error',
        code: 'ql/parse',
      }]);

      const mockServer = { tool: vi.fn() } as unknown as McpServer;
      registerLspDiagnosticsTool(mockServer);

      const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];
      const result = await handler({ ql_code: 'invalid syntax here' });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.isValid).toBe(false);
      expect(parsed.diagnostics).toHaveLength(1);
      expect(parsed.diagnostics[0].line).toBe(1);
      expect(parsed.diagnostics[0].severity).toBe('Error');
      expect(parsed.diagnostics[0].message).toBe('Parse error');
    });

    it('should return error response when evaluation fails', async () => {
      mockGetLanguageServer.mockRejectedValue(new Error('Connection refused'));

      const mockServer = { tool: vi.fn() } as unknown as McpServer;
      registerLspDiagnosticsTool(mockServer);

      const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];
      const result = await handler({ ql_code: 'some code' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error');
      expect(result.content[0].text).toContain('Connection refused');
    });

    it('should pass search_path option to server config', async () => {
      const mockServer = { tool: vi.fn() } as unknown as McpServer;
      registerLspDiagnosticsTool(mockServer);

      const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];
      await handler({ ql_code: 'import javascript', search_path: '/custom/ql/path' });

      expect(mockGetLanguageServer).toHaveBeenCalledWith(
        expect.objectContaining({ searchPath: '/custom/ql/path' }),
      );
    });

    it('should pass log_level option to server config', async () => {
      const mockServer = { tool: vi.fn() } as unknown as McpServer;
      registerLspDiagnosticsTool(mockServer);

      const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];
      await handler({ ql_code: 'select 1', log_level: 'DEBUG' });

      expect(mockGetLanguageServer).toHaveBeenCalledWith(
        expect.objectContaining({ loglevel: 'DEBUG' }),
      );
    });
  });
});
