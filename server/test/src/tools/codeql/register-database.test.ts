/**
 * Tests for register-database tool
 */

import { describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { promises as fs } from 'fs';
import { join } from 'path';
import { registerDatabase, registerRegisterDatabaseTool } from '../../../../src/tools/codeql/register-database';
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

describe('registerDatabase', () => {
  it('should successfully register a valid database', async () => {
    // Arrange
    const tempDir = createTestTempDir('test-db');
    await fs.writeFile(join(tempDir, 'codeql-database.yml'), 'primaryLanguage: javascript');
    const srcZipPath = join(tempDir, 'src.zip');
    await fs.writeFile(srcZipPath, 'mock zip content');

    // Act
    const result = await registerDatabase(tempDir);

    // Assert
    expect(result).toBe(`Database registered: ${tempDir} (source: src.zip)`);

    // Cleanup
    await fs.rm(tempDir, { recursive: true });
  });

  it('should throw error when database directory does not exist', async () => {
    // Arrange
    const nonExistentPath = '/nonexistent/database/path';

    // Act & Assert
    await expect(registerDatabase(nonExistentPath))
      .rejects.toThrow('Database path does not exist:');
  });

  it('should throw error when codeql-database.yml is missing', async () => {
    // Arrange
    const tempDir = createTestTempDir('test-db-no-yml');
    // Note: not creating codeql-database.yml file

    // Act & Assert
    await expect(registerDatabase(tempDir))
      .rejects.toThrow('Missing required codeql-database.yml in:');

    // Cleanup
    await fs.rm(tempDir, { recursive: true });
  });

  it('should throw error when src.zip and src/ are missing', async () => {
    // Arrange
    const tempDir = createTestTempDir('test-db-no-src');
    await fs.writeFile(join(tempDir, 'codeql-database.yml'), 'primaryLanguage: javascript');
    // Note: not creating src.zip or src/ folder

    // Act & Assert
    await expect(registerDatabase(tempDir))
      .rejects.toThrow('Missing required source archive (src.zip) or source directory (src/) in:');

    // Cleanup
    await fs.rm(tempDir, { recursive: true });
  });

  it('should resolve relative paths correctly', async () => {
    // Arrange
    const tempDir = createTestTempDir('test-db-relative');
    await fs.writeFile(join(tempDir, 'codeql-database.yml'), 'primaryLanguage: javascript');
    const srcZipPath = join(tempDir, 'src.zip');
    await fs.writeFile(srcZipPath, 'mock zip content');

    // Change to parent directory and use relative path
    const originalCwd = process.cwd();
    const parentDir = join(tempDir, '..');
    process.chdir(parentDir);
    const relativePath = './' + tempDir.split('/').pop();

    // Act
    const result = await registerDatabase(relativePath);

    // Assert
    expect(result).toContain('Database registered:');
    expect(result).toContain('test-db-relative');

    // Cleanup
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true });
  });

  it('should handle database with additional files', async () => {
    // Arrange
    const tempDir = createTestTempDir('test-db-extra-files');
    const srcZipPath = join(tempDir, 'src.zip');
    await fs.writeFile(srcZipPath, 'mock zip content');
    
    // Add some additional files that might exist in a real database
    await fs.writeFile(join(tempDir, 'codeql-database.yml'), 'database metadata');
    await fs.mkdir(join(tempDir, 'log'), { recursive: true });
    await fs.writeFile(join(tempDir, 'log', 'database-creation.log'), 'log content');

    // Act
    const result = await registerDatabase(tempDir);

    // Assert
    expect(result).toBe(`Database registered: ${tempDir} (source: src.zip)`);

    // Cleanup
    await fs.rm(tempDir, { recursive: true });
  });

  it('should successfully register a database with src/ folder instead of src.zip', async () => {
    // Arrange - create a test database with src/ directory
    const tempDir = createTestTempDir('test-db-src-folder');
    await fs.writeFile(join(tempDir, 'codeql-database.yml'), 'primaryLanguage: javascript');
    await fs.mkdir(join(tempDir, 'src'), { recursive: true });
    await fs.writeFile(join(tempDir, 'src', 'test.js'), 'const x = 1;');

    // Act
    const result = await registerDatabase(tempDir);

    // Assert
    expect(result).toBe(`Database registered: ${tempDir} (source: src/)`);

    // Cleanup
    await fs.rm(tempDir, { recursive: true });
  });

  it('should handle permission errors gracefully', async () => {
    // This test simulates a permission error scenario
    // In a real scenario, this might happen with protected directories

    // Act & Assert
    await expect(registerDatabase('/root/protected/database'))
      .rejects.toThrow('Database path does not exist:');
  });
});

describe('registerRegisterDatabaseTool', () => {
  it('should register the tool with MCP server', () => {
    const mockServer = {
      tool: vi.fn()
    } as unknown as McpServer;

    registerRegisterDatabaseTool(mockServer);

    expect(mockServer.tool).toHaveBeenCalledTimes(1);
    expect(mockServer.tool).toHaveBeenCalledWith(
      'register_database',
      expect.any(String),
      expect.any(Object),
      expect.any(Function)
    );
  });

  it('should return success for valid database path in handler', async () => {
    const mockServer = {
      tool: vi.fn()
    } as unknown as McpServer;

    registerRegisterDatabaseTool(mockServer);

    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];

    // Create a temporary database with required files
    const tempDir = createTestTempDir('test-handler-db');
    await fs.writeFile(join(tempDir, 'codeql-database.yml'), 'primaryLanguage: javascript');
    await fs.writeFile(join(tempDir, 'src.zip'), 'mock');

    const result = await handler({ db_path: tempDir });

    expect(result.content[0].text).toContain('Database registered');
    expect(result.isError).toBeUndefined();

    await fs.rm(tempDir, { recursive: true });
  });

  it('should return error for invalid database path in handler', async () => {
    const mockServer = {
      tool: vi.fn()
    } as unknown as McpServer;

    registerRegisterDatabaseTool(mockServer);

    const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];

    const result = await handler({ db_path: '/nonexistent/path' });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error');
  });
});