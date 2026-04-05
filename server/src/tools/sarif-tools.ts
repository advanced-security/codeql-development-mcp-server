/**
 * SARIF Analysis Tools — LLM-facing tools for rule-level SARIF extraction,
 * markdown visualization with Mermaid dataflow diagrams, and alert overlap analysis.
 *
 * Opt-in via ENABLE_ANNOTATION_TOOLS=true (same flag as annotations/audit/cache).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readFileSync } from 'fs';
import { z } from 'zod';
import {
  computeFingerprintOverlap,
  computeLocationOverlap,
  diffSarifRules,
  extractRuleFromSarif,
  findOverlappingAlerts,
  listSarifRules,
  sarifRuleToMarkdown,
} from '../lib/sarif-utils';
import { sessionDataManager } from '../lib/session-data-manager';
import type { SarifDocument } from '../types/sarif';
import { logger } from '../utils/logger';

/**
 * Register all SARIF analysis tools with the MCP server.
 */
export function registerSarifTools(server: McpServer): void {
  const config = sessionDataManager.getConfig();

  if (!config.enableAnnotationTools) {
    logger.info(
      'SARIF tools are disabled (opt-in). Set ENABLE_ANNOTATION_TOOLS=true to enable sarif_* tools.',
    );
    return;
  }

  registerSarifExtractRuleTool(server);
  registerSarifListRulesTool(server);
  registerSarifRuleToMarkdownTool(server);
  registerSarifCompareAlertsTool(server);
  registerSarifDeduplicateRulesTool(server);
  registerSarifDiffRunsTool(server);
  registerSarifStoreTool(server);

  logger.info('Registered SARIF analysis tools');
}

// ---------------------------------------------------------------------------
// Shared helper: load SARIF from file path or cache key
// ---------------------------------------------------------------------------

function loadSarif(
  sarifPath?: string,
  cacheKey?: string,
  inlineContent?: string,
): { error?: string; sarif?: SarifDocument } {
  if (!sarifPath && !cacheKey && !inlineContent) {
    return { error: 'Either sarifPath or cacheKey is required.' };
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
      const loaded = loadSarif(sarifPath, cacheKey);
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
      const loaded = loadSarif(sarifPath, cacheKey);
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
      const loaded = loadSarif(sarifPath, cacheKey);
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
    'Compare code locations of two SARIF alerts to detect overlap. Supports sink, source, any-location, and full-path comparison modes.',
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
      const loadedA = loadSarif(alertA.sarifPath, alertA.cacheKey);
      if (loadedA.error) {
        return { content: [{ type: 'text' as const, text: `Alert A: ${loadedA.error}` }] };
      }

      // Load SARIF for alert B (may be same or different source)
      const loadedB = loadSarif(alertB.sarifPath, alertB.cacheKey);
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
      const loadedA = loadSarif(sarifPathA, cacheKeyA);
      if (loadedA.error) {
        return { content: [{ type: 'text' as const, text: `Run A: ${loadedA.error}` }] };
      }

      const loadedB = loadSarif(sarifPathB, cacheKeyB);
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
      const loaded = loadSarif(undefined, undefined, content);
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
        databasePath: label ?? 'sarif-store',
        language: 'sarif',
        outputFormat: 'sarif',
        queryName: label ?? 'sarif-store',
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
      const loadedA = loadSarif(sarifPathA, cacheKeyA);
      if (loadedA.error) {
        return { content: [{ type: 'text' as const, text: `SARIF A: ${loadedA.error}` }] };
      }
      const loadedB = loadSarif(sarifPathB, cacheKeyB);
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

      // Compare each rule in A against each rule in B
      for (const rA of rulesA) {
        for (const rB of rulesB) {
          if (rA.resultCount === 0 || rB.resultCount === 0) continue;

          const extractedA = extractRuleFromSarif(loadedA.sarif!, rA.ruleId);
          const extractedB = extractRuleFromSarif(loadedB.sarif!, rB.ruleId);
          const resultsA = extractedA.runs[0]?.results ?? [];
          const resultsB = extractedB.runs[0]?.results ?? [];
          const ruleObjA = extractedA.runs[0]?.tool.driver.rules?.[0] ?? { id: rA.ruleId };
          const ruleObjB = extractedB.runs[0]?.tool.driver.rules?.[0] ?? { id: rB.ruleId };

          // Use fingerprint mode (which falls back to full-path)
          const overlaps = findOverlappingAlerts(resultsA, ruleObjA, resultsB, ruleObjB, 'full-path');

          // Also try fingerprint matching for exact dupes
          let fingerprintMatches = 0;
          for (const rResultA of resultsA) {
            for (const rResultB of resultsB) {
              const fpResult = computeFingerprintOverlap(rResultA, rResultB);
              if (fpResult.fingerprintMatch) {
                fingerprintMatches++;
              }
            }
          }

          const matchedAlerts = Math.max(overlaps.length, fingerprintMatches);
          const totalUnique = resultsA.length + resultsB.length - matchedAlerts;
          const overlapScore = totalUnique > 0 ? matchedAlerts / totalUnique : 0;

          if (overlapScore >= (overlapThreshold ?? 0.8)) {
            duplicateGroups.push({
              matchedAlerts,
              overlapScore: Math.round(overlapScore * 1000) / 1000,
              ruleIdA: rA.ruleId,
              ruleIdB: rB.ruleId,
              totalA: resultsA.length,
              totalB: resultsB.length,
              unmatchedA: resultsA.length - matchedAlerts,
              unmatchedB: resultsB.length - matchedAlerts,
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
