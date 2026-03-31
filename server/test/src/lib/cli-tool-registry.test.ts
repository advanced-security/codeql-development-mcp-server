/**
 * Tests for CLI tool registry
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
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
import { createTestTempDir } from '../../utils/temp-dir';

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

describe('registerCLITool handler behavior', () => {
  let mockServer: McpServer;
  let executeCodeQLCommand: ReturnType<typeof vi.fn>;
  
  beforeEach(async () => {
    vi.clearAllMocks();
    mockServer = {
      tool: vi.fn()
    } as unknown as McpServer;
    
    // Get the mocked function
    const cliExecutor = await import('../../../src/lib/cli-executor');
    executeCodeQLCommand = cliExecutor.executeCodeQLCommand as ReturnType<typeof vi.fn>;
  });

  it('should handle qlref parameter as positional argument for codeql_resolve_qlref', async () => {
    const definition: CLIToolDefinition = {
      name: 'codeql_resolve_qlref',
      description: 'Resolve qlref files',
      command: 'codeql',
      subcommand: 'resolve qlref',
      inputSchema: {
        qlref: z.string()
      }
    };

    registerCLITool(mockServer, definition);
    
    // Get the handler function that was registered
    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];
    
    // Mock successful command execution
    executeCodeQLCommand.mockResolvedValueOnce({
      stdout: '/path/to/resolved.ql',
      stderr: '',
      success: true
    });

    // Call the handler with qlref parameter
    const result = await handler({ qlref: '/path/to/test.qlref' });

    // Verify the command was called with the qlref as positional argument
    // executeCodeQLCommand signature: (subcommand, options, additionalArgs, cwd)
    expect(executeCodeQLCommand).toHaveBeenCalledWith(
      'resolve qlref',
      expect.any(Object),
      ['/path/to/test.qlref'],
      undefined
    );
    
    expect(result.content[0].text).toBe('/path/to/resolved.ql');
  });

  it('should handle database parameter as positional argument for codeql_resolve_database', async () => {
    const definition: CLIToolDefinition = {
      name: 'codeql_resolve_database',
      description: 'Resolve database',
      command: 'codeql',
      subcommand: 'resolve database',
      inputSchema: {
        database: z.string()
      }
    };

    registerCLITool(mockServer, definition);
    
    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];
    
    executeCodeQLCommand.mockResolvedValueOnce({
      stdout: '{"languages": ["javascript"]}',
      stderr: '',
      success: true
    });

    await handler({ database: '/path/to/db' });

    // executeCodeQLCommand signature: (subcommand, options, additionalArgs, cwd)
    expect(executeCodeQLCommand).toHaveBeenCalledWith(
      'resolve database',
      expect.any(Object),
      ['/path/to/db'],
      undefined
    );
  });

  it('should auto-resolve single-child database directory for codeql_resolve_database', async () => {
    // Create a parent directory with one database subdirectory
    const parentDir = createTestTempDir('db-resolve-single-');
    const dbDir = join(parentDir, 'javascript');
    mkdirSync(dbDir, { recursive: true });
    writeFileSync(join(dbDir, 'codeql-database.yml'), 'primaryLanguage: javascript\n');

    const definition: CLIToolDefinition = {
      name: 'codeql_resolve_database',
      description: 'Resolve database',
      command: 'codeql',
      subcommand: 'resolve database',
      inputSchema: { database: z.string() }
    };

    registerCLITool(mockServer, definition);
    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];

    executeCodeQLCommand.mockResolvedValueOnce({
      stdout: '{"languages": ["javascript"]}',
      stderr: '',
      success: true
    });

    await handler({ database: parentDir });

    // Should resolve to the child directory
    expect(executeCodeQLCommand).toHaveBeenCalledWith(
      'resolve database',
      expect.any(Object),
      [dbDir],
      undefined
    );

    // Cleanup
    rmSync(parentDir, { recursive: true, force: true });
  });

  it('should error on ambiguous multi-database directory for codeql_resolve_database', async () => {
    // Create a parent directory with two database subdirectories
    const parentDir = createTestTempDir('db-resolve-ambiguous-');
    for (const lang of ['javascript', 'python']) {
      const dbDir = join(parentDir, lang);
      mkdirSync(dbDir, { recursive: true });
      writeFileSync(join(dbDir, 'codeql-database.yml'), `primaryLanguage: ${lang}\n`);
    }

    const definition: CLIToolDefinition = {
      name: 'codeql_resolve_database',
      description: 'Resolve database',
      command: 'codeql',
      subcommand: 'resolve database',
      inputSchema: { database: z.string() }
    };

    registerCLITool(mockServer, definition);
    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];

    const result = await handler({ database: parentDir });

    // Should return an error about ambiguous databases
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Ambiguous database path');
    expect(result.content[0].text).toContain('javascript');
    expect(result.content[0].text).toContain('python');

    // Cleanup
    rmSync(parentDir, { recursive: true, force: true });
  });

  it('should handle database parameter as positional argument for codeql_database_create', async () => {
    const definition: CLIToolDefinition = {
      name: 'codeql_database_create',
      description: 'Create database',
      command: 'codeql',
      subcommand: 'database create',
      inputSchema: {
        database: z.string(),
        language: z.string().optional()
      }
    };

    registerCLITool(mockServer, definition);
    
    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];
    
    executeCodeQLCommand.mockResolvedValueOnce({
      stdout: 'Database created successfully',
      stderr: '',
      success: true
    });

    await handler({ database: '/path/to/new-db', language: 'javascript' });

    // executeCodeQLCommand signature: (subcommand, options, additionalArgs, cwd)
    expect(executeCodeQLCommand).toHaveBeenCalledWith(
      'database create',
      expect.objectContaining({
        language: 'javascript'
      }),
      ['/path/to/new-db'],
      undefined
    );
  });

  it('should handle database and queries parameters as positional arguments for codeql_database_analyze', async () => {
    const definition: CLIToolDefinition = {
      name: 'codeql_database_analyze',
      description: 'Analyze database',
      command: 'codeql',
      subcommand: 'database analyze',
      inputSchema: {
        database: z.string(),
        queries: z.string(),
        format: z.string().optional()
      }
    };

    registerCLITool(mockServer, definition);
    
    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];
    
    executeCodeQLCommand.mockResolvedValueOnce({
      stdout: 'Analysis complete',
      stderr: '',
      success: true
    });

    await handler({ database: '/path/to/db', queries: 'security-queries', format: 'sarif-latest' });

    // executeCodeQLCommand signature: (subcommand, options, additionalArgs, cwd)
    expect(executeCodeQLCommand).toHaveBeenCalledWith(
      'database analyze',
      expect.objectContaining({
        format: 'sarif-latest'
      }),
      ['/path/to/db', 'security-queries'],
      undefined
    );
  });

  it('should handle query parameter as positional argument for codeql_generate_query-help', async () => {
    const definition: CLIToolDefinition = {
      name: 'codeql_generate_query-help',
      description: 'Generate query help',
      command: 'codeql',
      subcommand: 'generate query-help',
      inputSchema: {
        query: z.string(),
        format: z.string().optional()
      }
    };

    registerCLITool(mockServer, definition);
    
    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];
    
    executeCodeQLCommand.mockResolvedValueOnce({
      stdout: '# Query Help\nThis is help content',
      stderr: '',
      success: true
    });

    await handler({ query: '/path/to/query.ql', format: 'markdown' });

    // executeCodeQLCommand signature: (subcommand, options, additionalArgs, cwd)
    expect(executeCodeQLCommand).toHaveBeenCalledWith(
      'generate query-help',
      expect.objectContaining({
        format: 'markdown'
      }),
      ['/path/to/query.ql'],
      undefined
    );
  });

  it('should pass format to CLI for codeql_bqrs_interpret', async () => {
    const definition: CLIToolDefinition = {
      name: 'codeql_bqrs_interpret',
      description: 'Interpret BQRS',
      command: 'codeql',
      subcommand: 'bqrs interpret',
      inputSchema: {
        file: z.string(),
        format: z.string().optional()
      }
    };

    registerCLITool(mockServer, definition);
    
    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];
    
    executeCodeQLCommand.mockResolvedValueOnce({
      stdout: 'Interpreted',
      stderr: '',
      success: true
    });

    await handler({ file: '/path/to/results.bqrs', format: 'sarif-latest' });

    // executeCodeQLCommand signature: (subcommand, options, additionalArgs, cwd)
    expect(executeCodeQLCommand).toHaveBeenCalledWith(
      'bqrs interpret',
      expect.objectContaining({
        format: 'sarif-latest'
      }),
      ['/path/to/results.bqrs'],
      undefined
    );
  });

  it('should auto-resolve source-location-prefix from codeql-database.yml for bqrs_interpret with database', async () => {
    // Create a temp database directory with codeql-database.yml containing sourceLocationPrefix
    const tmpDir = createTestTempDir('bqrs-interpret-slp');
    const dbDir = join(tmpDir, 'test-db');
    mkdirSync(dbDir, { recursive: true });
    writeFileSync(join(dbDir, 'codeql-database.yml'), [
      'primaryLanguage: javascript',
      'sourceLocationPrefix: /Users/dev/my-project',
      'creationMetadata:',
      '  cliVersion: 2.25.1',
    ].join('\n'), 'utf8');
    // Create src.zip so source-archive resolution succeeds
    writeFileSync(join(dbDir, 'src.zip'), '', 'utf8');

    const definition: CLIToolDefinition = {
      name: 'codeql_bqrs_interpret',
      description: 'Interpret BQRS',
      command: 'codeql',
      subcommand: 'bqrs interpret',
      inputSchema: {
        file: z.string(),
        database: z.string().optional(),
        format: z.string().optional()
      }
    };

    registerCLITool(mockServer, definition);

    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];

    executeCodeQLCommand.mockResolvedValueOnce({
      stdout: 'Interpreted',
      stderr: '',
      success: true
    });

    try {
      await handler({ file: '/path/to/results.bqrs', database: dbDir, format: 'sarif-latest' });

      const callArgs = executeCodeQLCommand.mock.calls[0];
      const options = callArgs[1] as Record<string, unknown>;
      // source-location-prefix should be auto-resolved from codeql-database.yml
      expect(options['source-location-prefix']).toBe('/Users/dev/my-project');
      // source-archive should point to src.zip
      expect(options['source-archive']).toBe(join(dbDir, 'src.zip'));
      // database should be removed from options (not passed to CLI)
      expect(options).not.toHaveProperty('database');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should not set source-location-prefix when codeql-database.yml has no sourceLocationPrefix for bqrs_interpret', async () => {
    // Create a temp database directory with codeql-database.yml WITHOUT sourceLocationPrefix
    const tmpDir = createTestTempDir('bqrs-interpret-no-slp');
    const dbDir = join(tmpDir, 'test-db');
    mkdirSync(dbDir, { recursive: true });
    writeFileSync(join(dbDir, 'codeql-database.yml'), [
      'primaryLanguage: javascript',
      'creationMetadata:',
      '  cliVersion: 2.25.1',
    ].join('\n'), 'utf8');
    // Create src directory as fallback source archive
    mkdirSync(join(dbDir, 'src'), { recursive: true });

    const definition: CLIToolDefinition = {
      name: 'codeql_bqrs_interpret',
      description: 'Interpret BQRS',
      command: 'codeql',
      subcommand: 'bqrs interpret',
      inputSchema: {
        file: z.string(),
        database: z.string().optional(),
        format: z.string().optional()
      }
    };

    registerCLITool(mockServer, definition);

    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];

    executeCodeQLCommand.mockResolvedValueOnce({
      stdout: 'Interpreted',
      stderr: '',
      success: true
    });

    try {
      await handler({ file: '/path/to/results.bqrs', database: dbDir, format: 'sarif-latest' });

      const callArgs = executeCodeQLCommand.mock.calls[0];
      const options = callArgs[1] as Record<string, unknown>;
      // source-location-prefix should NOT be set when not in codeql-database.yml
      expect(options).not.toHaveProperty('source-location-prefix');
      // source-archive should fall back to src directory
      expect(options['source-archive']).toBe(join(dbDir, 'src'));
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('should NOT pass format to CLI options for tools where format should not be on CLI', async () => {
    const definition: CLIToolDefinition = {
      name: 'codeql_query_run',
      description: 'Run query',
      command: 'codeql',
      subcommand: 'query run',
      inputSchema: {
        database: z.string(),
        format: z.string().optional()
      }
    };

    registerCLITool(mockServer, definition);
    
    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];
    
    executeCodeQLCommand.mockResolvedValueOnce({
      stdout: 'Query completed',
      stderr: '',
      success: true
    });

    await handler({ database: '/path/to/db', format: 'csv' });

    // format should be extracted and NOT passed to CLI options for codeql_query_run
    // The first argument (options object) should not contain 'format'
    const callArgs = executeCodeQLCommand.mock.calls[0];
    const options = callArgs[1] as Record<string, unknown>;
    expect(options).not.toHaveProperty('format');
  });

  it('should handle file parameter as positional for BQRS tools', async () => {
    const definition: CLIToolDefinition = {
      name: 'codeql_bqrs_decode',
      description: 'Decode BQRS',
      command: 'codeql',
      subcommand: 'bqrs decode',
      inputSchema: {
        file: z.string()
      }
    };

    registerCLITool(mockServer, definition);
    
    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];
    
    executeCodeQLCommand.mockResolvedValueOnce({
      stdout: '{"results": []}',
      stderr: '',
      success: true
    });

    await handler({ file: '/path/to/results.bqrs' });

    // executeCodeQLCommand signature: (subcommand, options, additionalArgs, cwd)
    expect(executeCodeQLCommand).toHaveBeenCalledWith(
      'bqrs decode',
      expect.any(Object),
      ['/path/to/results.bqrs'],
      undefined
    );
  });

  it('should strip JSON array brackets from file parameter for BQRS tools', async () => {
    // Regression test: some MCP clients send the file parameter as a JSON-encoded
    // array string like '["/path/to/file.bqrs"]' instead of a plain path.
    // The handler must extract the path without brackets.
    const definition: CLIToolDefinition = {
      name: 'codeql_bqrs_interpret',
      description: 'Interpret BQRS',
      command: 'codeql',
      subcommand: 'bqrs interpret',
      inputSchema: {
        file: z.string(),
        format: z.string().optional()
      }
    };

    registerCLITool(mockServer, definition);

    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];

    executeCodeQLCommand.mockResolvedValueOnce({
      stdout: 'Interpreted',
      stderr: '',
      success: true
    });

    // Simulate MCP client sending JSON-encoded array as file string
    await handler({ file: '["/path/to/results.bqrs"]', format: 'sarif-latest' });

    const callArgs = executeCodeQLCommand.mock.calls[0];
    const positionalArgs = callArgs[2] as string[];
    // Should extract the clean path without brackets
    expect(positionalArgs).toContain('/path/to/results.bqrs');
    expect(positionalArgs).not.toContain('["/path/to/results.bqrs"]');
  });

  it('should handle file parameter passed as actual array for BQRS tools', async () => {
    // Edge case: MCP SDK might not validate and pass an actual array through
    const definition: CLIToolDefinition = {
      name: 'codeql_bqrs_info',
      description: 'BQRS info',
      command: 'codeql',
      subcommand: 'bqrs info',
      inputSchema: {
        file: z.string()
      }
    };

    registerCLITool(mockServer, definition);

    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];

    executeCodeQLCommand.mockResolvedValueOnce({
      stdout: 'Info output',
      stderr: '',
      success: true
    });

    // Simulate passing an actual array instead of a string
    await handler({ file: ['/path/to/results.bqrs'] as unknown as string });

    const callArgs = executeCodeQLCommand.mock.calls[0];
    const positionalArgs = callArgs[2] as string[];
    // Should extract the first element from the array
    expect(positionalArgs).toContain('/path/to/results.bqrs');
  });

  it('should handle tests parameter as positional for test tools', async () => {
    const definition: CLIToolDefinition = {
      name: 'codeql_test_run',
      description: 'Run tests',
      command: 'codeql',
      subcommand: 'test run',
      inputSchema: {
        tests: z.array(z.string())
      }
    };

    registerCLITool(mockServer, definition);
    
    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];
    
    executeCodeQLCommand.mockResolvedValueOnce({
      stdout: 'All tests passed',
      stderr: '',
      success: true
    });

    await handler({ tests: ['/path/to/test1.ql', '/path/to/test2.ql'] });

    // executeCodeQLCommand signature: (subcommand, options, additionalArgs, cwd)
    expect(executeCodeQLCommand).toHaveBeenCalledWith(
      'test run',
      expect.any(Object),
      ['/path/to/test1.ql', '/path/to/test2.ql'],
      undefined
    );
  });

  it('should resolve relative tests parameter against user workspace dir', async () => {
    const definition: CLIToolDefinition = {
      name: 'codeql_test_run',
      description: 'Run tests',
      command: 'codeql',
      subcommand: 'test run',
      inputSchema: {
        tests: z.array(z.string())
      }
    };

    registerCLITool(mockServer, definition);
    
    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];
    
    executeCodeQLCommand.mockResolvedValueOnce({
      stdout: 'All tests passed',
      stderr: '',
      success: true
    });

    // Test with relative paths
    await handler({ tests: ['relative/test1.ql', '/absolute/test2.ql'] });

    // executeCodeQLCommand signature: (subcommand, options, additionalArgs, cwd)
    const call = executeCodeQLCommand.mock.calls[0];
    const positionalArgs = call[2];
    
    // First relative path should be resolved to absolute
    expect(positionalArgs[0]).not.toBe('relative/test1.ql');
    expect(positionalArgs[0]).toContain('relative/test1.ql');
    
    // Second absolute path should remain unchanged
    expect(positionalArgs[1]).toBe('/absolute/test2.ql');
  });

  it('should resolve relative database parameter against user workspace dir', async () => {
    const definition: CLIToolDefinition = {
      name: 'codeql_query_run',
      description: 'Run query',
      command: 'codeql',
      subcommand: 'query run',
      inputSchema: {
        database: z.string(),
        query: z.string()
      }
    };

    registerCLITool(mockServer, definition);
    
    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];
    
    executeCodeQLCommand.mockResolvedValueOnce({
      stdout: '{"columns":[]}',
      stderr: '',
      success: true
    });

    // Test with relative database path
    await handler({ database: 'my-database', query: '/path/to/query.ql' });

    // executeCodeQLCommand signature: (subcommand, options, additionalArgs, cwd)
    const call = executeCodeQLCommand.mock.calls[0];
    const options = call[1];
    
    // Relative database path should be resolved to absolute
    expect(options.database).not.toBe('my-database');
    expect(options.database).toContain('my-database');
  });

  it('should resolve relative dir/packDir parameter against user workspace dir', async () => {
    const definition: CLIToolDefinition = {
      name: 'codeql_pack_install',
      description: 'Install packs',
      command: 'codeql',
      subcommand: 'pack install',
      inputSchema: {
        dir: z.string()
      }
    };

    registerCLITool(mockServer, definition);
    
    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];
    
    executeCodeQLCommand.mockResolvedValueOnce({
      stdout: 'Installed successfully',
      stderr: '',
      success: true
    });

    // Test with relative dir path
    await handler({ dir: 'my-pack-dir' });

    // executeCodeQLCommand signature: (subcommand, options, additionalArgs, cwd)
    const call = executeCodeQLCommand.mock.calls[0];
    const cwd = call[3];
    
    // Relative dir should be resolved to absolute for cwd
    expect(cwd).not.toBe('my-pack-dir');
    expect(cwd).toContain('my-pack-dir');
  });

  it('should handle dir parameter as positional for pack_ls', async () => {
    const definition: CLIToolDefinition = {
      name: 'codeql_pack_ls',
      description: 'List packs',
      command: 'codeql',
      subcommand: 'pack ls',
      inputSchema: {
        dir: z.string()
      }
    };

    registerCLITool(mockServer, definition);
    
    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];
    
    executeCodeQLCommand.mockResolvedValueOnce({
      stdout: 'pack1\npack2',
      stderr: '',
      success: true
    });

    await handler({ dir: '/path/to/packs' });

    // executeCodeQLCommand signature: (subcommand, options, additionalArgs, cwd)
    // For pack_ls, the dir is passed both as positional arg and as cwd
    expect(executeCodeQLCommand).toHaveBeenCalledWith(
      'pack ls',
      expect.any(Object),
      ['/path/to/packs'],
      '/path/to/packs'
    );
  });

  it('should pass additionalArgs as raw CLI arguments for codeql_database_analyze', async () => {
    const definition: CLIToolDefinition = {
      name: 'codeql_database_analyze',
      description: 'Analyze database',
      command: 'codeql',
      subcommand: 'database analyze',
      inputSchema: {
        database: z.string(),
        queries: z.string(),
        format: z.string().optional(),
        additionalArgs: z.array(z.string()).optional()
      }
    };

    registerCLITool(mockServer, definition);

    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];

    executeCodeQLCommand.mockResolvedValueOnce({
      stdout: 'Analysis complete',
      stderr: '',
      success: true
    });

    await handler({
      database: '/path/to/db',
      queries: 'security-queries',
      format: 'sarif-latest',
      additionalArgs: ['--sarif-include-query-help=always', '--no-sarif-minify']
    });

    // executeCodeQLCommand signature: (subcommand, options, additionalArgs, cwd)
    const call = executeCodeQLCommand.mock.calls[0];
    const options = call[1];
    const positionalArgs = call[2];

    // additionalArgs must NOT appear in the options object
    expect(options).not.toHaveProperty('additionalArgs');

    // The raw additional args should be appended after positional args
    expect(positionalArgs).toContain('/path/to/db');
    expect(positionalArgs).toContain('security-queries');
    expect(positionalArgs).toContain('--sarif-include-query-help=always');
    expect(positionalArgs).toContain('--no-sarif-minify');
  });

  it('should handle missing additionalArgs gracefully', async () => {
    const definition: CLIToolDefinition = {
      name: 'codeql_database_analyze',
      description: 'Analyze database',
      command: 'codeql',
      subcommand: 'database analyze',
      inputSchema: {
        database: z.string(),
        queries: z.string(),
        additionalArgs: z.array(z.string()).optional()
      }
    };

    registerCLITool(mockServer, definition);

    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];

    executeCodeQLCommand.mockResolvedValueOnce({
      stdout: 'Analysis complete',
      stderr: '',
      success: true
    });

    await handler({
      database: '/path/to/db',
      queries: 'security-queries'
    });

    // executeCodeQLCommand signature: (subcommand, options, additionalArgs, cwd)
    const call = executeCodeQLCommand.mock.calls[0];
    const options = call[1];
    const positionalArgs = call[2];

    // additionalArgs must NOT appear in the options object
    expect(options).not.toHaveProperty('additionalArgs');

    // Positional args should only contain db and queries
    expect(positionalArgs).toEqual(['/path/to/db', 'security-queries']);
  });

  it('should pass additionalArgs as raw CLI arguments for any tool', async () => {
    const definition: CLIToolDefinition = {
      name: 'codeql_test_tool',
      description: 'Test tool',
      command: 'codeql',
      subcommand: 'test',
      inputSchema: {
        additionalArgs: z.array(z.string()).optional()
      }
    };

    registerCLITool(mockServer, definition);

    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];

    executeCodeQLCommand.mockResolvedValueOnce({
      stdout: 'Success',
      stderr: '',
      success: true
    });

    await handler({
      additionalArgs: ['--custom-flag', '--key=value']
    });

    // executeCodeQLCommand signature: (subcommand, options, additionalArgs, cwd)
    const call = executeCodeQLCommand.mock.calls[0];
    const options = call[1];
    const positionalArgs = call[2];

    // additionalArgs must NOT appear in the options object
    expect(options).not.toHaveProperty('additionalArgs');

    // The raw additional args should be passed through
    expect(positionalArgs).toContain('--custom-flag');
    expect(positionalArgs).toContain('--key=value');
  });

  it('should filter managed flags from additionalArgs for tools with post-processing', async () => {
    const definition: CLIToolDefinition = {
      name: 'codeql_database_analyze',
      description: 'Analyze database',
      command: 'codeql',
      subcommand: 'database analyze',
      inputSchema: {
        database: z.string(),
        queries: z.string(),
        additionalArgs: z.array(z.string()).optional()
      }
    };

    registerCLITool(mockServer, definition);

    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];

    executeCodeQLCommand.mockResolvedValueOnce({
      stdout: 'Analysis complete',
      stderr: '',
      success: true
    });

    await handler({
      database: '/path/to/db',
      queries: 'security-queries',
      additionalArgs: [
        '--sarif-include-query-help=always',
        '--logdir=/override',
        '--evaluator-log=/override.jsonl',
        '--output=/override.sarif',
        '--no-tuple-counting',
        '--verbosity=errors',
        '--no-sarif-minify'
      ]
    });

    // executeCodeQLCommand signature: (subcommand, options, additionalArgs, cwd)
    const call = executeCodeQLCommand.mock.calls[0];
    const positionalArgs = call[2];

    // Non-managed flags should be passed through
    expect(positionalArgs).toContain('--sarif-include-query-help=always');
    expect(positionalArgs).toContain('--no-sarif-minify');

    // Managed flags should be filtered out
    expect(positionalArgs).not.toContain('--logdir=/override');
    expect(positionalArgs).not.toContain('--evaluator-log=/override.jsonl');
    expect(positionalArgs).not.toContain('--output=/override.sarif');
    expect(positionalArgs).not.toContain('--no-tuple-counting');
    expect(positionalArgs).not.toContain('--verbosity=errors');
  });

  it('should filter space-separated managed flags and their values from additionalArgs', async () => {
    const definition: CLIToolDefinition = {
      name: 'codeql_database_analyze',
      description: 'Analyze database',
      command: 'codeql',
      subcommand: 'database analyze',
      inputSchema: {
        database: z.string(),
        queries: z.string(),
        additionalArgs: z.array(z.string()).optional()
      }
    };

    registerCLITool(mockServer, definition);

    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];

    executeCodeQLCommand.mockResolvedValueOnce({
      stdout: 'Analysis complete',
      stderr: '',
      success: true
    });

    await handler({
      database: '/path/to/db',
      queries: 'security-queries',
      additionalArgs: [
        '--sarif-include-query-help=always',
        '--output', '/override.sarif',
        '--logdir', '/override',
        '--verbosity', 'errors',
        '--no-sarif-minify'
      ]
    });

    // executeCodeQLCommand signature: (subcommand, options, additionalArgs, cwd)
    const call = executeCodeQLCommand.mock.calls[0];
    const positionalArgs = call[2];

    // Non-managed flags should be passed through
    expect(positionalArgs).toContain('--sarif-include-query-help=always');
    expect(positionalArgs).toContain('--no-sarif-minify');

    // Managed flags AND their space-separated values should be filtered out
    expect(positionalArgs).not.toContain('--output');
    expect(positionalArgs).not.toContain('/override.sarif');
    expect(positionalArgs).not.toContain('--logdir');
    expect(positionalArgs).not.toContain('/override');
    expect(positionalArgs).not.toContain('--verbosity');
    expect(positionalArgs).not.toContain('errors');
  });

  it('should return error content when command fails', async () => {
    const definition: CLIToolDefinition = {
      name: 'codeql_test_tool',
      description: 'Test tool',
      command: 'codeql',
      subcommand: 'test',
      inputSchema: {}
    };

    registerCLITool(mockServer, definition);
    
    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];
    
    executeCodeQLCommand.mockResolvedValueOnce({
      stdout: '',
      stderr: 'Some error occurred',
      success: false,
      error: 'Command failed',
      exitCode: 1
    });

    const result = await handler({});

    expect(result.content[0].text).toContain('Command failed');
  });

  it('should return error when file parameter is an empty array for BQRS tools', async () => {
    const definition: CLIToolDefinition = {
      name: 'codeql_bqrs_decode',
      description: 'Decode BQRS',
      command: 'codeql',
      subcommand: 'bqrs decode',
      inputSchema: {
        file: z.string()
      }
    };

    registerCLITool(mockServer, definition);

    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];

    // Simulate passing an empty array as the file parameter
    const result = await handler({ file: [] as unknown as string });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('The "file" parameter for BQRS tools must be a non-empty string path to a .bqrs file.');
  });

  it('should return error when file parameter is a JSON-encoded empty array string for BQRS tools', async () => {
    const definition: CLIToolDefinition = {
      name: 'codeql_bqrs_info',
      description: 'BQRS info',
      command: 'codeql',
      subcommand: 'bqrs info',
      inputSchema: {
        file: z.string()
      }
    };

    registerCLITool(mockServer, definition);

    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];

    // Simulate passing a JSON-encoded empty array string
    const result = await handler({ file: '[]' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('The "file" parameter for BQRS tools must be a non-empty string path to a .bqrs file.');
  });

  it('should not override explicit source-archive when database is provided for bqrs_interpret', async () => {
    const tmpDir = createTestTempDir('bqrs-interpret-explicit-sa');
    const dbDir = join(tmpDir, 'test-db');
    mkdirSync(dbDir, { recursive: true });
    writeFileSync(join(dbDir, 'codeql-database.yml'), [
      'primaryLanguage: javascript',
      'sourceLocationPrefix: /Users/dev/my-project',
    ].join('\n'), 'utf8');
    // Create src.zip so auto-resolution would normally pick it
    writeFileSync(join(dbDir, 'src.zip'), '', 'utf8');

    const definition: CLIToolDefinition = {
      name: 'codeql_bqrs_interpret',
      description: 'Interpret BQRS',
      command: 'codeql',
      subcommand: 'bqrs interpret',
      inputSchema: {
        file: z.string(),
        database: z.string().optional(),
        'source-archive': z.string().optional(),
        'source-location-prefix': z.string().optional(),
        format: z.string().optional()
      }
    };

    registerCLITool(mockServer, definition);

    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];

    executeCodeQLCommand.mockResolvedValueOnce({
      stdout: 'Interpreted',
      stderr: '',
      success: true
    });

    try {
      // Provide explicit source-archive and source-location-prefix alongside database
      await handler({
        file: '/path/to/results.bqrs',
        database: dbDir,
        'source-archive': '/explicit/archive.zip',
        'source-location-prefix': '/explicit/prefix',
        format: 'sarif-latest'
      });

      const callArgs = executeCodeQLCommand.mock.calls[0];
      const options = callArgs[1] as Record<string, unknown>;
      // Explicit source-archive should be preserved, NOT overridden by auto-resolution
      expect(options['source-archive']).toBe('/explicit/archive.zip');
      // Explicit source-location-prefix should be preserved, NOT overridden by auto-resolution
      expect(options['source-location-prefix']).toBe('/explicit/prefix');
      // database should still be removed from options
      expect(options).not.toHaveProperty('database');
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});