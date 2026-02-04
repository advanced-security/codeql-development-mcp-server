/**
 * CodeQL register database tool
 * 
 * Inspired by JordyZomer/codeql-mcp repository:
 * - https://github.com/JordyZomer/codeql-mcp/blob/main/server.py
 * - https://github.com/JordyZomer/codeql-mcp/blob/main/codeqlclient.py
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { access, constants } from 'fs/promises';
import { resolve } from 'path';
import { logger } from '../../utils/logger';

export interface DatabaseRegistration {
  uri: string;
  content: {
    sourceArchiveZip: string;
    dbDir: string;
  };
}

/**
 * Register a CodeQL database given a local path to the database directory.
 * Validates that the database exists and has required structure.
 */
export async function registerDatabase(dbPath: string): Promise<string> {
  try {
    const resolvedPath = resolve(dbPath);
    
    // Check if database directory exists
    await access(resolvedPath, constants.F_OK);
    
    // Check if src.zip exists (required for CodeQL databases)
    const srcZipPath = resolve(resolvedPath, 'src.zip');
    await access(srcZipPath, constants.F_OK);
    
    // For now, we just validate and return success message
    // In a full implementation, this would register with a query server
    return `Database registered: ${dbPath}`;
  } catch (error) {
    if (error instanceof Error) {
      const errorCode = (error as { code?: string }).code;
      if (errorCode === 'ENOENT') {
        if (error.message.includes('src.zip')) {
          throw new Error(`Missing required src.zip in: ${dbPath}`);
        }
        throw new Error(`Database path does not exist: ${dbPath}`);
      }
      if (errorCode === 'EACCES') {
        throw new Error(`Database path does not exist: ${dbPath}`);
      }
    }
    throw new Error(`Failed to register database: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Register the register database tool with the MCP server
 */
export function registerRegisterDatabaseTool(server: McpServer): void {
  server.tool(
    'register_database',
    'Register a CodeQL database given a local path to the database directory',
    {
      db_path: z.string().describe('Path to the CodeQL database directory'),
    },
    async ({ db_path }) => {
      try {
        const result = await registerDatabase(db_path);
        return {
          content: [{ type: 'text', text: result }],
        };
      } catch (error) {
        logger.error('Error registering database:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}