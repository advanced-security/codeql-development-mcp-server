/**
 * MCP tool: profile_codeql_query_from_logs
 *
 * Parses CodeQL query evaluation logs into a performance profile WITHOUT
 * running the query. Works with logs from `codeql query run`,
 * `codeql database analyze`, or vscode-codeql query history.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { basename, dirname, join } from 'path';
import { z } from 'zod';
import {
  parseEvaluatorLog,
  type PredicateProfile,
  type ProfileData,
} from '../../lib/evaluator-log-parser';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Format the full profile data as pretty-printed JSON.
 */
function formatAsJson(profile: ProfileData): string {
  return JSON.stringify(profile, null, 2);
}

/**
 * Format profile data as a Mermaid diagram.
 *
 * For single-query logs the diagram has one query root node with sub-nodes
 * for the top-N most expensive predicates. For multi-query logs each query
 * gets its own sub-graph.
 */
function formatAsMermaid(profile: ProfileData, topN: number): string {
  const lines: string[] = [];

  lines.push('```mermaid');
  lines.push('graph TD');
  lines.push('');

  if (profile.queries.length <= 1) {
    // Single query layout
    const query = profile.queries[0] ?? {
      queryName: 'unknown',
      totalDurationMs: 0,
      predicates: [],
      predicateCount: 0,
      cacheHits: 0,
    };
    const qLabel = sanitizeMermaid(basename(query.queryName));
    lines.push(
      `  QUERY["${qLabel}<br/>Total: ${query.totalDurationMs.toFixed(2)}ms<br/>Predicates: ${query.predicateCount}"]`
    );
    lines.push('');

    const topPredicates = getTopPredicates(query.predicates, topN);
    topPredicates.forEach((pred, idx) => {
      const nodeId = `P${idx}`;
      const name = sanitizeMermaid(pred.predicateName).substring(0, 50);
      const dur = pred.durationMs.toFixed(2);
      const size =
        pred.resultSize !== undefined ? String(pred.resultSize) : '?';
      lines.push(
        `  ${nodeId}["${name}<br/>${dur}ms | ${size} results"]`
      );
    });

    lines.push('');

    topPredicates.forEach((_pred, idx) => {
      lines.push(`  QUERY --> P${idx}`);
    });
  } else {
    // Multi-query layout
    lines.push(
      `  ROOT["Evaluation Log<br/>${profile.queries.length} queries"]`
    );
    lines.push('');

    profile.queries.forEach((query, qIdx) => {
      const qNodeId = `Q${qIdx}`;
      const qLabel = sanitizeMermaid(basename(query.queryName));
      lines.push(
        `  ${qNodeId}["${qLabel}<br/>${query.totalDurationMs.toFixed(2)}ms<br/>Predicates: ${query.predicateCount}"]`
      );
      lines.push(`  ROOT --> ${qNodeId}`);

      const topPredicates = getTopPredicates(query.predicates, topN);
      topPredicates.forEach((pred, pIdx) => {
        const nodeId = `Q${qIdx}P${pIdx}`;
        const name = sanitizeMermaid(pred.predicateName).substring(0, 50);
        const dur = pred.durationMs.toFixed(2);
        const size =
          pred.resultSize !== undefined ? String(pred.resultSize) : '?';
        lines.push(
          `  ${nodeId}["${name}<br/>${dur}ms | ${size} results"]`
        );
        lines.push(`  ${qNodeId} --> ${nodeId}`);
      });
      lines.push('');
    });
  }

  lines.push('');
  lines.push(
    '  classDef default fill:#e1f5ff,stroke:#333,stroke-width:2px'
  );
  lines.push(
    '  classDef query fill:#ffe1e1,stroke:#333,stroke-width:3px'
  );
  lines.push('  class QUERY query');
  lines.push('```');

  return lines.join('\n');
}

/**
 * Sanitize a string for safe inclusion in a Mermaid node label.
 */
function sanitizeMermaid(text: string): string {
  return text.replace(/[<>"]/g, '');
}

/**
 * Return the top-N most expensive predicates sorted by descending duration.
 */
function getTopPredicates(
  predicates: PredicateProfile[],
  topN: number
): PredicateProfile[] {
  return [...predicates]
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, topN);
}

// ---------------------------------------------------------------------------
// Text summary
// ---------------------------------------------------------------------------

function buildTextSummary(
  profile: ProfileData,
  topN: number,
  outputFiles: string[]
): string {
  const sections: string[] = [];

  sections.push('Query log profiling completed successfully!');
  sections.push('');
  sections.push('Output Files:');
  for (const f of outputFiles) {
    sections.push(`  - ${f}`);
  }

  sections.push('');
  sections.push(`Log Format: ${profile.logFormat}`);
  if (profile.codeqlVersion) {
    sections.push(`CodeQL Version: ${profile.codeqlVersion}`);
  }
  sections.push(`Total Events: ${profile.totalEvents}`);
  sections.push(`Queries: ${profile.queries.length}`);

  for (const query of profile.queries) {
    sections.push('');
    sections.push(`--- ${basename(query.queryName)} ---`);
    sections.push(`  Total Duration: ${query.totalDurationMs.toFixed(2)} ms`);
    sections.push(`  Predicates Evaluated: ${query.predicateCount}`);
    sections.push(`  Cache Hits: ${query.cacheHits}`);

    const top = getTopPredicates(query.predicates, topN);
    if (top.length > 0) {
      sections.push(`  Top ${top.length} Most Expensive Predicates:`);
      top.forEach((pred, idx) => {
        const sizeStr =
          pred.resultSize !== undefined ? `, ${pred.resultSize} results` : '';
        sections.push(
          `    ${idx + 1}. ${pred.predicateName} (${pred.durationMs.toFixed(2)} ms${sizeStr})`
        );
      });
    }
  }

  return sections.join('\n');
}

// ---------------------------------------------------------------------------
// Tool registration
// ---------------------------------------------------------------------------

/**
 * Register the `profile_codeql_query_from_logs` tool with the MCP server.
 */
export function registerProfileCodeQLQueryFromLogsTool(
  server: McpServer
): void {
  server.tool(
    'profile_codeql_query_from_logs',
    'Parse CodeQL query evaluation logs into a performance profile without re-running the query. Works with logs from codeql query run, codeql database analyze, or vscode-codeql query history.',
    {
      evaluatorLog: z
        .string()
        .describe(
          'Path to evaluator-log.jsonl or evaluator-log.summary.jsonl'
        ),
      outputDir: z
        .string()
        .optional()
        .describe(
          'Directory to write profile output files (defaults to same directory as log)'
        ),
      topN: z
        .number()
        .optional()
        .describe(
          'Number of most expensive predicates to highlight (default: 20)'
        ),
    },
    async (params) => {
      try {
        const { evaluatorLog, outputDir, topN } = params;
        const effectiveTopN = topN ?? 20;

        // Validate input path
        if (!existsSync(evaluatorLog)) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Evaluator log not found at: ${evaluatorLog}`,
              },
            ],
            isError: true,
          };
        }

        // Parse log
        logger.info(`Parsing evaluator log from: ${evaluatorLog}`);
        const profile = parseEvaluatorLog(evaluatorLog);

        // Determine output directory
        const profileOutputDir = outputDir ?? dirname(evaluatorLog);
        mkdirSync(profileOutputDir, { recursive: true });

        // Write profile JSON
        const jsonPath = join(
          profileOutputDir,
          'query-evaluation-profile.json'
        );
        writeFileSync(jsonPath, formatAsJson(profile));
        logger.info(`Profile JSON written to: ${jsonPath}`);

        // Write Mermaid diagram
        const mdPath = join(
          profileOutputDir,
          'query-evaluation-profile.md'
        );
        writeFileSync(mdPath, formatAsMermaid(profile, effectiveTopN));
        logger.info(`Profile Mermaid diagram written to: ${mdPath}`);

        // Build response
        const outputFilesList = [
          `Profile JSON: ${jsonPath}`,
          `Profile Mermaid: ${mdPath}`,
          `Evaluator Log: ${evaluatorLog}`,
        ];

        const responseText = buildTextSummary(
          profile,
          effectiveTopN,
          outputFilesList
        );

        return {
          content: [{ type: 'text' as const, text: responseText }],
        };
      } catch (error) {
        logger.error(
          'Error profiling CodeQL query from logs:',
          error
        );
        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to profile query from logs: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
