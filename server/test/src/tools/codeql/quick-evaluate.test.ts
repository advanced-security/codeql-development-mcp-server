/**
 * Tests for quick-evaluate tool
 */

import { describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { quickEvaluate, registerQuickEvaluateTool } from '../../../../src/tools/codeql/quick-evaluate';
import { createTestTempDir } from '../../../utils/temp-dir';

// Mock the logger to suppress expected error output
vi.mock('../../../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Helper function to create unique temp files and ensure cleanup
// eslint-disable-next-line no-unused-vars
async function withTempFile<T>(content: string, testName: string, fn: (filePath: string) => Promise<T>): Promise<T> {
  const tempDir = createTestTempDir('quick-eval');
  const tempFile = join(tempDir, `${testName}.ql`);
  try {
    await fs.writeFile(tempFile, content);
    return await fn(tempFile);
  } finally {
    try {
      await fs.unlink(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

describe('quickEvaluate', () => {
  it('should successfully evaluate when class is found', async () => {
    const testContent = `
import javascript

class MyTestClass extends DataFlow::Node {
  predicate someMethod() {
    // body
  }
}
`;
    const dbPath = '/mock/database/path';
    const outputPath = '/tmp/custom-output.bqrs';

    await withTempFile(testContent, 'test-quick-eval-class', async (tempFile) => {
      const result = await quickEvaluate({
        file: tempFile,
        db: dbPath,
        symbol: 'MyTestClass',
        output_path: outputPath
      });

      expect(result).toContain('custom-output.bqrs');
    });
  });

  it('should successfully evaluate when predicate is found', async () => {
    const testContent = `
import javascript

predicate isVulnerable(DataFlow::Node node) {
  // predicate body
}
`;
    const dbPath = '/mock/database/path';

    await withTempFile(testContent, 'test-quick-eval-predicate', async (tempFile) => {
      const result = await quickEvaluate({
        file: tempFile,
        db: dbPath,
        symbol: 'isVulnerable'
      });

      expect(result).toContain('quickeval.bqrs'); // default output path
    });
  });

  it('should use default output path when not specified', async () => {
    const testContent = `class TestClass extends Node { }`;

    await withTempFile(testContent, 'test-default-output', async (tempFile) => {
      const result = await quickEvaluate({
        file: tempFile,
        db: '/mock/db',
        symbol: 'TestClass'
      });

      expect(result).toContain('quickeval.bqrs');
    });
  });

  it('should fall back to predicate search when class not found', async () => {
    const testContent = `
predicate myFunction() {
  // body
}

class SomeOtherClass extends Node {
  // body
}
`;

    await withTempFile(testContent, 'test-fallback', async (tempFile) => {
      const result = await quickEvaluate({
        file: tempFile,
        db: '/mock/db',
        symbol: 'myFunction'
      });

      expect(result).toContain('quickeval.bqrs');
    });
  });

  it('should throw error when symbol not found as class or predicate', async () => {
    const testContent = `
class ExistingClass extends Node {
  // body
}

predicate existingPredicate() {
  // body
}
`;

    await withTempFile(testContent, 'test-not-found', async (tempFile) => {
      await expect(quickEvaluate({
        file: tempFile,
        db: '/mock/db',
        symbol: 'nonExistentSymbol'
      })).rejects.toThrow("Symbol 'nonExistentSymbol' not found as class or predicate in file:");
    });
  });

  it('should throw error when file does not exist', async () => {
    // Act & Assert
    await expect(quickEvaluate({
      file: '/nonexistent/file.ql',
      db: '/mock/db',
      symbol: 'anySymbol'
    })).rejects.toThrow('CodeQL evaluation failed:');
  });

  it('should handle complex file with both classes and predicates', async () => {
    const testContent = `
import javascript

class Configuration extends DataFlow::Configuration {
  predicate isSource(DataFlow::Node source) {
    // source logic
  }
  
  predicate isSink(DataFlow::Node sink) {
    // sink logic  
  }
}

predicate hasVulnerability() {
  exists(Configuration config |
    config.hasFlow(_, _)
  )
}

class VulnerableCall extends DataFlow::CallNode {
  // call logic
}
`;

    await withTempFile(testContent, 'test-complex', async (tempFile) => {
      // Test finding a class
      const classResult = await quickEvaluate({
        file: tempFile,
        db: '/mock/db',
        symbol: 'VulnerableCall'
      });

      // Test finding a predicate
      const predicateResult = await quickEvaluate({
        file: tempFile,
        db: '/mock/db',
        symbol: 'hasVulnerability'
      });

      expect(classResult).toContain('quickeval.bqrs');
      expect(predicateResult).toContain('quickeval.bqrs');
    });
  });
});

describe('registerQuickEvaluateTool', () => {
  it('should register the quick_evaluate tool with the MCP server', () => {
    const mockServer = {
      tool: vi.fn(),
    } as unknown as McpServer;

    registerQuickEvaluateTool(mockServer);

    expect(mockServer.tool).toHaveBeenCalledOnce();
    expect(mockServer.tool).toHaveBeenCalledWith(
      'quick_evaluate',
      'Quick evaluate either a class or a predicate in a CodeQL query for debugging',
      expect.objectContaining({
        file: expect.any(Object),
        db: expect.any(Object),
        symbol: expect.any(Object),
        output_path: expect.any(Object),
      }),
      expect.any(Function)
    );
  });

  it('should return success content when handler executes successfully', async () => {
    const mockServer = {
      tool: vi.fn(),
    } as unknown as McpServer;

    registerQuickEvaluateTool(mockServer);

    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];

    const testContent = `
class TestClass extends Node {
  // body
}
`;
    await withTempFile(testContent, 'test-handler', async (tempFile) => {
      const result = await handler({
        file: tempFile,
        db: '/mock/db',
        symbol: 'TestClass',
        output_path: '/tmp/test-output.bqrs',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: expect.stringContaining('bqrs') }],
      });
    });
  });

  it('should return error content when symbol is not found', async () => {
    const mockServer = {
      tool: vi.fn(),
    } as unknown as McpServer;

    registerQuickEvaluateTool(mockServer);

    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];

    const testContent = `
class TestClass extends Node {
  // body
}
`;
    await withTempFile(testContent, 'test-handler-error', async (tempFile) => {
      const result = await handler({
        file: tempFile,
        db: '/mock/db',
        symbol: 'NonExistentSymbol',
        output_path: '/tmp/test-output.bqrs',
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: expect.stringContaining('Error:') }],
        isError: true,
      });
    });
  });

  it('should return error content when file does not exist', async () => {
    const mockServer = {
      tool: vi.fn(),
    } as unknown as McpServer;

    registerQuickEvaluateTool(mockServer);

    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];

    const result = await handler({
      file: '/nonexistent/file.ql',
      db: '/mock/db',
      symbol: 'TestClass',
    });

    expect(result).toEqual({
      content: [{ type: 'text', text: expect.stringContaining('Error:') }],
      isError: true,
    });
  });
});