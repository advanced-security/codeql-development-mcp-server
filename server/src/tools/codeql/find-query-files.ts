/**
 * CodeQL find query files tool
 * Discovers and tracks all files related to a CodeQL query
 */

import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { findCodeQLQueryFiles } from '../../lib/query-file-finder';
import { logger } from '../../utils/logger';

/**
 * Register the find_codeql_query_files tool
 */
export function registerFindCodeQLQueryFilesTool(server: McpServer): void {
  server.tool(
    'find_codeql_query_files',
    'Find and track all files and directories related to a CodeQL query, including resolved metadata',
    {
      queryPath: z.string().describe('Path to the CodeQL query file (.ql)'),
      language: z.string().optional().describe('Programming language (optional, will be inferred if not provided)'),
      resolveMetadata: z.boolean().optional().describe('Whether to resolve query metadata (default: true)')
    },
    async ({ queryPath, language, resolveMetadata }) => {
      try {
        const result = await findCodeQLQueryFiles(
          queryPath,
          language,
          resolveMetadata !== false  // Default to true if not specified
        );

        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        logger.error('Error finding CodeQL query files:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          ],
          isError: true
        };
      }
    }
  );
}
