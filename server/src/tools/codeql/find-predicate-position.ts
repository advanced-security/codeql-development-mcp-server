/**
 * CodeQL find predicate position tool
 * 
 * Inspired by JordyZomer/codeql-mcp repository:
 * - https://github.com/JordyZomer/codeql-mcp/blob/main/server.py
 * - https://github.com/JordyZomer/codeql-mcp/blob/main/codeqlclient.py
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readFile } from 'fs/promises';
import { logger } from '../../utils/logger';

export interface PredicatePosition {
  start_line: number;
  start_col: number;
  end_line: number;
  end_col: number;
}

/**
 * Find the 1-based position of a predicate name in a QL file.
 * Supports: 
 * - predicate name(...)  - predicates with no return type
 * - Type name(...)       - predicates with return type (e.g., string foo())
 * - name(...) (inside class) - member predicates
 * Returns: { start_line, start_col, end_line, end_col }
 */
export async function findPredicatePosition(filepath: string, predicateName: string): Promise<PredicatePosition> {
  try {
    const content = await readFile(filepath, 'utf-8');
    const lines = content.split('\n');
    const escapedName = predicateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Match predicate definition with the specific predicate name
      // Pattern 1: predicate name(...)
      const predicateKeywordRegex = new RegExp(`\\bpredicate\\s+(${escapedName})\\s*\\(`);
      let match = predicateKeywordRegex.exec(line);
      
      // Pattern 2: Type name(...) - predicates with return type
      // Matches: string foo(), int bar(), MyClass baz(), etc.
      // Must start at beginning of line (with optional whitespace) or after certain keywords
      if (!match) {
        const returnTypeRegex = new RegExp(`(?:^|\\s)(?:abstract\\s+)?(?:cached\\s+)?(?:private\\s+)?(?:deprecated\\s+)?(?:\\w+)\\s+(${escapedName})\\s*\\(`);
        match = returnTypeRegex.exec(line);
      }
      
      if (match) {
        const start_line = i + 1; // 1-based line numbering
        // The predicate name is in capture group 1
        const predicateNameStart = match.index + match[0].indexOf(match[1]);
        const start_col = predicateNameStart + 1; // 1-based column numbering
        const end_col = start_col + predicateName.length - 1; // end_col is inclusive
        
        return {
          start_line,
          start_col,
          end_line: start_line,
          end_col
        };
      }
    }

    throw new Error(`Predicate name '${predicateName}' not found in file: ${filepath}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found in file')) {
      throw error;
    }
    throw new Error(`Failed to read or parse file ${filepath}: ${error instanceof Error ? error.message : 'Unknown error'}`, { cause: error });
  }
}

/**
 * Register the find predicate position tool with the MCP server
 */
export function registerFindPredicatePositionTool(server: McpServer): void {
  server.tool(
    'find_predicate_position',
    'Finds startline, startcol, endline endcol of a predicate for quickeval',
    {
      file: z.string().describe('Path to the .ql file to search'),
      name: z.string().describe('Name of the predicate to find'),
    },
    async ({ file, name }) => {
      try {
        const position = await findPredicatePosition(file, name);
        return {
          content: [{ type: 'text', text: JSON.stringify(position, null, 2) }],
        };
      } catch (error) {
        logger.error('Error finding predicate position:', error);
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