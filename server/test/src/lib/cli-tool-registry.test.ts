/**
 * Tests for CLI tool registry
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { z } from 'zod';
import { 
  registerCLITool, 
  defaultCLIResultProcessor, 
  createCodeQLSchemas,
  createQLTSchemas,
  createBQRSResultProcessor,
  createDatabaseResultProcessor,
  CLIToolDefinition
} from '../../../src/lib/cli-tool-registry';
import { CLIExecutionResult } from '../../../src/lib/cli-executor';

// Mock the CLI executor
vi.mock('../../../src/lib/cli-executor', () => ({
  executeCodeQLCommand: vi.fn(),
  executeQLTCommand: vi.fn()
}));

describe('defaultCLIResultProcessor', () => {
  it('should format successful results with stdout', () => {
    const result: CLIExecutionResult = {
      stdout: 'Success output',
      stderr: '',
      success: true
    };
    
    const formatted = defaultCLIResultProcessor(result, {});
    expect(formatted).toBe('Success output');
  });

  it('should format successful results with both stdout and stderr', () => {
    const result: CLIExecutionResult = {
      stdout: 'Success output',
      stderr: 'Warning message',
      success: true
    };
    
    const formatted = defaultCLIResultProcessor(result, {});
    expect(formatted).toBe('Success output\n\nWarnings/Info:\nWarning message');
  });

  it('should format failed results', () => {
    const result: CLIExecutionResult = {
      stdout: '',
      stderr: 'Error message',
      success: false,
      error: 'Command failed',
      exitCode: 1
    };
    
    const formatted = defaultCLIResultProcessor(result, {});
    expect(formatted).toBe('Command failed (exit code 1):\nCommand failed');
  });

  it('should handle empty output', () => {
    const result: CLIExecutionResult = {
      stdout: '',
      stderr: '',
      success: true
    };
    
    const formatted = defaultCLIResultProcessor(result, {});
    expect(formatted).toBe('Command executed successfully (no output)');
  });
});

describe('createCodeQLSchemas', () => {
  it('should create database schema', () => {
    const schema = createCodeQLSchemas.database();
    expect(schema).toBeInstanceOf(z.ZodString);
  });

  it('should create query schema', () => {
    const schema = createCodeQLSchemas.query();
    expect(schema).toBeInstanceOf(z.ZodString);
  });

  it('should create output format schema', () => {
    const schema = createCodeQLSchemas.outputFormat();
    expect(schema).toBeInstanceOf(z.ZodOptional);
  });

  it('should create threads schema', () => {
    const schema = createCodeQLSchemas.threads();
    expect(schema).toBeInstanceOf(z.ZodOptional);
  });

  it('should create positional args schema with transformation', () => {
    const schema = createCodeQLSchemas.positionalArgs();
    expect(schema).toBeDefined();
    
    // Test the transformation
    const parsed = schema.parse(['arg1', 'arg2']);
    expect(parsed).toEqual({ _positional: ['arg1', 'arg2'] });
  });
});

describe('createQLTSchemas', () => {
  it('should create language schema', () => {
    const schema = createQLTSchemas.language();
    expect(schema).toBeInstanceOf(z.ZodString);
  });

  it('should create template schema', () => {
    const schema = createQLTSchemas.template();
    expect(schema).toBeInstanceOf(z.ZodOptional);
  });

  it('should create force schema', () => {
    const schema = createQLTSchemas.force();
    expect(schema).toBeInstanceOf(z.ZodOptional);
  });
});

describe('createBQRSResultProcessor', () => {
  it('should format BQRS results with output path', () => {
    const processor = createBQRSResultProcessor();
    const result: CLIExecutionResult = {
      stdout: 'BQRS decoded successfully',
      stderr: '',
      success: true
    };
    
    const formatted = processor(result, { output: '/path/to/output.csv' });
    expect(formatted).toContain('BQRS decoded successfully');
    expect(formatted).toContain('Results saved to: /path/to/output.csv');
  });

  it('should handle failed BQRS results', () => {
    const processor = createBQRSResultProcessor();
    const result: CLIExecutionResult = {
      stdout: '',
      stderr: 'BQRS error',
      success: false,
      error: 'Failed to decode',
      exitCode: 1
    };
    
    const formatted = processor(result, {});
    expect(formatted).toContain('Command failed (exit code 1)');
    expect(formatted).toContain('Failed to decode');
  });
});

describe('createDatabaseResultProcessor', () => {
  it('should format database creation results', () => {
    const processor = createDatabaseResultProcessor();
    const result: CLIExecutionResult = {
      stdout: 'Database created',
      stderr: 'Info: Using Java extractor',
      success: true
    };
    
    const formatted = processor(result, { database: '/path/to/db' });
    expect(formatted).toContain('Database creation completed successfully');
    expect(formatted).toContain('Database location: /path/to/db');
    expect(formatted).toContain('Output:\nDatabase created');
    expect(formatted).toContain('Additional information:\nInfo: Using Java extractor');
  });

  it('should handle positional database argument', () => {
    const processor = createDatabaseResultProcessor();
    const result: CLIExecutionResult = {
      stdout: 'Database created',
      stderr: '',
      success: true
    };
    
    const formatted = processor(result, { _positional: ['my-database'] });
    expect(formatted).toContain('Database location: my-database');
  });
});

describe('registerCLITool', () => {
  let mockServer: McpServer;
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = {
      tool: vi.fn()
    } as unknown as McpServer;
  });

  it('should register a CodeQL tool correctly', () => {
    const definition: CLIToolDefinition = {
      name: 'test_codeql_tool',
      description: 'Test CodeQL tool',
      command: 'codeql',
      subcommand: 'query run',
      inputSchema: {
        query: z.string(),
        database: z.string()
      }
    };

    registerCLITool(mockServer, definition);

    expect(mockServer.tool).toHaveBeenCalledWith(
      'test_codeql_tool',
      'Test CodeQL tool',
      definition.inputSchema,
      expect.any(Function)
    );
  });

  it('should register a QLT tool correctly', () => {
    const definition: CLIToolDefinition = {
      name: 'test_qlt_tool', 
      description: 'Test QLT tool',
      command: 'qlt',
      subcommand: 'query generate',
      inputSchema: {
        language: z.string(),
        output: z.string().optional()
      }
    };

    registerCLITool(mockServer, definition);

    expect(mockServer.tool).toHaveBeenCalledWith(
      'test_qlt_tool',
      'Test QLT tool',
      definition.inputSchema,
      expect.any(Function)
    );
  });

  it('should use custom result processor if provided', () => {
    const customProcessor = vi.fn().mockReturnValue('Custom result');
    
    const definition: CLIToolDefinition = {
      name: 'test_custom_tool',
      description: 'Test tool with custom processor',
      command: 'codeql',
      subcommand: 'test',
      inputSchema: {},
      resultProcessor: customProcessor
    };

    registerCLITool(mockServer, definition);

    // Verify the tool was registered
    expect(mockServer.tool).toHaveBeenCalled();
  });
});