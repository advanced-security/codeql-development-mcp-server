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
 *
 * Files are streamed line-by-line so that very large evaluator logs
 * (hundreds of MB) are handled without loading the entire file into memory.
 */

import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

/** Per-pipeline execution data showing tuple count progression. */
export interface PipelineStage {
  durationMs: number;
  resultSize: number;
  /** Tuple counts at each RA step within the pipeline. */
  counts: number[];
  duplicationPercentages?: number[];
}

/** Performance profile for a single evaluated predicate. */
export interface PredicateProfile {
  predicateName: string;
  position?: string;
  durationMs: number;
  resultSize?: number;
  pipelineCount?: number;
  evaluationStrategy?: string;
  dependencies: string[];
  /** RA operation text for each pipeline step (from the `ra` field). */
  raSteps?: string[];
  /** Per-pipeline execution data with tuple count progressions. */
  pipelineStages?: PipelineStage[];
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
// Streaming JSON object parser
// ---------------------------------------------------------------------------

/**
 * Stream a pretty-printed multi-JSON file and yield parsed objects one at
 * a time. Uses readline to process the file line-by-line, tracking brace
 * depth to detect object boundaries. This avoids loading the entire file
 * into memory.
 */
async function* streamJsonObjects(
  logPath: string
): AsyncGenerator<Record<string, unknown>> {
  const rl = createInterface({
    input: createReadStream(logPath, { encoding: 'utf-8' }),
    crlfDelay: Infinity,
  });

  let depth = 0;
  let inString = false;
  let escape = false;
  const lines: string[] = [];

  for await (const line of rl) {
    // Track whether this line pushes us into or out of objects. We need to
    // handle strings (which may contain `{` or `}`) and escape sequences.
    for (const ch of line) {
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === '\\' && inString) {
        escape = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === '{') depth++;
      if (ch === '}') depth--;
    }

    if (depth > 0 || (depth === 0 && line.trim().length > 0 && lines.length > 0)) {
      lines.push(line);
    } else if (depth === 0 && lines.length === 0 && line.trim().length > 0) {
      // Single-line object or start of multi-line
      lines.push(line);
    }

    // When depth returns to 0 and we have accumulated lines, emit an object
    if (depth === 0 && lines.length > 0) {
      const objStr = lines.join('\n');
      lines.length = 0;
      inString = false;
      escape = false;

      if (objStr.trim().length === 0) continue;

      try {
        yield JSON.parse(objStr) as Record<string, unknown>;
      } catch {
        logger.warn(
          `Failed to parse evaluator log object: ${objStr.substring(0, 120)}...`,
        );
      }
    }
  }

  // Handle any trailing accumulated lines (unterminated object)
  if (lines.length > 0) {
    const objStr = lines.join('\n');
    if (objStr.trim().length > 0) {
      try {
        yield JSON.parse(objStr) as Record<string, unknown>;
      } catch {
        logger.warn(
          `Failed to parse trailing evaluator log object: ${objStr.substring(0, 120)}...`,
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Raw evaluator log parsing
// ---------------------------------------------------------------------------

/**
 * Parse a raw `evaluator-log.jsonl` file into {@link ProfileData}.
 *
 * Streams the file line-by-line and processes events incrementally.
 * Tracks `QUERY_STARTED`/`QUERY_COMPLETED` pairs, computes predicate
 * durations from `PREDICATE_STARTED`/`PREDICATE_COMPLETED` nanoTime
 * differences, and groups predicates by `queryCausingWork`.
 */
export async function parseRawEvaluatorLog(logPath: string): Promise<ProfileData> {
  return processRawEvents(streamJsonObjects(logPath));
}

/**
 * Internal: process an async stream of raw evaluator log events.
 * Separated from I/O so that `parseEvaluatorLog` can share the stream.
 */
async function processRawEvents(
  events: AsyncIterable<Record<string, unknown>>,
): Promise<ProfileData> {

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
      raSteps?: string[];
      pipelineStages: PipelineStage[];
    }
  >();

  // Maps: pipeline eventId → pipeline start nanoTime
  const pipelineStartNanoTimes = new Map<number, number>();
  // Maps: pipeline eventId → parent predicate eventId
  const pipelineToPredicateMap = new Map<number, number>();

  // Completed predicate profiles grouped by query eventId
  const queryPredicates = new Map<number, PredicateProfile[]>();
  // Query end nanoTimes keyed by query start eventId
  const queryEndNanoTimes = new Map<number, number>();
  // Track cache lookups per query
  const queryCacheHits = new Map<number, number>();
  // Fallback query eventId for predicates without queryCausingWork
  let firstQueryEventId: number | undefined;
  let totalEvents = 0;

  for await (const event of events) {
    totalEvents++;
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
        // Extract RA pipeline steps if present
        const raObj = event.ra as Record<string, unknown> | undefined;
        let raSteps: string[] | undefined;
        if (raObj && Array.isArray(raObj.pipeline)) {
          raSteps = (raObj.pipeline as string[]).map((s) => s.trim());
        }
        predicateStartEvents.set(eid, {
          predicateName: (event.predicateName as string) || 'unknown',
          position: event.position as string | undefined,
          predicateType: event.predicateType as string | undefined,
          dependencies: deps ? Object.keys(deps) : [],
          queryCausingWork: event.queryCausingWork as number | undefined,
          nanoTime: event.nanoTime as number,
          pipelineCount: 0,
          raSteps,
          pipelineStages: [],
        });
        break;
      }

      case 'PIPELINE_STARTED': {
        const eid = event.eventId as number;
        pipelineStartNanoTimes.set(eid, event.nanoTime as number);
        const predEid = event.predicateStartEvent as number;
        pipelineToPredicateMap.set(eid, predEid);
        break;
      }

      case 'PIPELINE_COMPLETED': {
        const pipelineStartEid = event.startEvent as number;
        const predEid = pipelineToPredicateMap.get(pipelineStartEid);
        const startNano = pipelineStartNanoTimes.get(pipelineStartEid);
        if (predEid !== undefined) {
          const predStart = predicateStartEvents.get(predEid);
          if (predStart) {
            predStart.pipelineCount += 1;
            const pipelineDurationMs = startNano !== undefined
              ? ((event.nanoTime as number) - startNano) / 1_000_000
              : 0;
            predStart.pipelineStages.push({
              durationMs: pipelineDurationMs,
              resultSize: (event.resultSize as number) ?? 0,
              counts: (event.counts as number[]) ?? [],
              duplicationPercentages: event.duplicationPercentages as number[] | undefined,
            });
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
            raSteps: predStart.raSteps,
            pipelineStages:
              predStart.pipelineStages.length > 0
                ? predStart.pipelineStages
                : undefined,
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
    totalEvents,
  };
}

// ---------------------------------------------------------------------------
// Summary log parsing
// ---------------------------------------------------------------------------

/**
 * Parse an `evaluator-log.summary.jsonl` file into {@link ProfileData}.
 *
 * Streams the file line-by-line and processes events incrementally.
 * Summary events carry `millis` directly (already in ms). Predicates are
 * grouped by `queryCausingWork` which is a **string** (query name) in the
 * summary format.
 */
export async function parseSummaryLog(logPath: string): Promise<ProfileData> {
  return processSummaryEvents(streamJsonObjects(logPath));
}

/**
 * Internal: process an async stream of summary log events.
 * Separated from I/O so that `parseEvaluatorLog` can share the stream.
 */
async function processSummaryEvents(
  events: AsyncIterable<Record<string, unknown>>,
): Promise<ProfileData> {
  let codeqlVersion: string | undefined;

  // queryCausingWork (string) → collected predicates
  const queryPredicatesMap = new Map<string, PredicateProfile[]>();
  // Track total millis per query
  const queryTotalMs = new Map<string, number>();
  // Track cache hits per query
  const queryCacheHits = new Map<string, number>();
  let totalEvents = 0;

  for await (const event of events) {
    totalEvents++;

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

    // Extract RA steps from summary events
    const raObj = event.ra as string | undefined;
    let raSteps: string[] | undefined;
    if (typeof raObj === 'string' && raObj.length > 0) {
      raSteps = raObj.replace(/\r\n/g, '\n').split('\n').map((s) => s.trim()).filter((s) => s.length > 0);
    }

    const profile: PredicateProfile = {
      predicateName,
      position: event.position as string | undefined,
      durationMs: millis,
      resultSize: event.resultSize as number | undefined,
      pipelineCount: pipelineRuns,
      evaluationStrategy: strategy,
      dependencies: deps ? Object.keys(deps) : [],
      raSteps,
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
    totalEvents,
  };
}

// ---------------------------------------------------------------------------
// Auto-detect entry point
// ---------------------------------------------------------------------------

/**
 * Auto-detect the log format and parse accordingly.
 *
 * Streams the file once — the first event determines the format, then
 * the remaining events are processed by the appropriate parser.
 *
 * @param logPath - Absolute path to `evaluator-log.jsonl` or
 *   `evaluator-log.summary.jsonl`.
 * @returns Parsed profile data.
 */
export async function parseEvaluatorLog(logPath: string): Promise<ProfileData> {
  const stream = streamJsonObjects(logPath);
  const iterator = stream[Symbol.asyncIterator]();

  // Read the first event to detect format
  const first = await iterator.next();
  if (first.done) {
    return {
      logFormat: 'raw',
      queries: [],
      totalEvents: 0,
    };
  }

  const firstEvent = first.value;
  const format = detectLogFormat(firstEvent);

  // Create an async iterable that yields the first event, then the rest
  async function* prependFirst(): AsyncGenerator<Record<string, unknown>> {
    yield firstEvent;
    for (;;) {
      const next = await iterator.next();
      if (next.done) break;
      yield next.value;
    }
  }

  if (format === 'raw') {
    return processRawEvents(prependFirst());
  }
  return processSummaryEvents(prependFirst());
}
