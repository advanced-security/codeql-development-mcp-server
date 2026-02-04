/**
 * Tests for language-specific resources
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { 
  registerLanguageASTResources,
  registerLanguageSecurityResources,
  registerLanguageAdditionalResources,
  registerLanguageResources
} from '../../../src/resources/language-resources';

// Mock fs module
vi.mock('fs', () => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn()
}));

describe('Language Resources', () => {
  let mockServer: McpServer;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = {
      resource: vi.fn()
    } as unknown as McpServer;
  });

  describe('registerLanguageASTResources', () => {
    it('should register AST resources for all languages with AST files', () => {
      registerLanguageASTResources(mockServer);

      // Should register AST resources for all 9 languages
      expect(mockServer.resource).toHaveBeenCalledTimes(9);
      
      // Check that specific AST resources are registered
      const resourceCalls = (mockServer.resource as any).mock.calls;
      const resourceNames = resourceCalls.map((call: any) => call[0]);
      
      expect(resourceNames).toContain('ACTIONS AST Reference');
      expect(resourceNames).toContain('CPP AST Reference');
      expect(resourceNames).toContain('CSHARP AST Reference');
      expect(resourceNames).toContain('GO AST Reference');
      expect(resourceNames).toContain('JAVA AST Reference');
      expect(resourceNames).toContain('JAVASCRIPT AST Reference');
      expect(resourceNames).toContain('PYTHON AST Reference');
      expect(resourceNames).toContain('QL AST Reference');
      expect(resourceNames).toContain('RUBY AST Reference');
    });

    it('should register resources with correct URIs and descriptions', () => {
      registerLanguageASTResources(mockServer);

      const pythonCall = (mockServer.resource as any).mock.calls.find(
        (call: any) => call[0] === 'PYTHON AST Reference'
      );
      
      expect(pythonCall).toBeDefined();
      expect(pythonCall[1]).toBe('codeql://languages/python/ast');
      expect(pythonCall[2]).toEqual({
        description: 'CodeQL AST class reference for python programs',
        mimeType: 'text/markdown'
      });
      expect(pythonCall[3]).toBeInstanceOf(Function);
    });
  });

  describe('registerLanguageSecurityResources', () => {
    it('should register security resources for languages with security files', () => {
      registerLanguageSecurityResources(mockServer);

      // Should register security resources for 5 languages (cpp, csharp, go, javascript, python)
      expect(mockServer.resource).toHaveBeenCalledTimes(5);
      
      const resourceCalls = (mockServer.resource as any).mock.calls;
      const resourceNames = resourceCalls.map((call: any) => call[0]);
      
      expect(resourceNames).toContain('CPP Security Patterns');
      expect(resourceNames).toContain('CSHARP Security Patterns');
      expect(resourceNames).toContain('GO Security Patterns');
      expect(resourceNames).toContain('JAVASCRIPT Security Patterns');
      expect(resourceNames).toContain('PYTHON Security Patterns');
    });

    it('should register security resources with correct URIs', () => {
      registerLanguageSecurityResources(mockServer);

      const goCall = (mockServer.resource as any).mock.calls.find(
        (call: any) => call[0] === 'GO Security Patterns'
      );
      
      expect(goCall).toBeDefined();
      expect(goCall[1]).toBe('codeql://languages/go/security');
      expect(goCall[2]).toEqual({
        description: 'CodeQL security query patterns and framework modeling for go',
        mimeType: 'text/markdown'
      });
    });
  });

  describe('registerLanguageAdditionalResources', () => {
    it('should register additional resources for Go language', () => {
      registerLanguageAdditionalResources(mockServer);

      // Should register 3 additional resources (3 for Go)
      expect(mockServer.resource).toHaveBeenCalledTimes(3);
      
      const resourceCalls = (mockServer.resource as any).mock.calls;
      const resourceNames = resourceCalls.map((call: any) => call[0]);
      
      expect(resourceNames).toContain('GO Dataflow');
      expect(resourceNames).toContain('GO Library Modeling');
      expect(resourceNames).toContain('GO Basic Queries');
    });

    it('should register additional resources with correct URIs', () => {
      registerLanguageAdditionalResources(mockServer);

      const dataflowCall = (mockServer.resource as any).mock.calls.find(
        (call: any) => call[0] === 'GO Dataflow'
      );
      
      expect(dataflowCall).toBeDefined();
      expect(dataflowCall[1]).toBe('codeql://languages/go/dataflow');
      expect(dataflowCall[2]).toEqual({
        description: 'CodeQL dataflow guide for go',
        mimeType: 'text/markdown'
      });
    });
  });

  describe('registerLanguageResources', () => {
    it('should register all language resources', () => {
      registerLanguageResources(mockServer);

      // Should register:
      // - 9 AST resources
      // - 5 security resources  
      // - 3 additional resources (3 for Go)
      // Total: 17 resources
      expect(mockServer.resource).toHaveBeenCalledTimes(17);
    });
  });
});