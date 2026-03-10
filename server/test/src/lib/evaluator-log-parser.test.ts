/**
 * Tests for the evaluator log parser library.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import {
  createTestTempDir,
  cleanupTestTempDir,
} from '../../utils/temp-dir';
import {
  detectLogFormat,
  parseEvaluatorLog,
  parseRawEvaluatorLog,
  parseSummaryLog,
} from '../../../src/lib/evaluator-log-parser';

// ---------------------------------------------------------------------------
// Synthetic log data helpers
// ---------------------------------------------------------------------------

function singleQueryRawLog(): string {
  const events = [
    {
      time: '2026-02-17T00:00:00Z',
      type: 'LOG_HEADER',
      eventId: 1,
      nanoTime: 100000000,
      codeqlVersion: '2.24.1',
      logVersion: '0.5.0',
    },
    {
      time: '2026-02-17T00:00:01Z',
      type: 'QUERY_STARTED',
      eventId: 2,
      nanoTime: 200000000,
      queryName: 'TestQuery.ql',
    },
    {
      time: '2026-02-17T00:00:02Z',
      type: 'PREDICATE_STARTED',
      eventId: 3,
      nanoTime: 300000000,
      raHash: 'abc123',
      predicateName: 'TestPredicate#1',
      predicateType: 'COMPUTED',
      position: 'TestQuery.ql:5:1:10:1',
      ra: {
        pipeline: [
          '    {100} r1 = SCAN `sometable` OUTPUT In.0, In.1',
          '    return r1'
        ]
      },
      dependencies: {},
      queryCausingWork: 2,
    },
    {
      time: '2026-02-17T00:00:02Z',
      type: 'PIPELINE_STARTED',
      eventId: 4,
      nanoTime: 300100000,
      predicateStartEvent: 3,
      raReference: 'pipeline',
    },
    {
      time: '2026-02-17T00:00:02Z',
      type: 'PIPELINE_COMPLETED',
      eventId: 5,
      nanoTime: 350000000,
      startEvent: 4,
      counts: [100],
      duplicationPercentages: [0],
      resultSize: 100,
    },
    {
      time: '2026-02-17T00:00:02Z',
      type: 'PREDICATE_COMPLETED',
      eventId: 6,
      nanoTime: 350100000,
      startEvent: 3,
      resultSize: 100,
    },
    {
      time: '2026-02-17T00:00:03Z',
      type: 'PREDICATE_STARTED',
      eventId: 7,
      nanoTime: 360000000,
      raHash: 'def456',
      predicateName: 'TestPredicate#2',
      predicateType: 'COMPUTED',
      position: 'TestQuery.ql:12:1:18:1',
      dependencies: { 'TestPredicate#1': 'abc123' },
      queryCausingWork: 2,
    },
    {
      time: '2026-02-17T00:00:03Z',
      type: 'PREDICATE_COMPLETED',
      eventId: 8,
      nanoTime: 380000000,
      startEvent: 7,
      resultSize: 50,
    },
    {
      time: '2026-02-17T00:00:03Z',
      type: 'QUERY_COMPLETED',
      eventId: 9,
      nanoTime: 400000000,
      startEvent: 2,
      terminationType: 'NORMAL',
    },
    {
      time: '2026-02-17T00:00:04Z',
      type: 'LOG_FOOTER',
      eventId: 10,
      nanoTime: 500000000,
    },
  ];
  return events.map((e) => JSON.stringify(e, null, 2)).join('\n\n');
}

function multiQueryRawLog(): string {
  const events = [
    {
      time: '2026-02-17T00:00:00Z',
      type: 'LOG_HEADER',
      eventId: 1,
      nanoTime: 100000000,
      codeqlVersion: '2.24.1',
      logVersion: '0.5.0',
    },
    // Query A
    {
      time: '2026-02-17T00:00:01Z',
      type: 'QUERY_STARTED',
      eventId: 10,
      nanoTime: 200000000,
      queryName: 'QueryA.ql',
    },
    {
      time: '2026-02-17T00:00:02Z',
      type: 'PREDICATE_STARTED',
      eventId: 11,
      nanoTime: 300000000,
      raHash: 'aaa111',
      predicateName: 'PredicateA#1',
      predicateType: 'COMPUTED',
      ra: {
        pipeline: [
          '    {200} r1 = SCAN `tableA` OUTPUT In.0, In.1',
          '    return r1'
        ]
      },
      dependencies: {},
      queryCausingWork: 10,
    },
    {
      time: '2026-02-17T00:00:02Z',
      type: 'PIPELINE_STARTED',
      eventId: 111,
      nanoTime: 301000000,
      predicateStartEvent: 11,
      raReference: 'pipeline',
    },
    {
      time: '2026-02-17T00:00:02Z',
      type: 'PIPELINE_COMPLETED',
      eventId: 112,
      nanoTime: 309000000,
      startEvent: 111,
      counts: [200],
      duplicationPercentages: [0],
      resultSize: 200,
    },
    {
      time: '2026-02-17T00:00:02Z',
      type: 'PREDICATE_COMPLETED',
      eventId: 12,
      nanoTime: 310000000,
      startEvent: 11,
      resultSize: 200,
    },
    {
      time: '2026-02-17T00:00:03Z',
      type: 'QUERY_COMPLETED',
      eventId: 13,
      nanoTime: 350000000,
      startEvent: 10,
      terminationType: 'NORMAL',
    },
    // Query B
    {
      time: '2026-02-17T00:00:04Z',
      type: 'QUERY_STARTED',
      eventId: 20,
      nanoTime: 400000000,
      queryName: 'QueryB.ql',
    },
    {
      time: '2026-02-17T00:00:05Z',
      type: 'PREDICATE_STARTED',
      eventId: 21,
      nanoTime: 500000000,
      raHash: 'bbb222',
      predicateName: 'PredicateB#1',
      predicateType: 'COMPUTED',
      dependencies: {},
      queryCausingWork: 20,
    },
    {
      time: '2026-02-17T00:00:05Z',
      type: 'PREDICATE_COMPLETED',
      eventId: 22,
      nanoTime: 550000000,
      startEvent: 21,
      resultSize: 300,
    },
    {
      time: '2026-02-17T00:00:05Z',
      type: 'PREDICATE_STARTED',
      eventId: 23,
      nanoTime: 560000000,
      raHash: 'bbb333',
      predicateName: 'PredicateB#2',
      predicateType: 'COMPUTED',
      dependencies: { 'PredicateB#1': 'bbb222' },
      queryCausingWork: 20,
    },
    {
      time: '2026-02-17T00:00:06Z',
      type: 'PREDICATE_COMPLETED',
      eventId: 24,
      nanoTime: 600000000,
      startEvent: 23,
      resultSize: 75,
    },
    {
      time: '2026-02-17T00:00:07Z',
      type: 'QUERY_COMPLETED',
      eventId: 25,
      nanoTime: 650000000,
      startEvent: 20,
      terminationType: 'NORMAL',
    },
    {
      time: '2026-02-17T00:00:08Z',
      type: 'LOG_FOOTER',
      eventId: 30,
      nanoTime: 700000000,
    },
  ];
  return events.map((e) => JSON.stringify(e, null, 2)).join('\n\n');
}

function summaryLog(): string {
  const events = [
    {
      summaryLogVersion: '0.4.0',
      codeqlVersion: '2.24.1',
      startTime: '2026-02-17T00:00:00Z',
    },
    {
      completionTime: '2026-02-17T00:00:01Z',
      raHash: 'sent1',
      predicateName: 'SentinelPred',
      appearsAs: { SentinelPred: { 'TestQuery.ql': [1] } },
      evaluationStrategy: 'SENTINEL_EMPTY',
      sentinelRaHash: 'sss',
    },
    {
      completionTime: '2026-02-17T00:00:02Z',
      raHash: 'abc123',
      predicateName: 'TestPredicate#1',
      appearsAs: { 'TestPredicate#1': { 'TestQuery.ql': [5] } },
      evaluationStrategy: 'COMPUTED',
      dependencies: { dep1: 'dep1hash' },
      millis: 50,
      pipelineRuns: 1,
      position: 'TestQuery.ql:5:1:10:1',
      queryCausingWork: 'TestQuery.ql',
      ra: 'some RA text',
      resultSize: 100,
    },
    {
      completionTime: '2026-02-17T00:00:03Z',
      raHash: 'def456',
      predicateName: 'TestPredicate#2',
      appearsAs: { 'TestPredicate#2': { 'TestQuery.ql': [12] } },
      evaluationStrategy: 'COMPUTED',
      dependencies: { 'TestPredicate#1': 'abc123' },
      millis: 120,
      pipelineRuns: 2,
      position: 'TestQuery.ql:12:1:18:1',
      queryCausingWork: 'TestQuery.ql',
      ra: 'more RA text',
      resultSize: 50,
    },
  ];
  return events.map((e) => JSON.stringify(e, null, 2)).join('\n\n');
}

function multiQuerySummaryLog(): string {
  const events = [
    {
      summaryLogVersion: '0.4.0',
      codeqlVersion: '2.24.1',
      startTime: '2026-02-17T00:00:00Z',
    },
    {
      completionTime: '2026-02-17T00:00:02Z',
      raHash: 'aaa111',
      predicateName: 'PredicateA#1',
      evaluationStrategy: 'COMPUTED',
      dependencies: {},
      millis: 30,
      pipelineRuns: 1,
      queryCausingWork: 'QueryA.ql',
      resultSize: 200,
    },
    {
      completionTime: '2026-02-17T00:00:03Z',
      raHash: 'bbb222',
      predicateName: 'PredicateB#1',
      evaluationStrategy: 'COMPUTED',
      dependencies: {},
      millis: 75,
      pipelineRuns: 1,
      queryCausingWork: 'QueryB.ql',
      resultSize: 300,
    },
    {
      completionTime: '2026-02-17T00:00:04Z',
      raHash: 'bbb333',
      predicateName: 'PredicateB#2',
      evaluationStrategy: 'COMPUTED',
      dependencies: { 'PredicateB#1': 'bbb222' },
      millis: 45,
      pipelineRuns: 1,
      queryCausingWork: 'QueryB.ql',
      resultSize: 75,
    },
  ];
  return events.map((e) => JSON.stringify(e, null, 2)).join('\n\n');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Evaluator Log Parser', () => {
  let tempDir: string;

  afterEach(() => {
    if (tempDir) {
      cleanupTestTempDir(tempDir);
    }
  });

  function writeTempLog(filename: string, content: string): string {
    tempDir = createTestTempDir('eval-log-parser-');
    mkdirSync(tempDir, { recursive: true });
    const logPath = join(tempDir, filename);
    writeFileSync(logPath, content);
    return logPath;
  }

  // -----------------------------------------------------------------------
  // detectLogFormat
  // -----------------------------------------------------------------------

  describe('detectLogFormat', () => {
    it('should detect raw format when event has a type field', async () => {
      const event = { type: 'LOG_HEADER', eventId: 1, nanoTime: 100 };
      expect(detectLogFormat(event)).toBe('raw');
    });

    it('should detect summary format when event has no type field', async () => {
      const event = {
        summaryLogVersion: '0.4.0',
        codeqlVersion: '2.24.1',
      };
      expect(detectLogFormat(event)).toBe('summary');
    });

    it('should detect summary format for predicate summary events', async () => {
      const event = {
        completionTime: '2026-02-17T00:00:02Z',
        raHash: 'abc',
        predicateName: 'Foo',
        evaluationStrategy: 'COMPUTED',
        millis: 50,
      };
      expect(detectLogFormat(event)).toBe('summary');
    });
  });

  // -----------------------------------------------------------------------
  // parseRawEvaluatorLog — single query
  // -----------------------------------------------------------------------

  describe('parseRawEvaluatorLog — single query', () => {
    it('should parse codeqlVersion from LOG_HEADER', async () => {
      const logPath = writeTempLog('evaluator-log.jsonl', singleQueryRawLog());
      const result = await parseRawEvaluatorLog(logPath);

      expect(result.codeqlVersion).toBe('2.24.1');
    });

    it('should set logFormat to raw', async () => {
      const logPath = writeTempLog('evaluator-log.jsonl', singleQueryRawLog());
      const result = await parseRawEvaluatorLog(logPath);

      expect(result.logFormat).toBe('raw');
    });

    it('should produce exactly one QueryProfile', async () => {
      const logPath = writeTempLog('evaluator-log.jsonl', singleQueryRawLog());
      const result = await parseRawEvaluatorLog(logPath);

      expect(result.queries).toHaveLength(1);
      expect(result.queries[0].queryName).toBe('TestQuery.ql');
    });

    it('should compute query total duration from QUERY_STARTED/COMPLETED nanoTimes', async () => {
      const logPath = writeTempLog('evaluator-log.jsonl', singleQueryRawLog());
      const result = await parseRawEvaluatorLog(logPath);

      // nanoTime: 200000000 → 400000000 = 200ms
      expect(result.queries[0].totalDurationMs).toBe(200);
    });

    it('should collect all predicates for the query', async () => {
      const logPath = writeTempLog('evaluator-log.jsonl', singleQueryRawLog());
      const result = await parseRawEvaluatorLog(logPath);

      expect(result.queries[0].predicateCount).toBe(2);
      expect(result.queries[0].predicates).toHaveLength(2);
    });

    it('should compute predicate duration from nanoTime diffs', async () => {
      const logPath = writeTempLog('evaluator-log.jsonl', singleQueryRawLog());
      const result = await parseRawEvaluatorLog(logPath);

      const pred1 = result.queries[0].predicates.find(
        (p) => p.predicateName === 'TestPredicate#1'
      );
      // nanoTime: 300000000 → 350100000 = 50.1ms
      expect(pred1).toBeDefined();
      expect(pred1!.durationMs).toBeCloseTo(50.1, 1);
    });

    it('should capture resultSize for completed predicates', async () => {
      const logPath = writeTempLog('evaluator-log.jsonl', singleQueryRawLog());
      const result = await parseRawEvaluatorLog(logPath);

      const pred1 = result.queries[0].predicates.find(
        (p) => p.predicateName === 'TestPredicate#1'
      );
      expect(pred1!.resultSize).toBe(100);
    });

    it('should capture pipeline count for predicates', async () => {
      const logPath = writeTempLog('evaluator-log.jsonl', singleQueryRawLog());
      const result = await parseRawEvaluatorLog(logPath);

      const pred1 = result.queries[0].predicates.find(
        (p) => p.predicateName === 'TestPredicate#1'
      );
      expect(pred1!.pipelineCount).toBe(1);
    });

    it('should capture RA steps from PREDICATE_STARTED ra field', async () => {
      const logPath = writeTempLog('evaluator-log.jsonl', singleQueryRawLog());
      const result = await parseRawEvaluatorLog(logPath);

      const pred1 = result.queries[0].predicates.find(
        (p) => p.predicateName === 'TestPredicate#1'
      );
      expect(pred1!.raSteps).toBeDefined();
      expect(pred1!.raSteps).toHaveLength(2);
      expect(pred1!.raSteps![0]).toContain('SCAN');
    });

    it('should capture pipeline stages with counts and timing', async () => {
      const logPath = writeTempLog('evaluator-log.jsonl', singleQueryRawLog());
      const result = await parseRawEvaluatorLog(logPath);

      const pred1 = result.queries[0].predicates.find(
        (p) => p.predicateName === 'TestPredicate#1'
      );
      expect(pred1!.pipelineStages).toBeDefined();
      expect(pred1!.pipelineStages).toHaveLength(1);
      expect(pred1!.pipelineStages![0].counts).toEqual([100]);
      expect(pred1!.pipelineStages![0].resultSize).toBe(100);
      expect(pred1!.pipelineStages![0].durationMs).toBeGreaterThan(0);
    });

    it('should not have raSteps when predicate has no ra field', async () => {
      const logPath = writeTempLog('evaluator-log.jsonl', singleQueryRawLog());
      const result = await parseRawEvaluatorLog(logPath);

      const pred2 = result.queries[0].predicates.find(
        (p) => p.predicateName === 'TestPredicate#2'
      );
      expect(pred2!.raSteps).toBeUndefined();
      expect(pred2!.pipelineStages).toBeUndefined();
    });

    it('should capture dependencies for predicates', async () => {
      const logPath = writeTempLog('evaluator-log.jsonl', singleQueryRawLog());
      const result = await parseRawEvaluatorLog(logPath);

      const pred2 = result.queries[0].predicates.find(
        (p) => p.predicateName === 'TestPredicate#2'
      );
      expect(pred2!.dependencies).toContain('TestPredicate#1');
    });

    it('should report totalEvents', async () => {
      const logPath = writeTempLog('evaluator-log.jsonl', singleQueryRawLog());
      const result = await parseRawEvaluatorLog(logPath);

      expect(result.totalEvents).toBe(10);
    });
  });

  // -----------------------------------------------------------------------
  // parseRawEvaluatorLog — multi query
  // -----------------------------------------------------------------------

  describe('parseRawEvaluatorLog — multi query', () => {
    it('should produce two QueryProfiles', async () => {
      const logPath = writeTempLog('evaluator-log.jsonl', multiQueryRawLog());
      const result = await parseRawEvaluatorLog(logPath);

      expect(result.queries).toHaveLength(2);
    });

    it('should name queries correctly', async () => {
      const logPath = writeTempLog('evaluator-log.jsonl', multiQueryRawLog());
      const result = await parseRawEvaluatorLog(logPath);

      expect(result.queries[0].queryName).toBe('QueryA.ql');
      expect(result.queries[1].queryName).toBe('QueryB.ql');
    });

    it('should group predicates by queryCausingWork', async () => {
      const logPath = writeTempLog('evaluator-log.jsonl', multiQueryRawLog());
      const result = await parseRawEvaluatorLog(logPath);

      expect(result.queries[0].predicateCount).toBe(1);
      expect(result.queries[0].predicates[0].predicateName).toBe(
        'PredicateA#1'
      );

      expect(result.queries[1].predicateCount).toBe(2);
      const names = result.queries[1].predicates.map(
        (p) => p.predicateName
      );
      expect(names).toContain('PredicateB#1');
      expect(names).toContain('PredicateB#2');
    });

    it('should compute per-query total durations', async () => {
      const logPath = writeTempLog('evaluator-log.jsonl', multiQueryRawLog());
      const result = await parseRawEvaluatorLog(logPath);

      // QueryA: 200000000 → 350000000 = 150ms
      expect(result.queries[0].totalDurationMs).toBe(150);
      // QueryB: 400000000 → 650000000 = 250ms
      expect(result.queries[1].totalDurationMs).toBe(250);
    });

    it('should capture RA steps and pipeline stages for multi-query logs', async () => {
      const logPath = writeTempLog('evaluator-log.jsonl', multiQueryRawLog());
      const result = await parseRawEvaluatorLog(logPath);

      // QueryA predicate should have RA steps and pipeline stage
      const predA = result.queries[0].predicates[0];
      expect(predA.raSteps).toBeDefined();
      expect(predA.raSteps).toHaveLength(2);
      expect(predA.raSteps![0]).toContain('SCAN');
      expect(predA.pipelineStages).toBeDefined();
      expect(predA.pipelineStages).toHaveLength(1);
      expect(predA.pipelineStages![0].counts).toEqual([200]);
      expect(predA.pipelineStages![0].resultSize).toBe(200);
    });

    it('should track cache hits per query', async () => {
      const logPath = writeTempLog('evaluator-log.jsonl', multiQueryRawLog());
      const result = await parseRawEvaluatorLog(logPath);

      // No CACHE_LOOKUP events in synthetic multiQueryRawLog
      expect(result.queries[0].cacheHits).toBe(0);
      expect(result.queries[1].cacheHits).toBe(0);
    });
  });

  // -----------------------------------------------------------------------
  // parseRawEvaluatorLog — real integration test fixture (multi-query)
  // -----------------------------------------------------------------------

  describe('parseRawEvaluatorLog — real multi-query fixture', () => {
    it('should parse the real multi-query integration test fixture', async () => {
      const logPath = join(
        __dirname,
        '../../../../client/integration-tests/primitives/tools/profile_codeql_query_from_logs/multi_query_raw_log/before/evaluator-log.jsonl'
      );
      const result = await parseEvaluatorLog(logPath);

      expect(result.logFormat).toBe('raw');
      expect(result.codeqlVersion).toBe('2.23.1');
      expect(result.queries).toHaveLength(2);
    });

    it('should separate QueryA and QueryB from multi-query fixture', async () => {
      const logPath = join(
        __dirname,
        '../../../../client/integration-tests/primitives/tools/profile_codeql_query_from_logs/multi_query_raw_log/before/evaluator-log.jsonl'
      );
      const result = await parseEvaluatorLog(logPath);

      expect(result.queries[0].queryName).toBe('/workspace/QueryA.ql');
      expect(result.queries[1].queryName).toBe('/workspace/QueryB.ql');
    });

    it('should group predicates correctly per query', async () => {
      const logPath = join(
        __dirname,
        '../../../../client/integration-tests/primitives/tools/profile_codeql_query_from_logs/multi_query_raw_log/before/evaluator-log.jsonl'
      );
      const result = await parseEvaluatorLog(logPath);

      // QueryA: 2 predicates (source, sink)
      expect(result.queries[0].predicateCount).toBe(2);
      const queryANames = result.queries[0].predicates.map(p => p.predicateName);
      expect(queryANames).toContain('QueryA::source/0#abc123');
      expect(queryANames).toContain('QueryA::sink/0#def456');

      // QueryB: 3 predicates (entryPoint, flowStep, result)
      expect(result.queries[1].predicateCount).toBe(3);
      const queryBNames = result.queries[1].predicates.map(p => p.predicateName);
      expect(queryBNames).toContain('QueryB::entryPoint/0#jkl012');
      expect(queryBNames).toContain('QueryB::flowStep/2#mno345');
      expect(queryBNames).toContain('QueryB::result/3#pqr678');
    });

    it('should capture pipeline stages from multi-query fixture', async () => {
      const logPath = join(
        __dirname,
        '../../../../client/integration-tests/primitives/tools/profile_codeql_query_from_logs/multi_query_raw_log/before/evaluator-log.jsonl'
      );
      const result = await parseEvaluatorLog(logPath);

      // QueryA source predicate should have pipeline stage with counts=[5]
      const sourcePred = result.queries[0].predicates.find(
        p => p.predicateName === 'QueryA::source/0#abc123'
      );
      expect(sourcePred!.pipelineStages).toBeDefined();
      expect(sourcePred!.pipelineStages).toHaveLength(1);
      expect(sourcePred!.pipelineStages![0].counts).toEqual([5]);
      expect(sourcePred!.pipelineStages![0].resultSize).toBe(5);

      // QueryB flowStep predicate should have pipeline stage with counts=[12]
      const flowPred = result.queries[1].predicates.find(
        p => p.predicateName === 'QueryB::flowStep/2#mno345'
      );
      expect(flowPred!.pipelineStages).toBeDefined();
      expect(flowPred!.pipelineStages![0].counts).toEqual([12]);
    });

    it('should track cache hits for QueryA', async () => {
      const logPath = join(
        __dirname,
        '../../../../client/integration-tests/primitives/tools/profile_codeql_query_from_logs/multi_query_raw_log/before/evaluator-log.jsonl'
      );
      const result = await parseEvaluatorLog(logPath);

      // QueryA has 1 CACHE_LOOKUP event
      expect(result.queries[0].cacheHits).toBe(1);
      // QueryB has 0
      expect(result.queries[1].cacheHits).toBe(0);
    });

    it('should compute per-query total durations from real fixture', async () => {
      const logPath = join(
        __dirname,
        '../../../../client/integration-tests/primitives/tools/profile_codeql_query_from_logs/multi_query_raw_log/before/evaluator-log.jsonl'
      );
      const result = await parseEvaluatorLog(logPath);

      // QueryA: 1000000000 → 1200000000 = 200ms
      expect(result.queries[0].totalDurationMs).toBe(200);
      // QueryB: 2000000000 → 2300000000 = 300ms
      expect(result.queries[1].totalDurationMs).toBe(300);
    });
  });

  // -----------------------------------------------------------------------
  // parseSummaryLog
  // -----------------------------------------------------------------------

  describe('parseSummaryLog', () => {
    it('should parse codeqlVersion from header', async () => {
      const logPath = writeTempLog(
        'evaluator-log.summary.jsonl',
        summaryLog()
      );
      const result = await parseSummaryLog(logPath);

      expect(result.codeqlVersion).toBe('2.24.1');
    });

    it('should set logFormat to summary', async () => {
      const logPath = writeTempLog(
        'evaluator-log.summary.jsonl',
        summaryLog()
      );
      const result = await parseSummaryLog(logPath);

      expect(result.logFormat).toBe('summary');
    });

    it('should skip SENTINEL_EMPTY entries', async () => {
      const logPath = writeTempLog(
        'evaluator-log.summary.jsonl',
        summaryLog()
      );
      const result = await parseSummaryLog(logPath);

      const allNames = result.queries.flatMap((q) =>
        q.predicates.map((p) => p.predicateName)
      );
      expect(allNames).not.toContain('SentinelPred');
    });

    it('should produce one QueryProfile for single-query summary', async () => {
      const logPath = writeTempLog(
        'evaluator-log.summary.jsonl',
        summaryLog()
      );
      const result = await parseSummaryLog(logPath);

      expect(result.queries).toHaveLength(1);
      expect(result.queries[0].queryName).toBe('TestQuery.ql');
    });

    it('should use millis field directly for duration', async () => {
      const logPath = writeTempLog(
        'evaluator-log.summary.jsonl',
        summaryLog()
      );
      const result = await parseSummaryLog(logPath);

      const pred1 = result.queries[0].predicates.find(
        (p) => p.predicateName === 'TestPredicate#1'
      );
      expect(pred1!.durationMs).toBe(50);
    });

    it('should capture pipelineRuns', async () => {
      const logPath = writeTempLog(
        'evaluator-log.summary.jsonl',
        summaryLog()
      );
      const result = await parseSummaryLog(logPath);

      const pred2 = result.queries[0].predicates.find(
        (p) => p.predicateName === 'TestPredicate#2'
      );
      expect(pred2!.pipelineCount).toBe(2);
    });

    it('should capture RA steps from summary ra field', async () => {
      const logPath = writeTempLog(
        'evaluator-log.summary.jsonl',
        summaryLog()
      );
      const result = await parseSummaryLog(logPath);

      const pred1 = result.queries[0].predicates.find(
        (p) => p.predicateName === 'TestPredicate#1'
      );
      expect(pred1!.raSteps).toBeDefined();
      expect(pred1!.raSteps).toEqual(['some RA text']);
    });

    it('should sum millis for total query duration', async () => {
      const logPath = writeTempLog(
        'evaluator-log.summary.jsonl',
        summaryLog()
      );
      const result = await parseSummaryLog(logPath);

      // 50 + 120 = 170ms
      expect(result.queries[0].totalDurationMs).toBe(170);
    });

    it('should group predicates by queryCausingWork in multi-query summary', async () => {
      const logPath = writeTempLog(
        'evaluator-log.summary.jsonl',
        multiQuerySummaryLog()
      );
      const result = await parseSummaryLog(logPath);

      expect(result.queries).toHaveLength(2);

      const queryA = result.queries.find(
        (q) => q.queryName === 'QueryA.ql'
      );
      const queryB = result.queries.find(
        (q) => q.queryName === 'QueryB.ql'
      );

      expect(queryA).toBeDefined();
      expect(queryA!.predicateCount).toBe(1);

      expect(queryB).toBeDefined();
      expect(queryB!.predicateCount).toBe(2);
    });
  });

  // -----------------------------------------------------------------------
  // parseEvaluatorLog — auto-detection
  // -----------------------------------------------------------------------

  describe('parseEvaluatorLog — auto-detection', () => {
    it('should auto-detect and parse raw log', async () => {
      const logPath = writeTempLog('evaluator-log.jsonl', singleQueryRawLog());
      const result = await parseEvaluatorLog(logPath);

      expect(result.logFormat).toBe('raw');
      expect(result.queries).toHaveLength(1);
    });

    it('should auto-detect and parse summary log', async () => {
      const logPath = writeTempLog(
        'evaluator-log.summary.jsonl',
        summaryLog()
      );
      const result = await parseEvaluatorLog(logPath);

      expect(result.logFormat).toBe('summary');
      expect(result.queries).toHaveLength(1);
    });

    it('should return empty profile for empty log file', async () => {
      const logPath = writeTempLog('empty.jsonl', '');
      const result = await parseEvaluatorLog(logPath);

      expect(result.queries).toHaveLength(0);
      expect(result.totalEvents).toBe(0);
    });

    it('should handle malformed log content gracefully', async () => {
      const logPath = writeTempLog(
        'bad.jsonl',
        'not valid json\n\nalso not json'
      );
      const result = await parseEvaluatorLog(logPath);

      // Should not throw; returns empty profile
      expect(result.queries).toHaveLength(0);
      expect(result.totalEvents).toBe(0);
    });

    it('should handle Windows-style \\r\\n line endings', async () => {
      // Build the same singleQueryRawLog content but with \r\n line endings
      const content = singleQueryRawLog().replace(/\n/g, '\r\n');
      const logPath = writeTempLog('win-crlf.jsonl', content);
      const result = await parseEvaluatorLog(logPath);

      expect(result.logFormat).toBe('raw');
      expect(result.queries).toHaveLength(1);
      expect(result.queries[0].queryName).toBe('TestQuery.ql');
      expect(result.queries[0].predicateCount).toBe(2);
    });
  });
});
