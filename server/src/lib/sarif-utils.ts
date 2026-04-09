/**
 * Shared SARIF decomposition, visualization, and overlap analysis utilities.
 *
 * All functions are pure (no side effects, no I/O) for easy testing and reuse.
 * Used by:
 * - Cache model (Part 1) — decomposing database_analyze SARIF into per-rule entries
 * - sarif_extract_rule tool (Part 2)
 * - sarif_rule_to_markdown tool (Part 4)
 * - sarif_compare_alerts tool (Part 5)
 */

import type { SarifDocument, SarifResult, SarifRule } from '../types/sarif';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Overlap analysis mode */
export type OverlapMode = 'any-location' | 'fingerprint' | 'full-path' | 'sink' | 'source';

/** A shared location between two alerts */
export interface SharedLocation {
  endColumn?: number;
  endLine?: number;
  startColumn?: number;
  startLine?: number;
  uri: string;
}

/** Result of comparing two SARIF results for location overlap */
export interface OverlapResult {
  fingerprintMatch?: boolean;
  matchedFingerprints?: Record<string, string>;
  overlaps: boolean;
  overlapMode: OverlapMode;
  pathSimilarity?: number;
  sharedLocations: SharedLocation[];
}

/** An overlapping alert pair found by findOverlappingAlerts */
export interface AlertOverlap {
  overlapDetails: OverlapResult;
  resultA: SarifResult;
  resultAIndex: number;
  resultB: SarifResult;
  resultBIndex: number;
  ruleIdA: string;
  ruleIdB: string;
}

/** Rule summary returned by listSarifRules */
export interface SarifRuleSummary {
  kind?: string;
  name?: string;
  precision?: string;
  resultCount: number;
  ruleId: string;
  severity?: string;
  tags?: string[];
  tool?: string;
  toolVersion?: string;
}

/** A rule whose result count changed between two SARIF runs */
export interface ChangedRule {
  countA: number;
  countB: number;
  delta: number;
  ruleId: string;
}

/** Result of diffing two SARIF documents */
export interface SarifDiffResult {
  addedRules: SarifRuleSummary[];
  changedRules: ChangedRule[];
  removedRules: SarifRuleSummary[];
  summary: {
    totalResultsA: number;
    totalResultsB: number;
    totalRulesA: number;
    totalRulesB: number;
    toolA?: string;
    toolB?: string;
    toolVersionA?: string;
    toolVersionB?: string;
  };
  unchangedRules: SarifRuleSummary[];
}

// ---------------------------------------------------------------------------
// SARIF rule helpers
// ---------------------------------------------------------------------------

/**
 * Get the human-readable display name for a SARIF rule.
 *
 * Priority: `shortDescription.text` → `name` → `id` (fallback).
 * This is the single authoritative function for deriving a rule's
 * display name from its SARIF definition.
 */
export function getRuleDisplayName(rule: SarifRule): string {
  return rule.shortDescription?.text ?? rule.name ?? rule.id;
}

/**
 * Collect all rule definitions from a SARIF run.
 *
 * Rules may live in `tool.driver.rules` (standard) or in
 * `tool.extensions[].rules` (when `--sarif-group-rules-by-pack` is used).
 * This function merges both sources into a single array.
 */
export function collectAllRules(run: SarifDocument['runs'][0]): SarifRule[] {
  const driverRules = run.tool.driver.rules ?? [];
  const extensionRules: SarifRule[] = [];
  for (const ext of run.tool.extensions ?? []) {
    if (ext.rules) {
      extensionRules.push(...ext.rules);
    }
  }
  return [...driverRules, ...extensionRules];
}

// ---------------------------------------------------------------------------
// Location extraction helpers
// ---------------------------------------------------------------------------

interface NormalizedLocation {
  endColumn?: number;
  endLine?: number;
  startColumn?: number;
  startLine?: number;
  uri: string;
}

function extractPrimaryLocations(result: SarifResult): NormalizedLocation[] {
  return (result.locations ?? [])
    .filter(loc => loc.physicalLocation?.artifactLocation?.uri)
    .map(loc => ({
      endColumn: loc.physicalLocation!.region?.endColumn,
      endLine: loc.physicalLocation!.region?.endLine ?? loc.physicalLocation!.region?.startLine,
      startColumn: loc.physicalLocation!.region?.startColumn,
      startLine: loc.physicalLocation!.region?.startLine,
      uri: loc.physicalLocation!.artifactLocation!.uri!,
    }));
}

function extractSourceLocations(result: SarifResult): NormalizedLocation[] {
  const flows = result.codeFlows ?? [];
  const sources: NormalizedLocation[] = [];
  for (const flow of flows) {
    for (const tf of flow.threadFlows ?? []) {
      const steps = tf.locations ?? [];
      if (steps.length > 0) {
        const firstStep = steps[0];
        const loc = firstStep.location?.physicalLocation;
        if (loc?.artifactLocation?.uri) {
          sources.push({
            endColumn: loc.region?.endColumn,
            endLine: loc.region?.endLine ?? loc.region?.startLine,
            startColumn: loc.region?.startColumn,
            startLine: loc.region?.startLine,
            uri: loc.artifactLocation.uri,
          });
        }
      }
    }
  }
  return sources;
}

function extractAllLocations(result: SarifResult): NormalizedLocation[] {
  const locs: NormalizedLocation[] = [...extractPrimaryLocations(result)];

  // Related locations
  for (const rl of result.relatedLocations ?? []) {
    if (rl.physicalLocation?.artifactLocation?.uri) {
      locs.push({
        endColumn: rl.physicalLocation.region?.endColumn,
        endLine: rl.physicalLocation.region?.endLine ?? rl.physicalLocation.region?.startLine,
        startColumn: rl.physicalLocation.region?.startColumn,
        startLine: rl.physicalLocation.region?.startLine,
        uri: rl.physicalLocation.artifactLocation.uri,
      });
    }
  }

  // CodeFlow steps
  for (const flow of result.codeFlows ?? []) {
    for (const tf of flow.threadFlows ?? []) {
      for (const step of tf.locations ?? []) {
        const loc = step.location?.physicalLocation;
        if (loc?.artifactLocation?.uri) {
          locs.push({
            endColumn: loc.region?.endColumn,
            endLine: loc.region?.endLine ?? loc.region?.startLine,
            startColumn: loc.region?.startColumn,
            startLine: loc.region?.startLine,
            uri: loc.artifactLocation.uri,
          });
        }
      }
    }
  }

  return locs;
}

function extractFullPathLocations(result: SarifResult): NormalizedLocation[] {
  const flows = result.codeFlows ?? [];
  const locs: NormalizedLocation[] = [];
  for (const flow of flows) {
    for (const tf of flow.threadFlows ?? []) {
      for (const step of tf.locations ?? []) {
        const loc = step.location?.physicalLocation;
        if (loc?.artifactLocation?.uri) {
          locs.push({
            endColumn: loc.region?.endColumn,
            endLine: loc.region?.endLine ?? loc.region?.startLine,
            startColumn: loc.region?.startColumn,
            startLine: loc.region?.startLine,
            uri: loc.artifactLocation.uri,
          });
        }
      }
    }
  }
  return locs;
}

/**
 * Normalize a SARIF URI for comparison purposes.
 *
 * Handles differences between:
 * - Absolute file:// URIs from `bqrs interpret` (e.g. "file:///Users/dev/project/src/db.js")
 * - Relative URIs from `database analyze` (e.g. "src/db.js")
 * - URIs with %SRCROOT% base ID
 *
 * Returns the shortest suffix that identifies the file, enabling cross-run comparison.
 */
function normalizeUri(uri: string): string {
  let normalized = uri;

  // Strip file:// scheme and decode
  if (normalized.startsWith('file:///')) {
    normalized = normalized.substring(7);
  } else if (normalized.startsWith('file://')) {
    normalized = normalized.substring(5);
  }

  // Decode percent-encoded characters
  try {
    normalized = decodeURIComponent(normalized);
  } catch { /* keep as-is if decoding fails */ }

  // Normalize path separators
  normalized = normalized.replace(/\\/g, '/');

  // Remove leading slashes for consistent comparison
  normalized = normalized.replace(/^\/+/, '');

  return normalized;
}

/**
 * Check if two URIs refer to the same file.
 * Uses suffix matching: if one URI is a suffix of the other, they match.
 */
function urisMatch(uriA: string, uriB: string): boolean {
  const a = normalizeUri(uriA);
  const b = normalizeUri(uriB);
  if (a === b) return true;
  // Suffix match: the shorter path must be a suffix of the longer one
  return a.endsWith(b) || b.endsWith(a);
}

/** Check if two regions in the same file overlap. */
function regionsOverlap(a: NormalizedLocation, b: NormalizedLocation): boolean {
  if (!urisMatch(a.uri, b.uri)) return false;

  const aStartLine = a.startLine ?? 0;
  const aEndLine = a.endLine ?? aStartLine;
  const bStartLine = b.startLine ?? 0;
  const bEndLine = b.endLine ?? bStartLine;

  // No line overlap → no overlap
  if (aEndLine < bStartLine || bEndLine < aStartLine) return false;

  // Lines overlap. If on the same line, check columns.
  if (aStartLine === aEndLine && bStartLine === bEndLine && aStartLine === bStartLine) {
    const aStartCol = a.startColumn ?? 0;
    const aEndCol = a.endColumn ?? Infinity;
    const bStartCol = b.startColumn ?? 0;
    const bEndCol = b.endColumn ?? Infinity;
    if (aEndCol < bStartCol || bEndCol < aStartCol) return false;
  }

  return true;
}

function locationKey(loc: NormalizedLocation): string {
  return `${normalizeUri(loc.uri)}:${loc.startLine ?? '?'}:${loc.startColumn ?? '?'}`;
}

function findSharedLocations(
  locsA: NormalizedLocation[],
  locsB: NormalizedLocation[],
): SharedLocation[] {
  const shared: SharedLocation[] = [];
  const seen = new Set<string>();

  for (const a of locsA) {
    for (const b of locsB) {
      if (regionsOverlap(a, b)) {
        const key = `${locationKey(a)}|${locationKey(b)}`;
        if (!seen.has(key)) {
          seen.add(key);
          shared.push({
            endColumn: a.endColumn,
            endLine: a.endLine,
            startColumn: a.startColumn,
            startLine: a.startLine,
            uri: a.uri,
          });
        }
      }
    }
  }

  return shared;
}

// ---------------------------------------------------------------------------
// Core SARIF functions
// ---------------------------------------------------------------------------

/**
 * Extract results and rule definition for a specific ruleId from SARIF.
 *
 * Returns a valid SARIF document containing only the matching rule and results,
 * with tool extensions preserved.
 */
export function extractRuleFromSarif(sarif: SarifDocument, ruleId: string): SarifDocument {
  const run = sarif.runs[0];
  if (!run) {
    return { ...sarif, runs: [{ tool: { driver: { name: 'CodeQL', rules: [] } }, results: [] }] };
  }

  // Collect rules from both driver and extensions (supports --sarif-group-rules-by-pack)
  const allRules = collectAllRules(run);
  const matchingRules = allRules.filter(r => r.id === ruleId);
  const matchingResults = (run.results ?? [])
    .filter(r => r.ruleId === ruleId)
    .map(r => ({ ...r, ruleIndex: 0 }));

  const extractedRun: SarifDocument['runs'][0] = {
    tool: {
      driver: {
        ...run.tool.driver,
        rules: matchingRules,
      },
      extensions: run.tool.extensions,
    },
    results: matchingResults,
  };

  // Preserve run properties if present
  if (run.properties) {
    extractedRun.properties = run.properties;
  }

  return {
    version: sarif.version,
    $schema: sarif.$schema,
    runs: [extractedRun],
  };
}

/**
 * Decompose multi-rule SARIF into per-rule SARIF subsets.
 *
 * Returns a Map from ruleId to a SARIF document containing only
 * the results and rule definition for that rule.
 */
export function decomposeSarifByRule(sarif: SarifDocument): Map<string, SarifDocument> {
  const run = sarif.runs[0];
  if (!run) return new Map();

  const results = run.results ?? [];
  const ruleIds = new Set(results.map(r => r.ruleId));
  const map = new Map<string, SarifDocument>();

  for (const ruleId of ruleIds) {
    map.set(ruleId, extractRuleFromSarif(sarif, ruleId));
  }

  return map;
}

// ---------------------------------------------------------------------------
// Mermaid diagram generation
// ---------------------------------------------------------------------------

/** Sanitize a string for use inside a Mermaid node label (double-quoted). */
function sanitizeMermaidLabel(text: string): string {
  // Escape quotes and limit length
  let sanitized = text.replace(/"/g, '#quot;');
  if (sanitized.length > 60) {
    sanitized = sanitized.substring(0, 57) + '...';
  }
  return sanitized;
}

/**
 * Convert a SARIF result with codeFlows to a Mermaid dataflow diagram.
 *
 * Returns an empty string for results without codeFlows (problem-kind results).
 * For path-problem results, generates a `flowchart LR` diagram showing the
 * dataflow path from source (green) to sink (red).
 */
export function sarifResultToMermaid(result: SarifResult, _rule: SarifRule): string {
  const flows = result.codeFlows;
  if (!flows || flows.length === 0) return '';

  const threadFlow = flows[0]?.threadFlows?.[0];
  if (!threadFlow || !threadFlow.locations || threadFlow.locations.length === 0) return '';

  const steps = threadFlow.locations;
  const lines: string[] = ['flowchart LR'];
  const nodeIds: string[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const loc = step.location?.physicalLocation;
    const message = step.location?.message?.text ?? '(step)';
    const uri = loc?.artifactLocation?.uri ?? 'unknown';
    const line = loc?.region?.startLine ?? '?';
    const fileName = uri.split('/').pop() ?? uri;

    const nodeId = String.fromCharCode(65 + (i % 26)) + (i >= 26 ? String(Math.floor(i / 26)) : '');
    nodeIds.push(nodeId);

    const label = sanitizeMermaidLabel(message);
    lines.push(`    ${nodeId}["${label}<br/>${fileName}:${line}"]`);
  }

  // Add edges
  for (let i = 0; i < nodeIds.length - 1; i++) {
    lines.push(`    ${nodeIds[i]} --> ${nodeIds[i + 1]}`);
  }

  // Style source (green) and sink (red)
  if (nodeIds.length >= 2) {
    lines.push(`    style ${nodeIds[0]} fill:#d4edda`);
    lines.push(`    style ${nodeIds[nodeIds.length - 1]} fill:#f8d7da`);
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Markdown report generation
// ---------------------------------------------------------------------------

/**
 * Convert all results for a rule to a markdown report with Mermaid diagrams.
 *
 * Returns an empty string if the ruleId does not exist in the SARIF document.
 */
export function sarifRuleToMarkdown(sarif: SarifDocument, ruleId: string): string {
  const extracted = extractRuleFromSarif(sarif, ruleId);
  const run = extracted.runs[0];
  const results = run.results ?? [];
  const rules = run.tool.driver.rules ?? [];

  if (results.length === 0 && rules.length === 0) return '';

  const rule = rules[0];
  const lines: string[] = [];

  // Rule summary header
  lines.push(`## ${ruleId}`);
  lines.push('');
  if (rule) {
    const name = getRuleDisplayName(rule);
    lines.push(`**Name**: ${name}`);

    const props = rule.properties as Record<string, unknown> | undefined;
    if (props) {
      const parts: string[] = [];
      if (props.kind) parts.push(`**Kind**: ${props.kind}`);
      if (props.precision) parts.push(`**Precision**: ${props.precision}`);
      if (props['security-severity']) parts.push(`**Security Severity**: ${props['security-severity']}`);
      if (Array.isArray(props.tags) && props.tags.length > 0) {
        parts.push(`**Tags**: ${(props.tags as string[]).join(', ')}`);
      }
      if (parts.length > 0) {
        lines.push(parts.join(' | '));
      }
    }
    lines.push(`**Results**: ${results.length}`);
    lines.push('');

    // Query help
    if (rule.help?.markdown) {
      lines.push('### Query Help');
      lines.push('');
      lines.push(rule.help.markdown);
      lines.push('');
    }
  }

  // Results table
  if (results.length > 0) {
    lines.push('### Results');
    lines.push('');
    lines.push('| # | File | Line | Message |');
    lines.push('|---|------|------|---------|');
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const loc = r.locations?.[0]?.physicalLocation;
      const uri = loc?.artifactLocation?.uri ?? '(unknown)';
      const line = loc?.region?.startLine ?? '-';
      const msg = r.message.text.replace(/([\\|])/g, '\\$1');
      lines.push(`| ${i + 1} | ${uri} | ${line} | ${msg} |`);
    }
    lines.push('');
  }

  // Dataflow diagrams
  const pathResults = results.filter(r => r.codeFlows && r.codeFlows.length > 0);
  if (pathResults.length > 0 && rule) {
    lines.push('### Dataflow Paths');
    lines.push('');
    for (let i = 0; i < pathResults.length; i++) {
      const r = pathResults[i];
      const loc = r.locations?.[0]?.physicalLocation;
      const uri = loc?.artifactLocation?.uri ?? '(unknown)';
      const line = loc?.region?.startLine ?? '?';
      lines.push(`#### Path ${i + 1}: ${uri}:${line}`);
      lines.push('');
      const mermaid = sarifResultToMermaid(r, rule);
      if (mermaid) {
        lines.push('```mermaid');
        lines.push(mermaid);
        lines.push('```');
        lines.push('');
      }
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Rule listing and diffing
// ---------------------------------------------------------------------------

/**
 * List all rules in a SARIF document with result counts and metadata.
 *
 * Returns a summary for each rule defined in the SARIF, including rules
 * that have zero results (defined but not triggered).
 */
export function listSarifRules(sarif: SarifDocument): SarifRuleSummary[] {
  const run = sarif.runs[0];
  if (!run) return [];

  const allRules = collectAllRules(run);
  const results = run.results ?? [];
  const toolName = run.tool.driver.name;
  const toolVersion = run.tool.driver.version;

  // Count results per ruleId
  const countByRule = new Map<string, number>();
  for (const r of results) {
    countByRule.set(r.ruleId, (countByRule.get(r.ruleId) ?? 0) + 1);
  }

  // Build summaries from rule definitions
  const summaries: SarifRuleSummary[] = [];
  const seenRuleIds = new Set<string>();

  for (const rule of allRules) {
    seenRuleIds.add(rule.id);
    const props = rule.properties as Record<string, unknown> | undefined;
    summaries.push({
      kind: props?.kind as string | undefined,
      name: getRuleDisplayName(rule),
      precision: props?.precision as string | undefined,
      resultCount: countByRule.get(rule.id) ?? 0,
      ruleId: rule.id,
      severity: props?.['security-severity'] as string | undefined,
      tags: Array.isArray(props?.tags) ? (props.tags as string[]) : undefined,
      tool: toolName,
      toolVersion,
    });
  }

  // Include orphan ruleIds (results referencing rules not in definitions)
  for (const [ruleId, count] of countByRule) {
    if (!seenRuleIds.has(ruleId)) {
      summaries.push({
        resultCount: count,
        ruleId,
        tool: toolName,
        toolVersion,
      });
    }
  }

  return summaries;
}

/**
 * Diff two SARIF documents: compare rule sets and result counts.
 *
 * Useful for detecting behavioral changes across CodeQL versions,
 * database updates, or query pack releases.
 */
export function diffSarifRules(sarifA: SarifDocument, sarifB: SarifDocument): SarifDiffResult {
  const rulesA = listSarifRules(sarifA);
  const rulesB = listSarifRules(sarifB);

  const mapA = new Map(rulesA.map(r => [r.ruleId, r]));
  const mapB = new Map(rulesB.map(r => [r.ruleId, r]));

  const addedRules: SarifRuleSummary[] = [];
  const removedRules: SarifRuleSummary[] = [];
  const changedRules: ChangedRule[] = [];
  const unchangedRules: SarifRuleSummary[] = [];

  // Find removed and changed/unchanged rules
  for (const [ruleId, ruleA] of mapA) {
    const ruleB = mapB.get(ruleId);
    if (!ruleB) {
      removedRules.push(ruleA);
    } else if (ruleA.resultCount !== ruleB.resultCount) {
      changedRules.push({
        countA: ruleA.resultCount,
        countB: ruleB.resultCount,
        delta: ruleB.resultCount - ruleA.resultCount,
        ruleId,
      });
    } else {
      unchangedRules.push(ruleA);
    }
  }

  // Find added rules
  for (const [ruleId, ruleB] of mapB) {
    if (!mapA.has(ruleId)) {
      addedRules.push(ruleB);
    }
  }

  const runA = sarifA.runs[0];
  const runB = sarifB.runs[0];

  return {
    addedRules,
    changedRules,
    removedRules,
    summary: {
      toolA: runA?.tool.driver.name,
      toolB: runB?.tool.driver.name,
      toolVersionA: runA?.tool.driver.version,
      toolVersionB: runB?.tool.driver.version,
      totalResultsA: rulesA.reduce((sum, r) => sum + r.resultCount, 0),
      totalResultsB: rulesB.reduce((sum, r) => sum + r.resultCount, 0),
      totalRulesA: rulesA.length,
      totalRulesB: rulesB.length,
    },
    unchangedRules,
  };
}

// ---------------------------------------------------------------------------
// Location overlap analysis
// ---------------------------------------------------------------------------

/**
 * Compare two SARIF results by their partialFingerprints.
 * Returns a match result if both have fingerprints with at least one shared key
 * whose values are equal. Returns no match if fingerprints are absent.
 */
export function computeFingerprintOverlap(
  resultA: SarifResult,
  resultB: SarifResult,
): OverlapResult {
  const fpA = resultA.partialFingerprints;
  const fpB = resultB.partialFingerprints;

  if (!fpA || !fpB || Object.keys(fpA).length === 0 || Object.keys(fpB).length === 0) {
    return {
      fingerprintMatch: false,
      overlaps: false,
      overlapMode: 'fingerprint',
      sharedLocations: [],
    };
  }

  const matchedFingerprints: Record<string, string> = {};
  for (const key of Object.keys(fpA)) {
    if (key in fpB && fpA[key] === fpB[key]) {
      matchedFingerprints[key] = fpA[key];
    }
  }

  const hasMatch = Object.keys(matchedFingerprints).length > 0;

  return {
    fingerprintMatch: hasMatch,
    matchedFingerprints: hasMatch ? matchedFingerprints : undefined,
    overlaps: hasMatch,
    overlapMode: 'fingerprint',
    sharedLocations: [],
  };
}

/**
 * Compute location overlap between two SARIF results.
 */
export function computeLocationOverlap(
  resultA: SarifResult,
  resultB: SarifResult,
  mode: OverlapMode = 'sink',
): OverlapResult {
  let locsA: NormalizedLocation[];
  let locsB: NormalizedLocation[];

  switch (mode) {
    case 'fingerprint': {
      const fpResult = computeFingerprintOverlap(resultA, resultB);
      if (fpResult.fingerprintMatch) {
        return fpResult;
      }
      // Fall back to full-path when fingerprints are absent or don't match
      return computeLocationOverlap(resultA, resultB, 'full-path');
    }
    case 'sink':
      locsA = extractPrimaryLocations(resultA);
      locsB = extractPrimaryLocations(resultB);
      break;
    case 'source':
      locsA = extractSourceLocations(resultA);
      locsB = extractSourceLocations(resultB);
      break;
    case 'any-location':
      locsA = extractAllLocations(resultA);
      locsB = extractAllLocations(resultB);
      break;
    case 'full-path': {
      const pathA = extractFullPathLocations(resultA);
      const pathB = extractFullPathLocations(resultB);
      const shared = findSharedLocations(pathA, pathB);

      // Path similarity: proportion of shared steps vs total unique steps
      const allKeysA = new Set(pathA.map(locationKey));
      const allKeysB = new Set(pathB.map(locationKey));
      const unionSize = new Set([...allKeysA, ...allKeysB]).size;
      const intersectionSize = [...allKeysA].filter(k => allKeysB.has(k)).length;
      const similarity = unionSize > 0 ? intersectionSize / unionSize : 0;

      return {
        overlaps: shared.length > 0,
        overlapMode: mode,
        pathSimilarity: Math.round(similarity * 1000) / 1000,
        sharedLocations: shared,
      };
    }
    default:
      locsA = extractPrimaryLocations(resultA);
      locsB = extractPrimaryLocations(resultB);
  }

  const shared = findSharedLocations(locsA, locsB);
  return {
    overlaps: shared.length > 0,
    overlapMode: mode,
    sharedLocations: shared,
  };
}

/**
 * Find all overlapping alerts between two sets of results (potentially different rules).
 */
export function findOverlappingAlerts(
  resultsA: SarifResult[],
  ruleA: SarifRule,
  resultsB: SarifResult[],
  ruleB: SarifRule,
  mode: OverlapMode = 'sink',
): AlertOverlap[] {
  const overlaps: AlertOverlap[] = [];

  for (let i = 0; i < resultsA.length; i++) {
    for (let j = 0; j < resultsB.length; j++) {
      const overlapDetails = computeLocationOverlap(resultsA[i], resultsB[j], mode);
      if (overlapDetails.overlaps) {
        overlaps.push({
          overlapDetails,
          resultA: resultsA[i],
          resultAIndex: i,
          resultB: resultsB[j],
          resultBIndex: j,
          ruleIdA: ruleA.id,
          ruleIdB: ruleB.id,
        });
      }
    }
  }

  return overlaps;
}
