/**
 * Query Results Cache Tools — LLM-facing tools for cached query result
 * lookup, retrieval (with subset selection), clearing, and comparison.
 *
 * Opt-in via ENABLE_ANNOTATION_TOOLS=true (same flag as annotations/audit).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { sessionDataManager } from '../lib/session-data-manager';
import { logger } from '../utils/logger';

/**
 * Register all query results cache tools with the MCP server.
 */
export function registerCacheTools(server: McpServer): void {
  const config = sessionDataManager.getConfig();

  if (!config.enableAnnotationTools) {
    logger.info(
      'Cache tools are disabled (opt-in). Set ENABLE_ANNOTATION_TOOLS=true to enable query_results_cache_* tools.',
    );
    return;
  }

  registerQueryResultsCacheLookupTool(server);
  registerQueryResultsCacheRetrieveTool(server);
  registerQueryResultsCacheClearTool(server);
  registerQueryResultsCacheCompareTool(server);

  logger.info('Registered query results cache tools');
}

// ---------------------------------------------------------------------------
// query_results_cache_lookup
// ---------------------------------------------------------------------------

function registerQueryResultsCacheLookupTool(server: McpServer): void {
  server.tool(
    'query_results_cache_lookup',
    'Check whether cached query results exist for given parameters. Returns metadata about the cached entry without the full content.',
    {
      cacheKey: z.string().optional().describe('Look up by exact cache key (if known).'),
      queryName: z.string().optional().describe('Query name to search for (e.g. "PrintAST", "CallGraphFrom").'),
      ruleId: z.string().optional().describe('Filter by CodeQL query @id (e.g. "js/sql-injection"). The @id is the most reliable identifier.'),
      databasePath: z.string().optional().describe('Database path to search for.'),
      language: z.string().optional().describe('Filter by language (e.g. "cpp", "javascript").'),
      limit: z.number().int().positive().max(500).optional().describe('Maximum number of cache entries to return when listing by filter (default: 50, max: 500).'),
    },
    async ({ cacheKey, queryName, ruleId, databasePath, language, limit }) => {
      const store = sessionDataManager.getStore();

      // Exact lookup by cache key
      if (cacheKey) {
        const meta = store.getCacheEntryMeta(cacheKey);
        if (meta) {
          return { content: [{ type: 'text' as const, text: JSON.stringify({ cached: true, ...meta }, null, 2) }] };
        }
        return { content: [{ type: 'text' as const, text: JSON.stringify({ cached: false, cacheKey }) }] };
      }

      // List matching entries
      const entries = store.listCacheEntries({ queryName, ruleId, databasePath, language, limit: limit ?? 50 });
      if (entries.length === 0) {
        return { content: [{ type: 'text' as const, text: JSON.stringify({ cached: false, queryName, ruleId, databasePath, language }) }] };
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({ cached: true, count: entries.length, entries }, null, 2),
        }],
      };
    },
  );
}

// ---------------------------------------------------------------------------
// query_results_cache_retrieve
// ---------------------------------------------------------------------------

function registerQueryResultsCacheRetrieveTool(server: McpServer): void {
  server.tool(
    'query_results_cache_retrieve',
    'Retrieve cached query results with optional subset selection. Supports line ranges (for graphtext/CSV) and SARIF result indices and file filtering to return only the relevant portion.',
    {
      cacheKey: z.string().describe('The cache key of the result to retrieve.'),
      lineRange: z
        .tuple([z.number().int().min(1), z.number().int().min(1)])
        .refine(([start, end]) => start <= end, { message: 'lineRange start must be <= end' })
        .optional()
        .describe('Line range [start, end] (1-indexed, inclusive). For graphtext/CSV output only.'),
      resultIndices: z
        .tuple([z.number().int().min(0), z.number().int().min(0)])
        .refine(([start, end]) => start <= end, { message: 'resultIndices start must be <= end' })
        .optional()
        .describe('SARIF result index range [start, end] (0-indexed, inclusive). For SARIF output only.'),
      fileFilter: z.string().optional().describe('For SARIF: only include results whose file path contains this string.'),
      maxLines: z.number().int().positive().optional().describe('Maximum number of lines to return for line-based formats (default: 500).'),
      maxResults: z.number().int().positive().optional().describe('Maximum number of SARIF results to return (default: 100).'),
    },
    async ({ cacheKey, lineRange, resultIndices, fileFilter, maxLines, maxResults }) => {
      const store = sessionDataManager.getStore();
      const meta = store.getCacheEntryMeta(cacheKey);

      if (!meta) {
        return { content: [{ type: 'text' as const, text: `No cached result found for key: ${cacheKey}` }] };
      }

      // SARIF format: always use the SARIF-aware subset retrieval so that
      // maxResults is applied and result-level filters (indices, file path) work correctly.
      const isSarif = meta.outputFormat.includes('sarif');
      if (isSarif) {
        const subset = store.getCacheSarifSubset(cacheKey, {
          resultIndices,
          fileFilter,
          maxResults,
        });
        if (!subset) {
          return { content: [{ type: 'text' as const, text: `Cached content not available for key: ${cacheKey}` }] };
        }
        let parsedResults: unknown;
        try {
          parsedResults = JSON.parse(subset.content);
        } catch {
          // getCacheSarifSubset fell back to plain-text content; return it as-is.
          return {
            content: [{
              type: 'text' as const,
              text: subset.content,
            }],
          };
        }
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              totalResults: subset.totalResults,
              returnedResults: subset.returnedResults,
              truncated: subset.truncated,
              sarifSubset: parsedResults,
            }, null, 2),
          }],
        };
      }

      // Line-based subset for graphtext, CSV, or any other text format.
      const subset = store.getCacheContentSubset(cacheKey, {
        lineRange,
        maxLines: maxLines ?? 500,
      });
      if (!subset) {
        return { content: [{ type: 'text' as const, text: `Cached content not available for key: ${cacheKey}` }] };
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            totalLines: subset.totalLines,
            returnedLines: subset.returnedLines,
            truncated: subset.truncated,
          }) + '\n\n' + subset.content,
        }],
      };
    },
  );
}

// ---------------------------------------------------------------------------
// query_results_cache_clear
// ---------------------------------------------------------------------------

function registerQueryResultsCacheClearTool(server: McpServer): void {
  server.tool(
    'query_results_cache_clear',
    'Clear cached query results by cache key, query name, database path, or clear all.',
    {
      cacheKey: z.string().optional().describe('Clear a specific cache entry.'),
      queryName: z.string().optional().describe('Clear all entries for this query name.'),
      ruleId: z.string().optional().describe('Clear all entries for this CodeQL query @id.'),
      databasePath: z.string().optional().describe('Clear all entries for this database.'),
      all: z.boolean().optional().describe('Clear the entire query results cache.'),
    },
    async ({ cacheKey, queryName, ruleId, databasePath, all }) => {
      if (!cacheKey && !queryName && !ruleId && !databasePath && !all) {
        return { content: [{ type: 'text' as const, text: 'At least one filter (cacheKey, queryName, ruleId, databasePath, or all) is required.' }] };
      }
      const store = sessionDataManager.getStore();
      const cleared = store.clearCacheEntries({ cacheKey, queryName, ruleId, databasePath, all: all ?? false });
      return { content: [{ type: 'text' as const, text: `Cleared ${cleared} cached query result(s).` }] };
    },
  );
}

// ---------------------------------------------------------------------------
// query_results_cache_compare
// ---------------------------------------------------------------------------

function registerQueryResultsCacheCompareTool(server: McpServer): void {
  server.tool(
    'query_results_cache_compare',
    'Compare cached query results across multiple databases for the same query. Useful for MRVA-style cross-repository analysis.',
    {
      queryName: z.string().optional().describe('The query name to compare across databases.'),
      ruleId: z.string().optional().describe('The CodeQL query @id to compare across databases (preferred over queryName).'),
      language: z.string().optional().describe('Filter by language.'),
    },
    async ({ queryName, ruleId, language }) => {
      if (!queryName && !ruleId) {
        return { content: [{ type: 'text' as const, text: 'Either queryName or ruleId is required.' }] };
      }
      const store = sessionDataManager.getStore();
      const entries = store.listCacheEntries({ queryName, ruleId, language });

      if (entries.length === 0) {
        const identifier = ruleId ?? queryName;
        return { content: [{ type: 'text' as const, text: `No cached results found for "${identifier}".` }] };
      }

      // Group by database
      const byDatabase = new Map<string, typeof entries>();
      for (const entry of entries) {
        const key = entry.databasePath;
        if (!byDatabase.has(key)) byDatabase.set(key, []);
        byDatabase.get(key)!.push(entry);
      }

      const comparison = Array.from(byDatabase.entries()).map(([db, dbEntries]) => {
        // For each entry, prefer the stored resultCount; fall back to
        // parsing the cached SARIF content to extract the result count.
        let totalResultCount = 0;
        for (const e of dbEntries) {
          if (e.resultCount != null) {
            totalResultCount += e.resultCount;
          } else if (e.outputFormat.includes('sarif')) {
            // Attempt to derive result count from cached SARIF content
            try {
              const content = store.getCacheContent(e.cacheKey);
              if (content) {
                const sarif = JSON.parse(content);
                const count = (sarif?.runs?.[0]?.results as unknown[] | undefined)?.length ?? 0;
                totalResultCount += count;
              }
            } catch { /* malformed SARIF or missing content */ }
          }
        }
        return {
          database: db,
          languages: [...new Set(dbEntries.map(e => e.language))],
          formats: [...new Set(dbEntries.map(e => e.outputFormat))],
          totalResultCount,
          cachedRuns: dbEntries.length,
          latestCachedAt: dbEntries[0].createdAt,
        };
      });

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            queryName: queryName ?? null,
            ruleId: ruleId ?? null,
            databases: comparison.length,
            comparison,
          }, null, 2),
        }],
      };
    },
  );
}
