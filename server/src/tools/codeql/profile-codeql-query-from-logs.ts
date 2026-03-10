/**
 * MCP tool: profile_codeql_query_from_logs
 *
 * Two-tier design:
 *
 * **Tier 1 (inline response)**: Compact JSON with per-predicate metrics
 * (name, duration, resultSize, evalOrder, strategy, dependency count).
 * Always small. Always consumable by the calling LLM. Each predicate
 * includes `detailLines: {start, end}` pointing into the detail file.
 *
 * **Tier 2 (detail file on disk)**: A structured, line-indexed text file
 * with one section per top-N predicate (sorted by duration). Each section
 * contains full RA steps, pipeline-stage tuple count progressions, and
 * complete dependency lists. Designed for targeted `read_file` access.
 *
 * The LLM sees the full performance picture immediately from Tier 1,
 * and drills into any predicate's RA analysis with a single `read_file`
 * call using the line numbers from the inline response. No shell access.
 * No grep. No guessing.
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
// Inline response types (Tier 1 — compact, always fits in context)
// ---------------------------------------------------------------------------

/** Compact predicate entry — no RA steps, no pipeline detail inline. */
interface InlinePredicate {
  /** 1-based chronological evaluation order within its query. */
  evalOrder: number;
  name: string;
  durationMs: number;
  resultSize?: number;
  strategy?: string;
  dependencyCount: number;
  pipelineCount?: number;
  /** Line range in the detail file for full RA/pipeline/dependency data. */
  detailLines: { start: number; end: number };
}

/** Per-query summary for inline response. */
interface InlineQuerySummary {
  queryName: string;
  totalDurationMs: number;
  predicateCount: number;
  cacheHits: number;
  /** Top-N predicates by duration — compact metrics only. */
  slowestPredicates: InlinePredicate[];
}

/** Top-level inline response returned by the tool. */
export interface ProfileResponse {
  logFormat: string;
  codeqlVersion?: string;
  totalEvents: number;
  queries: InlineQuerySummary[];
  /** Path to line-indexed detail file. Use read_file with detailLines ranges. */
  detailFile: string;
  /** Path to the full profile JSON (all predicates, unbounded). */
  fullProfileJson: string;
  /** Path to the original evaluator log. */
  evaluatorLog: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the top-N predicates sorted by descending duration. */
function getTopPredicates(
  predicates: PredicateProfile[],
  topN: number
): PredicateProfile[] {
  return [...predicates]
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, topN);
}

// ---------------------------------------------------------------------------
// Tier 2: Detail file builder (structured, line-indexed)
// ---------------------------------------------------------------------------

/**
 * Build a structured text detail file for the top-N predicates per query.
 *
 * Returns the file content and a mapping from predicate key to line ranges.
 * Each predicate section is self-contained and can be read independently
 * via `read_file` with the line range from the inline response.
 */
function buildDetailFile(
  profile: ProfileData,
  topN: number
): {
  content: string;
  lineIndex: Map<string, { start: number; end: number }>;
} {
  const lines: string[] = [];
  const lineIndex = new Map<string, { start: number; end: number }>();

  lines.push('# CodeQL Evaluator Profile — Predicate Detail');
  lines.push(`# Generated: ${new Date().toISOString()}`);
  lines.push(`# Log format: ${profile.logFormat}`);
  if (profile.codeqlVersion) {
    lines.push(`# CodeQL version: ${profile.codeqlVersion}`);
  }
  lines.push(`# Use read_file with line ranges from the JSON response to access individual predicates.`);
  lines.push('');

  for (let qIdx = 0; qIdx < profile.queries.length; qIdx++) {
    const query = profile.queries[qIdx];
    const qName = basename(query.queryName);

    lines.push(`== Query: ${qName} ==`);
    lines.push(`   Total: ${query.totalDurationMs.toFixed(2)}ms | Predicates evaluated: ${query.predicateCount} | Cache hits: ${query.cacheHits}`);
    lines.push('');

    const evalOrderMap = new Map<PredicateProfile, number>();
    query.predicates.forEach((pred, idx) => {
      evalOrderMap.set(pred, idx + 1);
    });

    const top = getTopPredicates(query.predicates, topN);

    for (const pred of top) {
      const startLine = lines.length + 1; // 1-based

      lines.push(`--- ${pred.predicateName} ---`);
      lines.push(`    Eval order: ${evalOrderMap.get(pred) ?? '?'} of ${query.predicateCount}`);
      lines.push(`    Duration:   ${pred.durationMs.toFixed(2)} ms`);
      lines.push(`    Result:     ${pred.resultSize ?? '?'} tuples`);
      lines.push(`    Strategy:   ${pred.evaluationStrategy ?? 'unknown'}`);
      if (pred.position) {
        lines.push(`    Position:   ${pred.position}`);
      }

      if (pred.dependencies.length > 0) {
        lines.push(`    Dependencies (${pred.dependencies.length}):`);
        for (const dep of pred.dependencies) {
          lines.push(`      - ${dep}`);
        }
      }

      if (pred.raSteps && pred.raSteps.length > 0) {
        lines.push(`    RA operations (${pred.raSteps.length} steps):`);
        for (const step of pred.raSteps) {
          lines.push(`      ${step}`);
        }
      }

      if (pred.pipelineStages && pred.pipelineStages.length > 0) {
        lines.push(`    Pipeline stages (${pred.pipelineStages.length}):`);
        for (let pIdx = 0; pIdx < pred.pipelineStages.length; pIdx++) {
          const stage = pred.pipelineStages[pIdx];
          const countsStr = stage.counts.length > 0
            ? `counts=[${stage.counts.join(', ')}]`
            : 'counts=[]';
          lines.push(`      [${pIdx + 1}] ${stage.durationMs.toFixed(2)}ms -> ${stage.resultSize} tuples (${countsStr})`);
        }
      }

      lines.push('');

      const endLine = lines.length; // 1-based, inclusive
      const key = `${qIdx}:${pred.predicateName}`;
      lineIndex.set(key, { start: startLine, end: endLine });
    }
  }

  return { content: lines.join('\n'), lineIndex };
}

// ---------------------------------------------------------------------------
// Tier 1: Inline response builder (compact)
// ---------------------------------------------------------------------------

/**
 * Build the compact inline response. No RA steps, no pipeline detail —
 * just metrics and a line-range pointer into the detail file per predicate.
 */
function buildInlineResponse(
  profile: ProfileData,
  topN: number,
  detailLineIndex: Map<string, { start: number; end: number }>,
  files: { detailFile: string; fullProfileJson: string; evaluatorLog: string }
): ProfileResponse {
  const queries: InlineQuerySummary[] = profile.queries.map((query, qIdx) => {
    const evalOrderMap = new Map<PredicateProfile, number>();
    query.predicates.forEach((pred, idx) => {
      evalOrderMap.set(pred, idx + 1);
    });

    const top = getTopPredicates(query.predicates, topN);

    return {
      queryName: query.queryName,
      totalDurationMs: query.totalDurationMs,
      predicateCount: query.predicateCount,
      cacheHits: query.cacheHits,
      slowestPredicates: top.map((pred) => {
        const key = `${qIdx}:${pred.predicateName}`;
        const detailLines = detailLineIndex.get(key) ?? { start: 0, end: 0 };
        return {
          evalOrder: evalOrderMap.get(pred) ?? 0,
          name: pred.predicateName,
          durationMs: pred.durationMs,
          resultSize: pred.resultSize,
          strategy: pred.evaluationStrategy,
          dependencyCount: pred.dependencies.length,
          pipelineCount: pred.pipelineCount,
          detailLines,
        };
      }),
    };
  });

  return {
    logFormat: profile.logFormat,
    codeqlVersion: profile.codeqlVersion,
    totalEvents: profile.totalEvents,
    queries,
    detailFile: files.detailFile,
    fullProfileJson: files.fullProfileJson,
    evaluatorLog: files.evaluatorLog,
  };
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
    'Parse CodeQL evaluator logs into a structured performance profile. Returns compact JSON with per-query summaries and top-N slowest predicates (name, duration, result size, eval order, dependency count). Full RA operations, pipeline-stage tuple progressions, and dependency lists are written to a line-indexed detail file — each predicate includes {startLine, endLine} for targeted read_file access to its full analysis. Works with logs from codeql query run, codeql database analyze, or vscode-codeql.',
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
          'Number of slowest predicates to include per query (default: 20)'
        ),
    },
    async (params) => {
      try {
        const { evaluatorLog, outputDir, topN } = params;
        const effectiveTopN = topN ?? 20;

        if (!existsSync(evaluatorLog)) {
          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify({ error: `Evaluator log not found at: ${evaluatorLog}` }),
              },
            ],
            isError: true,
          };
        }

        logger.info(`Parsing evaluator log from: ${evaluatorLog}`);
        const profile = parseEvaluatorLog(evaluatorLog);

        const profileOutputDir = outputDir ?? dirname(evaluatorLog);
        mkdirSync(profileOutputDir, { recursive: true });

        // Tier 2a: Write full profile JSON (all predicates, unbounded)
        const jsonPath = join(profileOutputDir, 'query-evaluation-profile.json');
        writeFileSync(jsonPath, JSON.stringify(profile, null, 2));
        logger.info(`Full profile JSON written to: ${jsonPath}`);

        // Tier 2b: Write line-indexed detail file (top-N with full RA/pipeline)
        const { content: detailContent, lineIndex } = buildDetailFile(profile, effectiveTopN);
        const detailPath = join(profileOutputDir, 'query-evaluation-detail.txt');
        writeFileSync(detailPath, detailContent);
        logger.info(`Detail file written to: ${detailPath}`);

        // Tier 1: Build compact inline response
        const response = buildInlineResponse(profile, effectiveTopN, lineIndex, {
          detailFile: detailPath,
          fullProfileJson: jsonPath,
          evaluatorLog,
        });

        return {
          content: [
            { type: 'text' as const, text: JSON.stringify(response) },
          ],
        };
      } catch (error) {
        logger.error('Error profiling CodeQL query from logs:', error);
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                error: `Failed to profile query from logs: ${error instanceof Error ? error.message : String(error)}`,
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
