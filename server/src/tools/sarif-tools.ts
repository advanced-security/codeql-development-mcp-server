/**
 * SARIF Analysis Tools — LLM-facing tools for rule-level SARIF extraction,
 * markdown visualization with Mermaid dataflow diagrams, and alert overlap analysis.
 *
 * Enabled by default alongside annotation tools.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readFileSync } from 'fs';
import { z } from 'zod';
import {
  computeFingerprintOverlap,
  computeLocationOverlap,
  diffSarifByCommits,
  diffSarifRules,
  extractRuleFromSarif,
  findOverlappingAlerts,
  listSarifRules,
  sarifRuleToMarkdown,
} from '../lib/sarif-utils';
import type { DiffFileEntry, DiffGranularity } from '../lib/sarif-utils';
import { sessionDataManager } from '../lib/session-data-manager';
import type { SarifResult, SarifRule } from '../types/sarif';
import type { SarifDocument } from '../types/sarif';
import { logger } from '../utils/logger';

/**
 * Register all SARIF analysis tools with the MCP server.
 */
export function registerSarifTools(server: McpServer): void {
  registerSarifCompareAlertsTool(server);
  registerSarifDeduplicateRulesTool(server);
  registerSarifDiffByCommitsTool(server);
  registerSarifDiffRunsTool(server);
  registerSarifExtractRuleTool(server);
  registerSarifListRulesTool(server);
  registerSarifRuleToMarkdownTool(server);
  registerSarifStoreTool(server);

  logger.info('Registered SARIF analysis tools');
}

// ---------------------------------------------------------------------------
// Shared helper: load SARIF from file path or cache key
// ---------------------------------------------------------------------------

/** Options for loading SARIF content from one of several sources. */
interface LoadSarifOptions {
  /** Cache key to retrieve SARIF from the session cache. */
  cacheKey?: string;
  /** Raw SARIF JSON string (e.g. from an API response). */
  inlineContent?: string;
  /** Path to a SARIF file on disk. */
  sarifPath?: string;
}

function loadSarif(
  opts: LoadSarifOptions,
): { error?: string; sarif?: SarifDocument } {
  const { cacheKey, inlineContent, sarifPath } = opts;

  if (!sarifPath && !cacheKey && !inlineContent) {
    return { error: 'No SARIF source provided.' };
  }

  let content: string;

  if (inlineContent) {
    content = inlineContent;
  } else if (cacheKey) {
    const store = sessionDataManager.getStore();
    const cached = store.getCacheContent(cacheKey);
    if (!cached) {
      return { error: `No cached content found for key: ${cacheKey}` };
    }
    content = cached;
  } else {
    try {
      content = readFileSync(sarifPath!, 'utf8');
    } catch {
      return { error: `Failed to read SARIF file: ${sarifPath}` };
    }
  }

  try {
    const parsed = JSON.parse(content);
    if (!parsed || typeof parsed !== 'object') {
      return { error: 'Invalid SARIF: expected a JSON object.' };
    }
    if (!Array.isArray(parsed.runs)) {
      return { error: 'Invalid SARIF: missing or invalid "runs" array.' };
    }
    if (parsed.runs.length === 0) {
      return { error: 'Invalid SARIF: "runs" array is empty.' };
    }
    const run = parsed.runs[0];
    if (!run.tool?.driver) {
      return { error: 'Invalid SARIF: missing tool.driver in first run.' };
    }
    return { sarif: parsed as SarifDocument };
  } catch {
    return { error: 'Failed to parse SARIF JSON.' };
  }
}

// ---------------------------------------------------------------------------
// sarif_extract_rule
// ---------------------------------------------------------------------------

function registerSarifExtractRuleTool(server: McpServer): void {
  server.tool(
    'sarif_extract_rule',
    'Extract all data for a specific rule/query from multi-rule SARIF. Returns a valid SARIF JSON subset with only the matching rule definition and results.',
    {
      cacheKey: z.string().optional().describe('Cache key to read SARIF from (alternative to sarifPath).'),
      ruleId: z.string().describe('The SARIF rule ID to extract (e.g. "js/sql-injection"). Corresponds to the CodeQL query @id.'),
      sarifPath: z.string().optional().describe('Path to the SARIF file.'),
    },
    async ({ sarifPath, cacheKey, ruleId }) => {
      const loaded = loadSarif({ sarifPath, cacheKey });
      if (loaded.error) {
        return { content: [{ type: 'text' as const, text: loaded.error }] };
      }

      const extracted = extractRuleFromSarif(loaded.sarif!, ruleId);
      const resultCount = extracted.runs[0]?.results?.length ?? 0;
      const ruleCount = extracted.runs[0]?.tool.driver.rules?.length ?? 0;

      if (resultCount === 0 && ruleCount === 0) {
        return {
          content: [{
            type: 'text' as const,
            text: `No results or rule definition found for ruleId "${ruleId}" in the SARIF data.`,
          }],
        };
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            ruleId,
            resultCount,
            extractedSarif: extracted,
          }, null, 2),
        }],
      };
    },
  );
}

// ---------------------------------------------------------------------------
// sarif_list_rules
// ---------------------------------------------------------------------------

function registerSarifListRulesTool(server: McpServer): void {
  server.tool(
    'sarif_list_rules',
    'List all rules in a SARIF file with result counts, severity, precision, and tags. Essential for discovering available rules before extraction or comparison.',
    {
      cacheKey: z.string().optional().describe('Cache key to read SARIF from (alternative to sarifPath).'),
      sarifPath: z.string().optional().describe('Path to the SARIF file.'),
    },
    async ({ sarifPath, cacheKey }) => {
      const loaded = loadSarif({ sarifPath, cacheKey });
      if (loaded.error) {
        return { content: [{ type: 'text' as const, text: loaded.error }] };
      }

      const rules = listSarifRules(loaded.sarif!);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            totalRules: rules.length,
            totalResults: rules.reduce((sum, r) => sum + r.resultCount, 0),
            rules,
          }, null, 2),
        }],
      };
    },
  );
}

// ---------------------------------------------------------------------------
// sarif_rule_to_markdown
// ---------------------------------------------------------------------------

function registerSarifRuleToMarkdownTool(server: McpServer): void {
  server.tool(
    'sarif_rule_to_markdown',
    'Convert per-rule SARIF data to a structured markdown report with Mermaid dataflow diagrams. Renders dataflow paths as visual flowcharts.',
    {
      cacheKey: z.string().optional().describe('Cache key to read SARIF from (alternative to sarifPath).'),
      ruleId: z.string().describe('The rule ID to render (e.g. "js/sql-injection").'),
      sarifPath: z.string().optional().describe('Path to the SARIF file.'),
    },
    async ({ sarifPath, cacheKey, ruleId }) => {
      const loaded = loadSarif({ sarifPath, cacheKey });
      if (loaded.error) {
        return { content: [{ type: 'text' as const, text: loaded.error }] };
      }

      const markdown = sarifRuleToMarkdown(loaded.sarif!, ruleId);

      if (!markdown) {
        return {
          content: [{
            type: 'text' as const,
            text: `No results found for ruleId "${ruleId}" in the SARIF data.`,
          }],
        };
      }

      return {
        content: [{
          type: 'text' as const,
          text: markdown,
        }],
      };
    },
  );
}

// ---------------------------------------------------------------------------
// sarif_compare_alerts
// ---------------------------------------------------------------------------

function registerSarifCompareAlertsTool(server: McpServer): void {
  const alertSpecSchema = z.object({
    cacheKey: z.string().optional().describe('Cache key for the SARIF data.'),
    resultIndex: z.number().int().min(0).describe('0-based index of the result within the rule\'s results.'),
    ruleId: z.string().describe('The rule ID of the alert.'),
    sarifPath: z.string().optional().describe('Path to the SARIF file.'),
  });

  server.tool(
    'sarif_compare_alerts',
    'Compare code locations of two SARIF alerts to detect overlap. Supports sink, source, any-location, full-path, and fingerprint comparison modes.',
    {
      alertA: alertSpecSchema.describe('First alert to compare.'),
      alertB: alertSpecSchema.describe('Second alert to compare.'),
      overlapMode: z.enum(['sink', 'source', 'any-location', 'full-path', 'fingerprint'])
        .optional()
        .default('sink')
        .describe('Comparison mode: "sink" (primary locations), "source" (first dataflow step), "any-location" (all locations), "full-path" (structural path similarity), "fingerprint" (partialFingerprints match, falls back to full-path).'),
    },
    async ({ alertA, alertB, overlapMode }) => {
      // Load SARIF for alert A
      const loadedA = loadSarif({ sarifPath: alertA.sarifPath, cacheKey: alertA.cacheKey });
      if (loadedA.error) {
        return { content: [{ type: 'text' as const, text: `Alert A: ${loadedA.error}` }] };
      }

      // Load SARIF for alert B (may be same or different source)
      const loadedB = loadSarif({ sarifPath: alertB.sarifPath, cacheKey: alertB.cacheKey });
      if (loadedB.error) {
        return { content: [{ type: 'text' as const, text: `Alert B: ${loadedB.error}` }] };
      }

      // Extract results for each rule
      const extractedA = extractRuleFromSarif(loadedA.sarif!, alertA.ruleId);
      const resultsA = extractedA.runs[0]?.results ?? [];
      if (alertA.resultIndex >= resultsA.length) {
        return { content: [{ type: 'text' as const, text: `Alert A: resultIndex ${alertA.resultIndex} out of range (${resultsA.length} results for rule "${alertA.ruleId}").` }] };
      }

      const extractedB = extractRuleFromSarif(loadedB.sarif!, alertB.ruleId);
      const resultsB = extractedB.runs[0]?.results ?? [];
      if (alertB.resultIndex >= resultsB.length) {
        return { content: [{ type: 'text' as const, text: `Alert B: resultIndex ${alertB.resultIndex} out of range (${resultsB.length} results for rule "${alertB.ruleId}").` }] };
      }

      const resultA = resultsA[alertA.resultIndex];
      const resultB = resultsB[alertB.resultIndex];

      const overlap = computeLocationOverlap(resultA, resultB, overlapMode);

      // Build location strings for response
      const locA = resultA.locations?.[0]?.physicalLocation;
      const locB = resultB.locations?.[0]?.physicalLocation;
      const locStrA = locA ? `${locA.artifactLocation?.uri ?? '?'}:${locA.region?.startLine ?? '?'}` : '?';
      const locStrB = locB ? `${locB.artifactLocation?.uri ?? '?'}:${locB.region?.startLine ?? '?'}` : '?';

      const response: Record<string, unknown> = {
        overlaps: overlap.overlaps,
        overlapMode: overlap.overlapMode,
        alertA: {
          ruleId: alertA.ruleId,
          location: locStrA,
          message: resultA.message.text,
        },
        alertB: {
          ruleId: alertB.ruleId,
          location: locStrB,
          message: resultB.message.text,
        },
        sharedLocations: overlap.sharedLocations,
      };

      if (overlap.pathSimilarity !== undefined) {
        response.pathSimilarity = overlap.pathSimilarity;
      }
      if (overlap.fingerprintMatch !== undefined) {
        response.fingerprintMatch = overlap.fingerprintMatch;
      }
      if (overlap.matchedFingerprints !== undefined) {
        response.matchedFingerprints = overlap.matchedFingerprints;
      }

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(response, null, 2),
        }],
      };
    },
  );
}

// ---------------------------------------------------------------------------
// sarif_diff_by_commits
// ---------------------------------------------------------------------------

/**
 * Parse the output of `git diff --unified=0 --diff-filter=ACMR --no-color`
 * into structured DiffFileEntry objects with hunk information.
 *
 * The unified diff format marks file headers with `--- a/path` / `+++ b/path`
 * and hunk headers with `@@ -oldStart,oldCount +newStart,newCount @@`.
 * We extract the new-side ("+") start/count from each hunk header.
 */
function parseGitDiffOutput(diffOutput: string): DiffFileEntry[] {
  const files: DiffFileEntry[] = [];
  let currentFile: DiffFileEntry | null = null;

  for (const line of diffOutput.split('\n')) {
    // New file header: +++ b/path/to/file
    if (line.startsWith('+++ b/')) {
      if (currentFile) files.push(currentFile);
      currentFile = { hunks: [], path: line.substring(6) };
      continue;
    }

    // Hunk header: @@ -old +newStart,newCount @@  or  @@ -old +newStart @@
    if (currentFile && line.startsWith('@@')) {
      const match = line.match(/@@ [^ ]+ \+(\d+)(?:,(\d+))? @@/);
      if (match) {
        const startLine = parseInt(match[1], 10);
        const lineCount = match[2] !== undefined ? parseInt(match[2], 10) : 1;
        if (lineCount > 0) {
          currentFile.hunks.push({ startLine, lineCount });
        }
      }
    }
  }
  if (currentFile) files.push(currentFile);

  return files;
}

function registerSarifDiffByCommitsTool(server: McpServer): void {
  server.tool(
    'sarif_diff_by_commits',
    'Correlate SARIF results with a git diff to classify findings as "new" (introduced in the diff) or "pre-existing". Accepts a SARIF file and a git ref range (e.g. "main..HEAD"). Supports file-level or line-level granularity.',
    {
      cacheKey: z.string().optional().describe('Cache key to read SARIF from (alternative to sarifPath).'),
      granularity: z.enum(['file', 'line']).optional().default('file')
        .describe('Matching granularity: "file" classifies any result in a changed file as new; "line" additionally checks that the result line falls within a changed hunk. Default: "file".'),
      refRange: z.string().describe('Git ref range for the diff (e.g. "main..HEAD", "abc123..def456"). Passed directly to `git diff`.'),
      repoPath: z.string().optional().describe('Path to the git repository. Defaults to the current working directory.'),
      sarifPath: z.string().optional().describe('Path to the SARIF file.'),
    },
    async ({ sarifPath, cacheKey, refRange, repoPath, granularity }) => {
      // Validate refRange to prevent git option injection
      if (/^\s*-/.test(refRange) || /\s/.test(refRange)) {
        return {
          content: [{
            type: 'text' as const,
            text: 'Invalid refRange: must not start with "-" or contain whitespace.',
          }],
        };
      }

      // Load SARIF
      const loaded = loadSarif({ sarifPath, cacheKey });
      if (loaded.error) {
        return { content: [{ type: 'text' as const, text: loaded.error }] };
      }

      // Run git diff to get changed files with hunk info
      const { executeCLICommand } = await import('../lib/cli-executor');
      const gitArgs = ['diff', '--unified=0', '--diff-filter=ACMR', '--no-color', refRange];
      const gitResult = await executeCLICommand({
        args: gitArgs,
        command: 'git',
        cwd: repoPath,
      });

      if (!gitResult.success) {
        return {
          content: [{
            type: 'text' as const,
            text: `git diff failed: ${gitResult.error ?? gitResult.stderr}`,
          }],
        };
      }

      const diffFiles = parseGitDiffOutput(gitResult.stdout);
      const g = granularity as DiffGranularity;
      const result = diffSarifByCommits(loaded.sarif!, diffFiles, refRange, g);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        }],
      };
    },
  );
}

// ---------------------------------------------------------------------------
// sarif_diff_runs
// ---------------------------------------------------------------------------

function registerSarifDiffRunsTool(server: McpServer): void {
  server.tool(
    'sarif_diff_runs',
    'Diff two SARIF files or cached results to find added, removed, and changed rules/results. Useful for comparing analysis across CodeQL versions, database updates, or query pack releases.',
    {
      cacheKeyA: z.string().optional().describe('Cache key for the first (baseline) SARIF.'),
      cacheKeyB: z.string().optional().describe('Cache key for the second (comparison) SARIF.'),
      labelA: z.string().optional().describe('Label for the first run (e.g. "v2.20.3", "main-branch", "database-A").'),
      labelB: z.string().optional().describe('Label for the second run (e.g. "v2.20.4", "feature-branch", "database-B").'),
      sarifPathA: z.string().optional().describe('Path to the first (baseline) SARIF file.'),
      sarifPathB: z.string().optional().describe('Path to the second (comparison) SARIF file.'),
    },
    async ({ sarifPathA, sarifPathB, cacheKeyA, cacheKeyB, labelA, labelB }) => {
      const loadedA = loadSarif({ sarifPath: sarifPathA, cacheKey: cacheKeyA });
      if (loadedA.error) {
        return { content: [{ type: 'text' as const, text: `Run A: ${loadedA.error}` }] };
      }

      const loadedB = loadSarif({ sarifPath: sarifPathB, cacheKey: cacheKeyB });
      if (loadedB.error) {
        return { content: [{ type: 'text' as const, text: `Run B: ${loadedB.error}` }] };
      }

      const diff = diffSarifRules(loadedA.sarif!, loadedB.sarif!);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            labelA: labelA ?? 'Run A',
            labelB: labelB ?? 'Run B',
            ...diff,
          }, null, 2),
        }],
      };
    },
  );
}

// ---------------------------------------------------------------------------
// sarif_store
// ---------------------------------------------------------------------------

function registerSarifStoreTool(server: McpServer): void {
  server.tool(
    'sarif_store',
    'Store SARIF content in the session cache for use by other sarif_* tools. Returns a cache key that can be passed to sarifPath/cacheKey parameters of other tools.',
    {
      label: z.string().optional().describe('Human-readable label for this SARIF (e.g. "dubbo-java-2025-03").'),
      sarifContent: z.string().optional().describe('SARIF JSON content as a string (alternative to sarifPath).'),
      sarifPath: z.string().optional().describe('Path to a SARIF file on disk.'),
    },
    async ({ sarifContent, sarifPath, label }) => {
      if (!sarifContent && !sarifPath) {
        return { content: [{ type: 'text' as const, text: 'Either sarifContent or sarifPath is required.' }] };
      }

      let content: string;
      if (sarifPath) {
        try {
          content = readFileSync(sarifPath, 'utf8');
        } catch {
          return { content: [{ type: 'text' as const, text: `Failed to read SARIF file: ${sarifPath}` }] };
        }
      } else {
        content = sarifContent!;
      }

      // Validate SARIF structure
      const loaded = loadSarif({ inlineContent: content });
      if (loaded.error) {
        return { content: [{ type: 'text' as const, text: loaded.error }] };
      }

      // Generate a deterministic cache key from content hash
      const { createHash } = await import('crypto');
      const hash = createHash('sha256').update(content).digest('hex').slice(0, 16);
      const cacheKey = `sarif-store-${hash}`;

      // Count results for metadata
      const sarif = loaded.sarif!;
      const resultCount = sarif.runs[0]?.results?.length ?? 0;
      const ruleCount = sarif.runs[0]?.tool.driver.rules?.length ?? 0;
      const toolName = sarif.runs[0]?.tool.driver.name ?? 'unknown';

      const store = sessionDataManager.getStore();
      store.putCacheEntry({
        cacheKey,
        codeqlVersion: sarif.runs[0]?.tool.driver.version ?? 'unknown',
        databasePath: sarifPath ?? 'inline',
        language: 'sarif',
        outputFormat: 'sarif',
        queryName: 'sarif_store',
        queryPath: sarifPath ?? 'inline',
        resultContent: content,
        resultCount,
      });

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            cacheKey,
            label: label ?? null,
            resultCount,
            ruleCount,
            source: sarifPath ? 'file' : 'inline',
            toolName,
          }, null, 2),
        }],
      };
    },
  );
}

// ---------------------------------------------------------------------------
// sarif_deduplicate_rules
// ---------------------------------------------------------------------------

function registerSarifDeduplicateRulesTool(server: McpServer): void {
  server.tool(
    'sarif_deduplicate_rules',
    'Identify duplicate alerts across two SARIF files by comparing rules pairwise. Uses fingerprint matching first, then full-path location overlap as fallback. Useful for cleanup after query changes or pack upgrades.',
    {
      cacheKeyA: z.string().optional().describe('Cache key for the first SARIF.'),
      cacheKeyB: z.string().optional().describe('Cache key for the second SARIF.'),
      overlapThreshold: z.number().min(0).max(1).optional().default(0.8)
        .describe('Minimum overlap score (0-1) to consider a rule pair as duplicates. Default: 0.8.'),
      sarifPathA: z.string().optional().describe('Path to the first SARIF file.'),
      sarifPathB: z.string().optional().describe('Path to the second SARIF file.'),
    },
    async ({ sarifPathA, sarifPathB, cacheKeyA, cacheKeyB, overlapThreshold }) => {
      const loadedA = loadSarif({ sarifPath: sarifPathA, cacheKey: cacheKeyA });
      if (loadedA.error) {
        return { content: [{ type: 'text' as const, text: `SARIF A: ${loadedA.error}` }] };
      }
      const loadedB = loadSarif({ sarifPath: sarifPathB, cacheKey: cacheKeyB });
      if (loadedB.error) {
        return { content: [{ type: 'text' as const, text: `SARIF B: ${loadedB.error}` }] };
      }

      const rulesA = listSarifRules(loadedA.sarif!);
      const rulesB = listSarifRules(loadedB.sarif!);

      const duplicateGroups: Array<{
        matchedAlerts: number;
        overlapScore: number;
        ruleIdA: string;
        ruleIdB: string;
        totalA: number;
        totalB: number;
        unmatchedA: number;
        unmatchedB: number;
      }> = [];

      // Precompute per-rule extracted results to avoid redundant filtering in the pairwise loop
      type RuleData = {
        results: SarifResult[];
        ruleObj: SarifRule | { id: string };
      };
      const ruleDataA = new Map<string, RuleData>();
      for (const rA of rulesA) {
        if (rA.resultCount === 0) continue;
        const extracted = extractRuleFromSarif(loadedA.sarif!, rA.ruleId);
        ruleDataA.set(rA.ruleId, {
          results: extracted.runs[0]?.results ?? [],
          ruleObj: extracted.runs[0]?.tool.driver.rules?.[0] ?? { id: rA.ruleId },
        });
      }
      const ruleDataB = new Map<string, RuleData>();
      for (const rB of rulesB) {
        if (rB.resultCount === 0) continue;
        const extracted = extractRuleFromSarif(loadedB.sarif!, rB.ruleId);
        ruleDataB.set(rB.ruleId, {
          results: extracted.runs[0]?.results ?? [],
          ruleObj: extracted.runs[0]?.tool.driver.rules?.[0] ?? { id: rB.ruleId },
        });
      }

      // Compare each rule in A against each rule in B
      for (const rA of rulesA) {
        const dataA = ruleDataA.get(rA.ruleId);
        if (!dataA) continue;
        for (const rB of rulesB) {
          const dataB = ruleDataB.get(rB.ruleId);
          if (!dataB) continue;

          const { results: resultsA, ruleObj: ruleObjA } = dataA;
          const { results: resultsB, ruleObj: ruleObjB } = dataB;

          // Full-path location overlap
          const overlaps = findOverlappingAlerts(resultsA, ruleObjA, resultsB, ruleObjB, 'full-path');

          // Fingerprint matching — count unique A-side results that match any B-side result
          const matchedAIndices = new Set<number>();
          for (let ai = 0; ai < resultsA.length; ai++) {
            for (const rResultB of resultsB) {
              const fpResult = computeFingerprintOverlap(resultsA[ai], rResultB);
              if (fpResult.fingerprintMatch) {
                matchedAIndices.add(ai);
                break; // one match per A result is enough
              }
            }
          }

          // Overlap scoring: We use the higher of two matching strategies:
          // 1. Location-based: `overlaps.length` from full-path structural comparison
          // 2. Fingerprint-based: `matchedAIndices.size` from partialFingerprints
          // The score is Jaccard-like: matchedAlerts / (totalA + totalB - matchedAlerts).
          // We cap matchedAlerts at min(totalA, totalB) so unmatched counts stay non-negative.
          const matchedAlerts = Math.max(overlaps.length, matchedAIndices.size);
          const minResults = Math.min(resultsA.length, resultsB.length);
          // Cap matched alerts at the smaller set size to avoid negative unmatched counts
          const cappedMatched = Math.min(matchedAlerts, minResults);
          const totalUnique = resultsA.length + resultsB.length - cappedMatched;
          const overlapScore = totalUnique > 0 ? cappedMatched / totalUnique : 0;

          if (overlapScore >= (overlapThreshold ?? 0.8)) {
            duplicateGroups.push({
              matchedAlerts: cappedMatched,
              overlapScore: Math.round(overlapScore * 1000) / 1000,
              ruleIdA: rA.ruleId,
              ruleIdB: rB.ruleId,
              totalA: resultsA.length,
              totalB: resultsB.length,
              unmatchedA: Math.max(0, resultsA.length - cappedMatched),
              unmatchedB: Math.max(0, resultsB.length - cappedMatched),
            });
          }
        }
      }

      // Sort by overlap score descending
      duplicateGroups.sort((a, b) => b.overlapScore - a.overlapScore);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            duplicateGroups,
            summary: {
              duplicatePairsFound: duplicateGroups.length,
              overlapThreshold: overlapThreshold ?? 0.8,
              totalRulesA: rulesA.length,
              totalRulesB: rulesB.length,
            },
          }, null, 2),
        }],
      };
    },
  );
}

/**
 * Batch compare — find all overlapping alerts between two rules.
 * This is an internal helper used by the compare_overlapping_alerts prompt.
 */
export function findOverlappingAlertsBetweenRules(
  sarif: SarifDocument,
  ruleIdA: string,
  ruleIdB: string,
  mode: 'any-location' | 'fingerprint' | 'full-path' | 'sink' | 'source' = 'sink',
) {
  const extractedA = extractRuleFromSarif(sarif, ruleIdA);
  const extractedB = extractRuleFromSarif(sarif, ruleIdB);

  const resultsA = extractedA.runs[0]?.results ?? [];
  const resultsB = extractedB.runs[0]?.results ?? [];
  const rulesA = extractedA.runs[0]?.tool.driver.rules ?? [];
  const rulesB = extractedB.runs[0]?.tool.driver.rules ?? [];

  const ruleA = rulesA[0] ?? { id: ruleIdA };
  const ruleB = rulesB[0] ?? { id: ruleIdB };

  return findOverlappingAlerts(resultsA, ruleA, resultsB, ruleB, mode);
}
