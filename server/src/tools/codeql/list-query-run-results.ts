/**
 * list_query_run_results tool
 *
 * Discovers per-query-run result directories in configured search paths.
 * Scans each directory in `CODEQL_QUERY_RUN_RESULTS_DIRS` for subdirectories
 * matching the `<QueryName>.ql-<nanoid>` naming convention used by vscode-codeql.
 * Reports which artifacts (evaluator logs, BQRS, SARIF) are present in each run.
 *
 * Supports filtering by:
 * - `queryName` — exact match on the query file name (e.g., "UI5Xss.ql")
 * - `language` — filter by CodeQL language extracted from query.log db-scheme path
 * - `queryPath` — substring or exact match against the full query file path
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import { getQueryRunResultsDirs } from '../../lib/discovery-config';
import { logger } from '../../utils/logger';

export interface QueryRunResult {
  databasePath?: string;
  hasBqrs: boolean;
  hasEvaluatorLog: boolean;
  hasQueryLog: boolean;
  hasSarif: boolean;
  hasSummaryLog: boolean;
  language?: string;
  path: string;
  queryName: string;
  queryPath?: string;
  runId: string;
  timestamp?: string;
}

/**
 * Metadata extracted from a vscode-codeql query.log file.
 */
export interface QueryLogMetadata {
  databasePath?: string;
  language?: string;
  queryPath?: string;
}

/**
 * Filters for narrowing query run results.
 */
export interface QueryRunResultsFilter {
  language?: string;
  queryName?: string;
  queryPath?: string;
}

/**
 * Pattern matching vscode-codeql query run directory names: `<QueryName>.ql-<nanoid>`
 */
const QUERY_RUN_DIR_PATTERN = /^(.+\.ql)-(.+)$/;

/**
 * Pattern matching the `runQuery called with <path>` line in query.log.
 * Example: `[2026-02-15 12:52:37] [SPAMMY] execute query-server2> runQuery called with /path/to/Query.ql`
 */
const RUN_QUERY_PATTERN = /runQuery called with\s+(\S+)/;

/**
 * Pattern matching the `--dbscheme=<path>` argument in query.log when it
 * includes the database root directory with the `db-<language>/` segment.
 * Example: `--dbscheme=/databases/my-db/db-javascript/semmlecode.javascript.dbscheme`
 */
const DBSCHEME_DB_PATH_PATTERN = /--dbscheme=(.+?)\/db-(\w+)\//;

/**
 * Fallback pattern matching language from the semmlecode dbscheme filename.
 * Matches both `semmlecode.<language>.dbscheme` and `semmlecode.dbscheme`
 * (the latter is used by Java). Also matches dbscheme paths from QL packs
 * like `codeql/<language>-all/`.
 *
 * Examples:
 * - `semmlecode.javascript.dbscheme` → javascript
 * - `semmlecode.python.dbscheme` → python
 * - `codeql/javascript-all/2.6.20/semmlecode.javascript.dbscheme` → javascript
 * - `semmlecode.dbscheme` (Java) → java (from `db-java/` or `codeql/java-all/`)
 */
const DBSCHEME_LANGUAGE_PATTERN = /semmlecode\.(\w+)\.dbscheme/;

/**
 * Fallback pattern to extract language from QL pack path in dbscheme references.
 * Example: `codeql/javascript-all/2.6.20/` → javascript
 */
const QLPACK_LANGUAGE_PATTERN = /codeql\/(\w+)-all\//;

/**
 * Parse a vscode-codeql query.log file to extract metadata about the query run.
 *
 * Extracts:
 * - `queryPath` — from the `runQuery called with <path>` line
 * - `databasePath` — the database root from the `--dbscheme=` argument (when available)
 * - `language` — from `db-<language>/` segment, or `semmlecode.<language>.dbscheme`,
 *   or `codeql/<language>-all/` QL pack path
 *
 * @param logContent - Raw content of the query.log file
 * @returns Extracted metadata (fields are undefined if not found)
 */
export function parseQueryLogMetadata(logContent: string): QueryLogMetadata {
  const metadata: QueryLogMetadata = {};

  // Extract query path from runQuery line
  const runQueryMatch = RUN_QUERY_PATTERN.exec(logContent);
  if (runQueryMatch) {
    metadata.queryPath = runQueryMatch[1];
  }

  // Try to extract database path and language from --dbscheme=<root>/db-<lang>/
  const dbPathMatch = DBSCHEME_DB_PATH_PATTERN.exec(logContent);
  if (dbPathMatch) {
    metadata.databasePath = dbPathMatch[1];
    metadata.language = dbPathMatch[2];
  }

  // If language wasn't found from db path, try semmlecode.<lang>.dbscheme
  if (!metadata.language) {
    const langMatch = DBSCHEME_LANGUAGE_PATTERN.exec(logContent);
    if (langMatch) {
      metadata.language = langMatch[1];
    }
  }

  // Last resort: extract from codeql/<lang>-all/ QL pack path
  if (!metadata.language) {
    const packMatch = QLPACK_LANGUAGE_PATTERN.exec(logContent);
    if (packMatch) {
      metadata.language = packMatch[1];
    }
  }

  return metadata;
}

/**
 * Discover query run result directories in the given search paths.
 *
 * @param resultsDirs - Directories to scan for per-run subdirectories
 * @param filter - Optional filters: queryName, language, queryPath
 * @returns List of discovered query run results with artifact inventory
 */
export async function discoverQueryRunResults(
  resultsDirs: string[],
  filter?: QueryRunResultsFilter | string,
): Promise<QueryRunResult[]> {
  // Backward-compatible: if filter is a string, treat as queryName
  const normalizedFilter: QueryRunResultsFilter | undefined =
    typeof filter === 'string' ? { queryName: filter } : filter;

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

      // Apply query name filter (cheap, no I/O needed)
      if (normalizedFilter?.queryName && name !== normalizedFilter.queryName) {
        continue;
      }

      // Check which artifacts are present
      const hasEvaluatorLog = existsSync(join(entryPath, 'evaluator-log.jsonl'));
      const hasBqrs = existsSync(join(entryPath, 'results.bqrs'));
      const hasSarif = existsSync(join(entryPath, 'results-interpreted.sarif'));
      const hasQueryLog = existsSync(join(entryPath, 'query.log'));
      const hasSummaryLog = existsSync(join(entryPath, 'evaluator-log.summary.jsonl'));

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

      // Parse query.log for metadata (queryPath, language, databasePath)
      let metadata: QueryLogMetadata = {};
      if (hasQueryLog) {
        try {
          const logContent = readFileSync(join(entryPath, 'query.log'), 'utf-8');
          metadata = parseQueryLogMetadata(logContent);
        } catch {
          // Ignore read errors
        }
      }

      // Apply language filter (requires metadata from query.log)
      if (normalizedFilter?.language && metadata.language !== normalizedFilter.language) {
        continue;
      }

      // Apply queryPath filter (substring or exact match)
      if (normalizedFilter?.queryPath) {
        if (!metadata.queryPath) {
          continue;
        }
        const filterPath = normalizedFilter.queryPath;
        const isExact = filterPath.startsWith('/');
        if (isExact) {
          if (metadata.queryPath !== filterPath) {
            continue;
          }
        } else {
          if (!metadata.queryPath.toLowerCase().includes(filterPath.toLowerCase())) {
            continue;
          }
        }
      }

      results.push({
        databasePath: metadata.databasePath,
        hasBqrs,
        hasEvaluatorLog,
        hasQueryLog,
        hasSarif,
        hasSummaryLog,
        language: metadata.language,
        path: entryPath,
        queryName: name,
        queryPath: metadata.queryPath,
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
    'List discovered query run result directories (set via CODEQL_QUERY_RUN_RESULTS_DIRS env var). Returns path, query name, timestamp, language, query file path, and available artifacts (evaluator-log, bqrs, sarif, query.log, summary) for each run. Filter by queryName, language, or queryPath to narrow results. Use the returned BQRS paths with codeql_bqrs_decode or codeql_bqrs_info to inspect query results.',
    {
      language: z
        .string()
        .optional()
        .describe(
          'Filter by CodeQL language (e.g., "javascript", "python", "java"). Extracted from the database path in query.log. Runs without a query.log are excluded when this filter is set.',
        ),
      queryName: z
        .string()
        .optional()
        .describe('Filter results by query name (e.g., "UI5Xss.ql")'),
      queryPath: z
        .string()
        .optional()
        .describe(
          'Filter by query file path. Absolute paths match exactly; relative paths/substrings match case-insensitively. Requires query.log to be present.',
        ),
    },
    async ({ language, queryName, queryPath }) => {
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

        const filter: QueryRunResultsFilter = {};
        if (queryName) filter.queryName = queryName;
        if (language) filter.language = language;
        if (queryPath) filter.queryPath = queryPath;

        const runs = await discoverQueryRunResults(
          resultsDirs,
          Object.keys(filter).length > 0 ? filter : undefined,
        );

        if (runs.length === 0) {
          const filterParts: string[] = [];
          if (queryName) filterParts.push(`query "${queryName}"`);
          if (language) filterParts.push(`language "${language}"`);
          if (queryPath) filterParts.push(`path "${queryPath}"`);
          const filterMsg = filterParts.length > 0 ? ` for ${filterParts.join(', ')}` : '';
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
            if (run.hasSummaryLog) artifacts.push('summary-log');
            if (run.hasBqrs) artifacts.push('bqrs');
            if (run.hasSarif) artifacts.push('sarif');
            if (run.hasQueryLog) artifacts.push('query-log');
            const parts = [`  ${run.queryName} (${run.runId})`];
            parts.push(`    Path: ${run.path}`);
            if (run.timestamp) parts.push(`    Timestamp: ${run.timestamp}`);
            if (run.language) parts.push(`    Language: ${run.language}`);
            if (run.queryPath) parts.push(`    Query: ${run.queryPath}`);
            if (run.databasePath) parts.push(`    Database: ${run.databasePath}`);
            parts.push(`    Artifacts: ${artifacts.length > 0 ? artifacts.join(', ') : 'none'}`);
            if (run.hasBqrs) parts.push(`    BQRS: ${join(run.path, 'results.bqrs')}`);
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
