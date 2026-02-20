/**
 * Reusable parser for CodeQL evaluator log files.
 *
 * Supports two formats:
 * - **Raw** (`evaluator-log.jsonl`): Pretty-printed JSON objects with a `type`
 *   field (`LOG_HEADER`, `QUERY_STARTED`, `PREDICATE_STARTED`, etc.)
 * - **Summary** (`evaluator-log.summary.jsonl`): Pretty-printed JSON objects
 *   without a `type` field; identified by `summaryLogVersion` or
 *   `evaluationStrategy`.
 *
 * Both formats use pretty-printed JSON separated by `}\n{` boundaries.
 */

import { readFileSync } from 'fs';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

/** Performance profile for a single evaluated predicate. */
export interface PredicateProfile {
  predicateName: string;
  position?: string;
  durationMs: number;
  resultSize?: number;
  pipelineCount?: number;
  evaluationStrategy?: string;
  dependencies: string[];
}

/** Performance profile for a single query within a log. */
export interface QueryProfile {
  queryName: string;
  totalDurationMs: number;
  predicateCount: number;
  predicates: PredicateProfile[];
  cacheHits: number;
}

/** Top-level result returned by all parse functions. */
export interface ProfileData {
  codeqlVersion?: string;
  logFormat: 'raw' | 'summary';
  queries: QueryProfile[];
  totalEvents: number;
}

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

/**
 * Auto-detect whether the first parsed JSON object comes from a raw
 * evaluator log or a summary log.
 *
 * Raw events always contain a `type` string field.
 * Summary events never have `type`; the header carries `summaryLogVersion`.
 */
export function detectLogFormat(firstEvent: Record<string, unknown>): 'raw' | 'summary' {
  if (typeof firstEvent.type === 'string') {
    return 'raw';
  }
  return 'summary';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Split a pretty-printed multi-JSON file into individual JSON strings.
 *
 * The log file contains multiple JSON objects that are pretty-printed,
 * separated by the pattern `}\n\n{` (closing brace, blank line, opening
 * brace). We split on `\n}\n` boundaries and reconstruct valid objects.
 */
function splitJsonObjects(content: string): string[] {
  // Trim leading/trailing whitespace
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return [];
  }

  // Split on closing-brace + newline(s) + opening-brace boundaries.
  // We use a regex that matches `}\n` followed by optional blank lines
  // then `{` – capturing the boundary so we can reconstruct.
  const parts = trimmed.split(/\n\}\s*\n\s*\{/);

  if (parts.length === 1) {
    // Single object or single-line – return as-is
    return [trimmed];
  }

  // Reconstruct: first part needs closing `}`, middle parts need both,
  // last part needs opening `{`.
  return parts.map((part, idx) => {
    if (idx === 0) {
      return part + '\n}';
    }
    if (idx === parts.length - 1) {
      return '{\n' + part;
    }
    return '{\n' + part + '\n}';
  });
}

/**
 * Parse all JSON objects from an evaluator log file.
 */
function parseJsonObjects(logPath: string): Record<string, unknown>[] {
  const content = readFileSync(logPath, 'utf-8');
  const objectStrings = splitJsonObjects(content);

  const results: Record<string, unknown>[] = [];
  for (const objStr of objectStrings) {
    try {
      results.push(JSON.parse(objStr) as Record<string, unknown>);
    } catch {
      logger.warn(
        `Failed to parse evaluator log object: ${objStr.substring(0, 120)}...`
      );
    }
  }
  return results;
}

// ---------------------------------------------------------------------------
// Raw evaluator log parsing
// ---------------------------------------------------------------------------

/**
 * Parse a raw `evaluator-log.jsonl` file into {@link ProfileData}.
 *
 * Tracks `QUERY_STARTED`/`QUERY_COMPLETED` pairs, computes predicate
 * durations from `PREDICATE_STARTED`/`PREDICATE_COMPLETED` nanoTime
 * differences, and groups predicates by `queryCausingWork`.
 */
export function parseRawEvaluatorLog(logPath: string): ProfileData {
  const events = parseJsonObjects(logPath);

  let codeqlVersion: string | undefined;

  // Maps: eventId → event data for lookups
  const queryStartEvents = new Map<
    number,
    { queryName: string; nanoTime: number }
  >();
  const predicateStartEvents = new Map<
    number,
    {
      predicateName: string;
      position?: string;
      predicateType?: string;
      dependencies: string[];
      queryCausingWork?: number;
      nanoTime: number;
      pipelineCount: number;
    }
  >();

  // Completed predicate profiles grouped by query eventId
  const queryPredicates = new Map<number, PredicateProfile[]>();
  // Query end nanoTimes keyed by query start eventId
  const queryEndNanoTimes = new Map<number, number>();
  // Track cache lookups per query
  const queryCacheHits = new Map<number, number>();
  // Fallback query eventId for predicates without queryCausingWork
  let firstQueryEventId: number | undefined;

  for (const event of events) {
    const eventType = event.type as string | undefined;

    switch (eventType) {
      case 'LOG_HEADER': {
        codeqlVersion = event.codeqlVersion as string | undefined;
        break;
      }

      case 'QUERY_STARTED': {
        const eid = event.eventId as number;
        const qName = (event.queryName as string) || 'unknown';
        queryStartEvents.set(eid, {
          queryName: qName,
          nanoTime: event.nanoTime as number,
        });
        queryPredicates.set(eid, []);
        queryCacheHits.set(eid, 0);
        if (firstQueryEventId === undefined) {
          firstQueryEventId = eid;
        }
        break;
      }

      case 'QUERY_COMPLETED': {
        const startEid = event.startEvent as number;
        queryEndNanoTimes.set(startEid, event.nanoTime as number);
        break;
      }

      case 'PREDICATE_STARTED': {
        const eid = event.eventId as number;
        const deps = event.dependencies as Record<string, string> | undefined;
        predicateStartEvents.set(eid, {
          predicateName: (event.predicateName as string) || 'unknown',
          position: event.position as string | undefined,
          predicateType: event.predicateType as string | undefined,
          dependencies: deps ? Object.keys(deps) : [],
          queryCausingWork: event.queryCausingWork as number | undefined,
          nanoTime: event.nanoTime as number,
          pipelineCount: 0,
        });
        break;
      }

      case 'PIPELINE_COMPLETED': {
        // Count pipelines for the parent predicate
        const pipelineStartEid = event.startEvent as number;
        // Find the pipeline_started event to get predicateStartEvent
        const pipelineStartEvt = events.find(
          (e) =>
            (e.type as string) === 'PIPELINE_STARTED' &&
            (e.eventId as number) === pipelineStartEid
        );
        if (pipelineStartEvt) {
          const predEid = pipelineStartEvt.predicateStartEvent as number;
          const predStart = predicateStartEvents.get(predEid);
          if (predStart) {
            predStart.pipelineCount += 1;
          }
        }
        break;
      }

      case 'PREDICATE_COMPLETED': {
        const startEid = event.startEvent as number;
        const predStart = predicateStartEvents.get(startEid);
        if (predStart) {
          const durationNs =
            (event.nanoTime as number) - predStart.nanoTime;
          const durationMs = durationNs / 1_000_000;

          const profile: PredicateProfile = {
            predicateName: predStart.predicateName,
            position: predStart.position,
            durationMs,
            resultSize: event.resultSize as number | undefined,
            pipelineCount:
              predStart.pipelineCount > 0
                ? predStart.pipelineCount
                : undefined,
            evaluationStrategy: predStart.predicateType,
            dependencies: predStart.dependencies,
          };

          const qEid =
            predStart.queryCausingWork ?? firstQueryEventId;
          if (qEid !== undefined) {
            let arr = queryPredicates.get(qEid);
            if (!arr) {
              arr = [];
              queryPredicates.set(qEid, arr);
            }
            arr.push(profile);
          }
        }
        break;
      }

      case 'CACHE_LOOKUP': {
        // Attribute to the most recent query
        const qEid =
          (event.queryCausingWork as number | undefined) ??
          firstQueryEventId;
        if (qEid !== undefined) {
          queryCacheHits.set(qEid, (queryCacheHits.get(qEid) ?? 0) + 1);
        }
        break;
      }
    }
  }

  // Build QueryProfile entries
  const queries: QueryProfile[] = [];
  for (const [qEid, startInfo] of queryStartEvents) {
    const predicates = queryPredicates.get(qEid) ?? [];
    const endNano = queryEndNanoTimes.get(qEid);
    const totalDurationMs =
      endNano !== undefined
        ? (endNano - startInfo.nanoTime) / 1_000_000
        : predicates.reduce((sum, p) => sum + p.durationMs, 0);

    queries.push({
      queryName: startInfo.queryName,
      totalDurationMs,
      predicateCount: predicates.length,
      predicates,
      cacheHits: queryCacheHits.get(qEid) ?? 0,
    });
  }

  return {
    codeqlVersion,
    logFormat: 'raw',
    queries,
    totalEvents: events.length,
  };
}

// ---------------------------------------------------------------------------
// Summary log parsing
// ---------------------------------------------------------------------------

/**
 * Parse an `evaluator-log.summary.jsonl` file into {@link ProfileData}.
 *
 * Summary events carry `millis` directly (already in ms). Predicates are
 * grouped by `queryCausingWork` which is a **string** (query name) in the
 * summary format.
 */
export function parseSummaryLog(logPath: string): ProfileData {
  const events = parseJsonObjects(logPath);

  let codeqlVersion: string | undefined;

  // queryCausingWork (string) → collected predicates
  const queryPredicatesMap = new Map<string, PredicateProfile[]>();
  // Track total millis per query
  const queryTotalMs = new Map<string, number>();
  // Track cache hits per query
  const queryCacheHits = new Map<string, number>();

  for (const event of events) {
    // Header detection
    if (event.summaryLogVersion !== undefined) {
      codeqlVersion = event.codeqlVersion as string | undefined;
      continue;
    }

    const strategy = event.evaluationStrategy as string | undefined;

    // Skip sentinel-empty entries (no useful timing data)
    if (strategy === 'SENTINEL_EMPTY') {
      continue;
    }

    // Skip events without millis (non-predicate summaries)
    if (event.millis === undefined) {
      continue;
    }

    const predicateName =
      (event.predicateName as string) || 'unknown';
    const millis = event.millis as number;
    const queryName =
      (event.queryCausingWork as string) || 'unknown';

    const deps = event.dependencies as Record<string, string> | undefined;
    const pipelineRuns = event.pipelineRuns as number | undefined;

    const profile: PredicateProfile = {
      predicateName,
      position: event.position as string | undefined,
      durationMs: millis,
      resultSize: event.resultSize as number | undefined,
      pipelineCount: pipelineRuns,
      evaluationStrategy: strategy,
      dependencies: deps ? Object.keys(deps) : [],
    };

    // Check if this is a cached entry
    if (event.isCached === true || strategy === 'CACHEHIT') {
      queryCacheHits.set(
        queryName,
        (queryCacheHits.get(queryName) ?? 0) + 1
      );
    }

    let arr = queryPredicatesMap.get(queryName);
    if (!arr) {
      arr = [];
      queryPredicatesMap.set(queryName, arr);
    }
    arr.push(profile);

    queryTotalMs.set(
      queryName,
      (queryTotalMs.get(queryName) ?? 0) + millis
    );
  }

  // Build QueryProfile entries
  const queries: QueryProfile[] = [];
  for (const [queryName, predicates] of queryPredicatesMap) {
    queries.push({
      queryName,
      totalDurationMs: queryTotalMs.get(queryName) ?? 0,
      predicateCount: predicates.length,
      predicates,
      cacheHits: queryCacheHits.get(queryName) ?? 0,
    });
  }

  return {
    codeqlVersion,
    logFormat: 'summary',
    queries,
    totalEvents: events.length,
  };
}

// ---------------------------------------------------------------------------
// Auto-detect entry point
// ---------------------------------------------------------------------------

/**
 * Auto-detect the log format and parse accordingly.
 *
 * @param logPath - Absolute path to `evaluator-log.jsonl` or
 *   `evaluator-log.summary.jsonl`.
 * @returns Parsed profile data.
 */
export function parseEvaluatorLog(logPath: string): ProfileData {
  const events = parseJsonObjects(logPath);

  if (events.length === 0) {
    return {
      logFormat: 'raw',
      queries: [],
      totalEvents: 0,
    };
  }

  const format = detectLogFormat(events[0]);

  if (format === 'raw') {
    return parseRawEvaluatorLog(logPath);
  }
  return parseSummaryLog(logPath);
}
