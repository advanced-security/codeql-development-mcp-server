/**
 * CodeQL quick evaluate tool
 * 
 * Inspired by JordyZomer/codeql-mcp repository:
 * - https://github.com/JordyZomer/codeql-mcp/blob/main/server.py
 * - https://github.com/JordyZomer/codeql-mcp/blob/main/codeqlclient.py
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { join, resolve } from 'path';
import { findClassPosition } from './find-class-position';
import { findPredicatePosition } from './find-predicate-position';
import { logger } from '../../utils/logger';
import { getProjectTmpDir } from '../../utils/temp-dir';

export interface QuickEvaluateParams {
  file: string;
  db: string;
  symbol: string;
  output_path?: string;
}

/**
 * Quick evaluate either a class or a predicate in a CodeQL query.
 * This allows debugging a select portion of QL code without running the whole query.
 */
export async function quickEvaluate({
  file,
  db: _db,
  symbol,
  output_path
}: QuickEvaluateParams): Promise<string> {
  try {
    // Try to find as a class first, then as a predicate
    try {
      await findClassPosition(file, symbol);
    } catch {
      try {
        await findPredicatePosition(file, symbol);
      } catch {
        throw new Error(`Symbol '${symbol}' not found as class or predicate in file: ${file}`);
      }
    }
    
    const resolvedOutput = resolve(output_path || join(getProjectTmpDir('quickeval'), 'quickeval.bqrs'));
    
    // For now, return the resolved output path
    // In a full implementation, this would use the CodeQL CLI or query server
    // to perform the actual quick evaluation with the position parameters
    return resolvedOutput;
  } catch (error) {
    throw new Error(`CodeQL evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Register the quick evaluate tool with the MCP server
 */
export function registerQuickEvaluateTool(server: McpServer): void {
  server.tool(
    'quick_evaluate',
    'Quick evaluate either a class or a predicate in a CodeQL query for debugging',
    {
      file: z.string().describe('Path to the .ql file containing the symbol'),
      db: z.string().describe('Path to the CodeQL database'),
      symbol: z.string().describe('Name of the class or predicate to evaluate'),
      output_path: z.string().optional().describe('Output path for results (defaults to project-local .tmp/quickeval/)'),
    },
    async ({ file, db, symbol, output_path }) => {
      try {
        const result = await quickEvaluate({ file, db, symbol, output_path });
        return {
          content: [{ type: 'text', text: result }],
        };
      } catch (error) {
        logger.error('Error in quick evaluate:', error);
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