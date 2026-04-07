/**
 * Tests for CodeQL tools (both high-level helpers and CLI tools)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCodeQLTools } from '../../../src/tools/codeql-tools';

describe('registerCodeQLTools', () => {
  let mockServer: McpServer;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = {
      tool: vi.fn(),
      registerTool: vi.fn()
    } as unknown as McpServer;
  });

  it('should register all CodeQL tools including helpers and CLI tools', () => {
    registerCodeQLTools(mockServer);

    // Verify multiple tools are registered (via both tool() and registerTool())
    expect(mockServer.tool).toHaveBeenCalled();
    expect(mockServer.registerTool).toHaveBeenCalled();

    // Check that specific tools are registered with correct names
    // tool() calls use (name, description, schema, handler)
    const directToolCalls = (mockServer.tool as any).mock.calls;
    const directToolNames = directToolCalls.map((call: any) => call[0]);
    // registerTool() calls use (name, config, handler)
    const cliToolCalls = (mockServer.registerTool as any).mock.calls;
    const cliToolNames = cliToolCalls.map((call: any) => call[0]);
    const toolNames = [...directToolNames, ...cliToolNames];

    // High-level helper tools
    expect(toolNames).toContain('validate_codeql_query');
    expect(toolNames).toContain('create_codeql_query');
    expect(toolNames).toContain('find_class_position');
    expect(toolNames).toContain('find_predicate_position');
    expect(toolNames).toContain('list_codeql_databases');
    expect(toolNames).toContain('list_mrva_run_results');
    expect(toolNames).toContain('list_query_run_results');
    expect(toolNames).toContain('quick_evaluate');
    expect(toolNames).toContain('register_database');
    expect(toolNames).toContain('search_ql_code');

    // CLI tools
    expect(toolNames).toContain('codeql_resolve_files');

    // explain_codeql_query has been converted to a prompt, so it should NOT be in the tool list
    expect(toolNames).not.toContain('explain_codeql_query');
    // rank_sarif_results has been removed in favor of SARIF prompts
    expect(toolNames).not.toContain('rank_sarif_results');

    // Total tools registered: 14 via server.tool() + 24 via server.registerTool() = 38
    // (codeql_lsp_diagnostics moved to registerLSPTools in tools/lsp/)
    const totalRegistered = (mockServer.tool as any).mock.calls.length +
      (mockServer.registerTool as any).mock.calls.length;
    expect(totalRegistered).toBe(38);
  });

  it('should register validate_codeql_query with correct parameters', () => {
    registerCodeQLTools(mockServer);

    const validateCall = (mockServer.tool as any).mock.calls.find(
      (call: any) => call[0] === 'validate_codeql_query'
    );
    
    expect(validateCall).toBeDefined();
    expect(validateCall[1]).toContain('heuristic validation');
    expect(validateCall[1]).toContain('Does NOT compile');
    expect(validateCall[2]).toHaveProperty('query');
    expect(validateCall[2]).toHaveProperty('language');
    expect(validateCall[3]).toBeInstanceOf(Function);
  });

  it('should register create_codeql_query with correct parameters', () => {
    registerCodeQLTools(mockServer);

    const createCall = (mockServer.tool as any).mock.calls.find(
      (call: any) => call[0] === 'create_codeql_query'
    );
    
    expect(createCall).toBeDefined();
    expect(createCall[1]).toBe('Create directory structure and files for a new CodeQL query with tests');
    expect(createCall[2]).toHaveProperty('basePath');
    expect(createCall[2]).toHaveProperty('queryName');
    expect(createCall[2]).toHaveProperty('language');
    expect(createCall[2]).toHaveProperty('description');
    expect(createCall[2]).toHaveProperty('queryId');
    expect(createCall[3]).toBeInstanceOf(Function);
  });

  it('should register search_ql_code with correct parameters', () => {
    registerCodeQLTools(mockServer);

    const searchCall = (mockServer.tool as any).mock.calls.find(
      (call: any) => call[0] === 'search_ql_code'
    );

    expect(searchCall).toBeDefined();
    expect(searchCall[1]).toContain('Search QL source files');
    expect(searchCall[2]).toHaveProperty('pattern');
    expect(searchCall[2]).toHaveProperty('paths');
    expect(searchCall[3]).toBeInstanceOf(Function);
  });

  it('should register codeql_resolve_files as a CLI tool', () => {
    registerCodeQLTools(mockServer);

    // CLI tools are registered via registerTool() with (name, config, handler) signature
    const resolveFilesCall = (mockServer.registerTool as any).mock.calls.find(
      (call: any) => call[0] === 'codeql_resolve_files'
    );

    expect(resolveFilesCall).toBeDefined();
    expect(resolveFilesCall[1].description).toContain('Find files');
  });
});