/**
 * Tests for language-specific resources.
 *
 * Since resources are statically imported at build time (not loaded from
 * disk), no fs mocking is needed. Registration always succeeds because
 * the content is embedded in the bundle.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import {
  registerLanguageASTResources,
  registerLanguageAdditionalResources,
  registerLanguageResources,
  registerLanguageSecurityResources
} from '../../../src/resources/language-resources';

describe('Language Resources', () => {
  let mockServer: McpServer;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = {
      resource: vi.fn()
    } as unknown as McpServer;
  });

  describe('registerLanguageASTResources', () => {
    it('should register AST resources for all languages with AST content', () => {
      registerLanguageASTResources(mockServer);

      expect(mockServer.resource).toHaveBeenCalledTimes(9);

      const resourceCalls = (mockServer.resource as ReturnType<typeof vi.fn>).mock.calls;
      const resourceNames = resourceCalls.map((call: unknown[]) => call[0]);

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

      const resourceCalls = (mockServer.resource as ReturnType<typeof vi.fn>).mock.calls;
      const pythonCall = resourceCalls.find((call: unknown[]) => call[0] === 'PYTHON AST Reference');

      expect(pythonCall).toBeDefined();
      expect(pythonCall![1]).toBe('codeql://languages/python/ast');
      expect(pythonCall![2]).toEqual({
        description: 'CodeQL AST class reference for python programs',
        mimeType: 'text/markdown'
      });
      expect(pythonCall![3]).toBeInstanceOf(Function);
    });

    it('should return embedded content when handler is called', async () => {
      registerLanguageASTResources(mockServer);

      const resourceCalls = (mockServer.resource as ReturnType<typeof vi.fn>).mock.calls;
      const cppCall = resourceCalls.find((call: unknown[]) => call[0] === 'CPP AST Reference');
      expect(cppCall).toBeDefined();

      const handler = cppCall![3] as () => Promise<{ contents: Array<{ text: string }> }>;
      const result = await handler();
      const text = result.contents[0].text;

      expect(text).toContain('cpp');
      expect(text.length).toBeGreaterThan(100);
    });
  });

  describe('registerLanguageSecurityResources', () => {
    it('should register security resources for languages with security content', () => {
      registerLanguageSecurityResources(mockServer);

      expect(mockServer.resource).toHaveBeenCalledTimes(5);

      const resourceCalls = (mockServer.resource as ReturnType<typeof vi.fn>).mock.calls;
      const resourceNames = resourceCalls.map((call: unknown[]) => call[0]);

      expect(resourceNames).toContain('CPP Security Patterns');
      expect(resourceNames).toContain('CSHARP Security Patterns');
      expect(resourceNames).toContain('GO Security Patterns');
      expect(resourceNames).toContain('JAVASCRIPT Security Patterns');
      expect(resourceNames).toContain('PYTHON Security Patterns');
    });

    it('should register security resources with correct URIs', () => {
      registerLanguageSecurityResources(mockServer);

      const resourceCalls = (mockServer.resource as ReturnType<typeof vi.fn>).mock.calls;
      const goCall = resourceCalls.find((call: unknown[]) => call[0] === 'GO Security Patterns');

      expect(goCall).toBeDefined();
      expect(goCall![1]).toBe('codeql://languages/go/security');
      expect(goCall![2]).toEqual({
        description: 'CodeQL security query patterns and framework modeling for go',
        mimeType: 'text/markdown'
      });
    });
  });

  describe('registerLanguageAdditionalResources', () => {
    it('should register additional resources for Go language', () => {
      registerLanguageAdditionalResources(mockServer);

      expect(mockServer.resource).toHaveBeenCalledTimes(3);

      const resourceCalls = (mockServer.resource as ReturnType<typeof vi.fn>).mock.calls;
      const resourceNames = resourceCalls.map((call: unknown[]) => call[0]);

      expect(resourceNames).toContain('GO Basic Queries');
      expect(resourceNames).toContain('GO Dataflow');
      expect(resourceNames).toContain('GO Library Modeling');
    });

    it('should register additional resources with correct URIs', () => {
      registerLanguageAdditionalResources(mockServer);

      const resourceCalls = (mockServer.resource as ReturnType<typeof vi.fn>).mock.calls;
      const dataflowCall = resourceCalls.find((call: unknown[]) => call[0] === 'GO Dataflow');

      expect(dataflowCall).toBeDefined();
      expect(dataflowCall![1]).toBe('codeql://languages/go/dataflow');
      expect(dataflowCall![2]).toEqual({
        description: 'CodeQL dataflow guide for go',
        mimeType: 'text/markdown'
      });
    });
  });

  describe('registerLanguageResources', () => {
    it('should register all language resources', () => {
      registerLanguageResources(mockServer);

      // 9 AST + 5 security + 3 additional = 17
      expect(mockServer.resource).toHaveBeenCalledTimes(17);
    });

    it('every registered handler should return non-empty content', async () => {
      registerLanguageResources(mockServer);

      const calls = (mockServer.resource as ReturnType<typeof vi.fn>).mock.calls;
      for (const call of calls) {
        const handler = call[3] as () => Promise<{ contents: Array<{ text: string }> }>;
        const result = await handler();
        const text = result.contents[0].text;

        expect(text.length).toBeGreaterThan(0);
        expect(text).not.toContain('Resource file not found or could not be loaded');
      }
    });

    it('no resource content should contain YAML frontmatter', async () => {
      registerLanguageResources(mockServer);

      const calls = (mockServer.resource as ReturnType<typeof vi.fn>).mock.calls;
      for (const call of calls) {
        const name = call[0] as string;
        const handler = call[3] as () => Promise<{ contents: Array<{ text: string }> }>;
        const result = await handler();
        const text = result.contents[0].text;

        expect(text.startsWith('---'), `Resource "${name}" starts with YAML frontmatter`).toBe(false);
        expect(text).not.toMatch(/^---\s*\n/);
      }
    });
  });
});
