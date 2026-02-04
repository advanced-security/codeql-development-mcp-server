/**
 * CodeQL find class position tool
 * 
 * Inspired by JordyZomer/codeql-mcp repository:
 * - https://github.com/JordyZomer/codeql-mcp/blob/main/server.py
 * - https://github.com/JordyZomer/codeql-mcp/blob/main/codeqlclient.py
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { logger } from '../../utils/logger';

export interface ClassPosition {
  start_line: number;
  start_col: number;
  end_line: number;
  end_col: number;
}

/**
 * Find the 1-based position of a class name identifier in a QL file.
 * Returns: { start_line, start_col, end_line, end_col }
 */
export async function findClassPosition(filepath: string, className: string): Promise<ClassPosition> {
  try {
    const content = await readFile(filepath, 'utf-8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Match class definition with the specific class name
      const classNameRegex = new RegExp(`\\bclass\\s+(${className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`);
      const match = classNameRegex.exec(line);
      
      if (match) {
        const start_line = i + 1; // 1-based line numbering
        // The class name is in capture group 1
        const classNameStart = match.index + match[0].indexOf(match[1]);
        const start_col = classNameStart + 1; // 1-based column numbering
        const end_col = start_col + className.length - 1; // end_col is inclusive
        
        return {
          start_line,
          start_col,
          end_line: start_line,
          end_col
        };
      }
    }

    throw new Error(`Class name '${className}' not found in file: ${filepath}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found in file')) {
      throw error;
    }
    throw new Error(`Failed to read or parse file ${filepath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Register the find class position tool with the MCP server
 */
export function registerFindClassPositionTool(server: McpServer): void {
  server.tool(
    'find_class_position',
    'Finds startline, startcol, endline endcol of a class for quickeval',
    {
      file: z.string().describe('Path to the .ql file to search'),
      name: z.string().describe('Name of the class to find'),
    },
    async ({ file, name }) => {
      try {
        const position = await findClassPosition(file, name);
        return {
          content: [{ type: 'text', text: JSON.stringify(position, null, 2) }],
        };
      } catch (error) {
        logger.error('Error finding class position:', error);
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