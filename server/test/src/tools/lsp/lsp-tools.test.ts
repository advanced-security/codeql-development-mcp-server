/**
 * Tests for LSP tool registration (lsp-tools.ts).
 *
 * Verifies that registerLSPTools registers all 5 LSP tools with correct
 * names, descriptions, schemas, and handler functions.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

// Mock logger
vi.mock('../../../../src/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock lsp-diagnostics registration
vi.mock('../../../../src/tools/lsp/lsp-diagnostics', () => ({
  registerLspDiagnosticsTool: vi.fn(),
}));

// Mock lsp-handlers
vi.mock('../../../../src/tools/lsp/lsp-handlers', () => ({
  lspCompletion: vi.fn().mockResolvedValue([]),
  lspDefinition: vi.fn().mockResolvedValue([]),
  lspReferences: vi.fn().mockResolvedValue([]),
}));

import { registerLSPTools } from '../../../../src/tools/lsp/lsp-tools';
import { registerLspDiagnosticsTool } from '../../../../src/tools/lsp/lsp-diagnostics';

describe('registerLSPTools', () => {
  let mockServer: McpServer;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = { tool: vi.fn() } as unknown as McpServer;
  });

  it('should register codeql_lsp_diagnostics via registerLspDiagnosticsTool', () => {
    registerLSPTools(mockServer);
    expect(registerLspDiagnosticsTool).toHaveBeenCalledWith(mockServer);
  });

  it('should register 3 file-based LSP tools directly', () => {
    registerLSPTools(mockServer);
    // 3 tools registered directly via server.tool (diagnostics is registered via delegate)
    expect(mockServer.tool).toHaveBeenCalledTimes(3);
  });

  it('should register codeql_lsp_completion', () => {
    registerLSPTools(mockServer);
    const calls = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls;
    const completionCall = calls.find((c: unknown[]) => c[0] === 'codeql_lsp_completion');
    expect(completionCall).toBeDefined();
    expect(completionCall![1]).toContain('completions');
    expect(completionCall![2]).toHaveProperty('file_path');
    expect(completionCall![2]).toHaveProperty('line');
    expect(completionCall![2]).toHaveProperty('character');
    expect(typeof completionCall![3]).toBe('function');
  });

  it('should register codeql_lsp_definition', () => {
    registerLSPTools(mockServer);
    const calls = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls;
    const defCall = calls.find((c: unknown[]) => c[0] === 'codeql_lsp_definition');
    expect(defCall).toBeDefined();
    expect(defCall![1]).toContain('definition');
    expect(defCall![2]).toHaveProperty('file_path');
    expect(typeof defCall![3]).toBe('function');
  });

  it('should register codeql_lsp_references', () => {
    registerLSPTools(mockServer);
    const calls = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls;
    const refsCall = calls.find((c: unknown[]) => c[0] === 'codeql_lsp_references');
    expect(refsCall).toBeDefined();
    expect(refsCall![1]).toContain('references');
    expect(refsCall![2]).toHaveProperty('file_path');
    expect(typeof refsCall![3]).toBe('function');
  });

  it('should include optional parameters in all file-based schemas', () => {
    registerLSPTools(mockServer);
    const calls = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls;

    for (const call of calls) {
      const schema = call[2];
      expect(schema).toHaveProperty('file_content');
      expect(schema).toHaveProperty('search_path');
      expect(schema).toHaveProperty('workspace_uri');
    }
  });

  describe('tool handlers', () => {
    it('codeql_lsp_completion handler should return JSON with completionCount', async () => {
      registerLSPTools(mockServer);
      const calls = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls;
      const handler = calls.find((c: unknown[]) => c[0] === 'codeql_lsp_completion')![3];

      const result = await handler({ file_path: '/test.ql', line: 0, character: 0 });

      expect(result.content).toHaveLength(1);
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('completionCount');
      expect(parsed).toHaveProperty('items');
    });

    it('codeql_lsp_definition handler should return JSON with definitionCount', async () => {
      registerLSPTools(mockServer);
      const calls = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls;
      const handler = calls.find((c: unknown[]) => c[0] === 'codeql_lsp_definition')![3];

      const result = await handler({ file_path: '/test.ql', line: 0, character: 0 });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('definitionCount');
      expect(parsed).toHaveProperty('locations');
    });

    it('codeql_lsp_references handler should return JSON with referenceCount', async () => {
      registerLSPTools(mockServer);
      const calls = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls;
      const handler = calls.find((c: unknown[]) => c[0] === 'codeql_lsp_references')![3];

      const result = await handler({ file_path: '/test.ql', line: 0, character: 0 });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toHaveProperty('referenceCount');
      expect(parsed).toHaveProperty('locations');
    });

    it('handler should return isError on failure', async () => {
      // Re-mock to throw
      const { lspCompletion } = await import('../../../../src/tools/lsp/lsp-handlers');
      vi.mocked(lspCompletion).mockRejectedValueOnce(new Error('LSP failure'));

      registerLSPTools(mockServer);
      const calls = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls;
      const handler = calls.find((c: unknown[]) => c[0] === 'codeql_lsp_completion')![3];

      const result = await handler({ file_path: '/test.ql', line: 0, character: 0 });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('LSP failure');
    });
  });
});
