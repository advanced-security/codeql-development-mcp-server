/**
 * list_query_run_results tool
 *
 * Discovers per-query-run result directories in configured search paths.
 * Scans each directory in `CODEQL_QUERY_RUN_RESULTS_DIRS` for subdirectories
 * matching the `<QueryName>.ql-<nanoid>` naming convention used by vscode-codeql.
 * Reports which artifacts (evaluator logs, BQRS, SARIF) are present in each run.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import { getQueryRunResultsDirs } from '../../lib/discovery-config';
import { logger } from '../../utils/logger';

export interface QueryRunResult {
  hasBqrs: boolean;
  hasEvaluatorLog: boolean;
  hasSarif: boolean;
  path: string;
  queryName: string;
  runId: string;
  timestamp?: string;
}

/**
 * Pattern matching vscode-codeql query run directory names: `<QueryName>.ql-<nanoid>`
 */
const QUERY_RUN_DIR_PATTERN = /^(.+\.ql)-(.+)$/;

/**
 * Discover query run result directories in the given search paths.
 *
 * @param resultsDirs - Directories to scan for per-run subdirectories
 * @param queryName - Optional query name filter (e.g., "UI5Xss.ql")
 * @returns List of discovered query run results with artifact inventory
 */
export async function discoverQueryRunResults(
  resultsDirs: string[],
  queryName?: string,
): Promise<QueryRunResult[]> {
  const results: QueryRunResult[] = [];

  for (const dir of resultsDirs) {
    if (!existsSync(dir)) {
      continue;
    }

    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const entryPath = join(dir, entry);

      // Skip non-directories
      try {
        if (!statSync(entryPath).isDirectory()) {
          continue;
        }
      } catch {
        continue;
      }

      // Match the naming pattern
      const match = QUERY_RUN_DIR_PATTERN.exec(entry);
      if (!match) {
        continue;
      }

      const [, name, runId] = match;

      // Apply query name filter
      if (queryName && name !== queryName) {
        continue;
      }

      // Check which artifacts are present
      const hasEvaluatorLog = existsSync(join(entryPath, 'evaluator-log.jsonl'));
      const hasBqrs = existsSync(join(entryPath, 'results.bqrs'));
      const hasSarif = existsSync(join(entryPath, 'results-interpreted.sarif'));

      // Read timestamp if available
      let timestamp: string | undefined;
      const timestampPath = join(entryPath, 'timestamp');
      if (existsSync(timestampPath)) {
        try {
          timestamp = readFileSync(timestampPath, 'utf-8').trim();
        } catch {
          // Ignore read errors
        }
      }

      results.push({
        hasBqrs,
        hasEvaluatorLog,
        hasSarif,
        path: entryPath,
        queryName: name,
        runId,
        timestamp,
      });
    }
  }

  return results;
}

/**
 * Register the list_query_run_results tool with the MCP server.
 */
export function registerListQueryRunResultsTool(server: McpServer): void {
  server.tool(
    'list_query_run_results',
    'List discovered query run result directories (set via CODEQL_QUERY_RUN_RESULTS_DIRS env var). Returns path, query name, timestamp, and available artifacts for each run.',
    {
      queryName: z
        .string()
        .optional()
        .describe('Filter results by query name (e.g., "UI5Xss.ql")'),
    },
    async ({ queryName }) => {
      try {
        const resultsDirs = getQueryRunResultsDirs();

        if (resultsDirs.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No query run results directories configured. Set the CODEQL_QUERY_RUN_RESULTS_DIRS environment variable to a colon-separated list of directories to search.',
              },
            ],
          };
        }

        const runs = await discoverQueryRunResults(resultsDirs, queryName);

        if (runs.length === 0) {
          const filterMsg = queryName ? ` for query "${queryName}"` : '';
          return {
            content: [
              {
                type: 'text' as const,
                text: `No query run results found${filterMsg} in: ${resultsDirs.join(', ')}`,
              },
            ],
          };
        }

        const lines = [
          `Found ${runs.length} query run result(s):`,
          '',
          ...runs.map((run) => {
            const artifacts: string[] = [];
            if (run.hasEvaluatorLog) artifacts.push('evaluator-log');
            if (run.hasBqrs) artifacts.push('bqrs');
            if (run.hasSarif) artifacts.push('sarif');
            const parts = [`  ${run.queryName} (${run.runId})`];
            parts.push(`    Path: ${run.path}`);
            if (run.timestamp) parts.push(`    Timestamp: ${run.timestamp}`);
            parts.push(`    Artifacts: ${artifacts.length > 0 ? artifacts.join(', ') : 'none'}`);
            return parts.join('\n');
          }),
        ];

        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      } catch (error) {
        logger.error('Error listing query run results:', error);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
