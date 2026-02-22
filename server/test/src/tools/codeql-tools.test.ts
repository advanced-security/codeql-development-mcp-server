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
      tool: vi.fn()
    } as unknown as McpServer;
  });

  it('should register all CodeQL tools including helpers and CLI tools', () => {
    registerCodeQLTools(mockServer);

    // Verify multiple tools are registered
    expect(mockServer.tool).toHaveBeenCalled();
    
    // Check that specific tools are registered with correct names
    const toolCalls = (mockServer.tool as any).mock.calls;
    const toolNames = toolCalls.map((call: any) => call[0]);
    
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
    
    // explain_codeql_query has been converted to a prompt, so it should NOT be in the tool list
    expect(toolNames).not.toContain('explain_codeql_query');
    // rank_sarif_results has been removed in favor of SARIF prompts
    expect(toolNames).not.toContain('rank_sarif_results');
    
    // Total tools registered: 2 high-level helpers + 10 specialized tools + 22 CLI tools = 34
    // (codeql_lsp_diagnostics moved to registerLSPTools in tools/lsp/)
    expect(mockServer.tool).toHaveBeenCalledTimes(34);
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
});