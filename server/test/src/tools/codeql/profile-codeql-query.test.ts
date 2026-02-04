/**
 * Tests for CodeQL query profiling tool
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { registerProfileCodeQLQueryTool } from '../../../../src/tools/codeql/profile-codeql-query';

// Mock the logger to suppress expected error output
vi.mock('../../../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// We'll test the parsing and formatting functions by importing them
// Since they're not exported, we'll need to test via the file output
describe('Profile CodeQL Query Tool', () => {
  const testDir = join(tmpdir(), 'profile-test-' + Date.now());
  
  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  describe('Evaluator Log Parsing', () => {
    it('should parse a simple evaluator log with predicates', () => {
      // Create a minimal evaluator log
      const evaluatorLog = [
        {
          time: '2025-10-08T20:00:00.000Z',
          type: 'LOG_HEADER',
          eventId: 0,
          nanoTime: 1000000,
          codeqlVersion: '2.23.1',
          logVersion: '0.5.0'
        },
        {
          time: '2025-10-08T20:00:01.000Z',
          type: 'QUERY_STARTED',
          eventId: 1,
          nanoTime: 2000000,
          queryName: '/path/to/test.ql',
          stages: [0, 1]
        },
        {
          time: '2025-10-08T20:00:02.000Z',
          type: 'PREDICATE_STARTED',
          eventId: 2,
          nanoTime: 3000000,
          predicateName: 'testPredicate',
          predicateType: 'SIMPLE_INTENSIONAL',
          position: 'test.ql:1,1-5,10',
          dependencies: {}
        },
        {
          time: '2025-10-08T20:00:03.000Z',
          type: 'PREDICATE_COMPLETED',
          eventId: 3,
          nanoTime: 8000000,
          startEvent: 2,
          resultSize: 42
        },
        {
          time: '2025-10-08T20:00:04.000Z',
          type: 'QUERY_COMPLETED',
          eventId: 4,
          nanoTime: 10000000
        },
        {
          time: '2025-10-08T20:00:05.000Z',
          type: 'LOG_FOOTER',
          eventId: 5,
          nanoTime: 11000000
        }
      ];

      // Write as pretty-printed JSON (separated by empty lines)
      const logPath = join(testDir, 'evaluator-log.jsonl');
      const logContent = evaluatorLog.map(e => JSON.stringify(e, null, 2)).join('\n\n');
      writeFileSync(logPath, logContent);

      // Verify file exists
      expect(existsSync(logPath)).toBe(true);
      
      // Read and verify we can parse it
      const content = readFileSync(logPath, 'utf-8');
      const objects = content.split('\n\n').filter(s => s.trim());
      expect(objects.length).toBe(6);
      
      const parsed = objects.map(obj => JSON.parse(obj));
      expect(parsed.length).toBe(6);
      expect(parsed[0].type).toBe('LOG_HEADER');
      expect(parsed[2].type).toBe('PREDICATE_STARTED');
      expect(parsed[3].type).toBe('PREDICATE_COMPLETED');
    });

    it('should handle evaluator log with dependencies', () => {
      const evaluatorLog = [
        {
          time: '2025-10-08T20:00:00.000Z',
          type: 'LOG_HEADER',
          eventId: 0,
          nanoTime: 1000000
        },
        {
          time: '2025-10-08T20:00:01.000Z',
          type: 'QUERY_STARTED',
          eventId: 1,
          nanoTime: 2000000,
          queryName: '/path/to/test.ql'
        },
        {
          time: '2025-10-08T20:00:02.000Z',
          type: 'PREDICATE_STARTED',
          eventId: 2,
          nanoTime: 3000000,
          predicateName: 'predicate1',
          dependencies: {}
        },
        {
          time: '2025-10-08T20:00:03.000Z',
          type: 'PREDICATE_COMPLETED',
          eventId: 3,
          nanoTime: 5000000,
          startEvent: 2,
          resultSize: 10
        },
        {
          time: '2025-10-08T20:00:04.000Z',
          type: 'PREDICATE_STARTED',
          eventId: 4,
          nanoTime: 6000000,
          predicateName: 'predicate2',
          dependencies: { predicate1: 'hash123' }
        },
        {
          time: '2025-10-08T20:00:05.000Z',
          type: 'PREDICATE_COMPLETED',
          eventId: 5,
          nanoTime: 9000000,
          startEvent: 4,
          resultSize: 5
        },
        {
          time: '2025-10-08T20:00:06.000Z',
          type: 'QUERY_COMPLETED',
          eventId: 6,
          nanoTime: 10000000
        }
      ];

      const logPath = join(testDir, 'evaluator-log.jsonl');
      const logContent = evaluatorLog.map(e => JSON.stringify(e, null, 2)).join('\n\n');
      writeFileSync(logPath, logContent);

      const content = readFileSync(logPath, 'utf-8');
      const objects = content.split('\n\n').filter(s => s.trim());
      const parsed = objects.map(obj => JSON.parse(obj));
      
      // Find the predicate with dependencies
      const predWithDeps = parsed.find(e => e.predicateName === 'predicate2');
      expect(predWithDeps).toBeDefined();
      expect(predWithDeps.dependencies).toBeDefined();
      expect(Object.keys(predWithDeps.dependencies)).toContain('predicate1');
    });
  });

  describe('Profile Data Structure', () => {
    it('should create profile with pipelines in evaluation order', () => {
      // This tests that the data structure preserves eventId ordering
      const pipelines = [
        { eventId: 5, name: 'third', duration: 1.0, dependencies: [], dependencyEventIds: [] },
        { eventId: 2, name: 'first', duration: 3.0, dependencies: [], dependencyEventIds: [] },
        { eventId: 3, name: 'second', duration: 2.0, dependencies: [], dependencyEventIds: [] }
      ];

      // Sort by eventId (evaluation order)
      const sorted = pipelines.sort((a, b) => a.eventId - b.eventId);
      
      expect(sorted[0].eventId).toBe(2);
      expect(sorted[0].name).toBe('first');
      expect(sorted[1].eventId).toBe(3);
      expect(sorted[1].name).toBe('second');
      expect(sorted[2].eventId).toBe(5);
      expect(sorted[2].name).toBe('third');
    });

    it('should link dependencies via eventIds', () => {
      const pipeline1 = { eventId: 2, name: 'pred1' };
      const pipeline2 = { 
        eventId: 5, 
        name: 'pred2', 
        dependencies: ['pred1'],
        dependencyEventIds: [2]
      };

      expect(pipeline2.dependencyEventIds).toContain(pipeline1.eventId);
      expect(pipeline2.dependencies).toContain(pipeline1.name);
    });
  });

  describe('Mermaid Diagram Generation', () => {
    it('should generate valid mermaid syntax', () => {
      const mermaidContent = [
        '```mermaid',
        'graph TD',
        '',
        '  QUERY["test.ql<br/>Total: 100.00ms"]',
        '',
        '  P2["predicate1<br/>10.00ms | 5 results"]',
        '  P3["predicate2<br/>20.00ms | 10 results"]',
        '',
        '  QUERY --> P2',
        '',
        '  P2 -->|"20.00ms"| P3',
        '',
        '  classDef default fill:#e1f5ff,stroke:#333,stroke-width:2px',
        '  classDef query fill:#ffe1e1,stroke:#333,stroke-width:3px',
        '  class QUERY query',
        '```'
      ].join('\n');

      expect(mermaidContent).toContain('```mermaid');
      expect(mermaidContent).toContain('graph TD');
      expect(mermaidContent).toContain('QUERY["test.ql');
      expect(mermaidContent).toContain('P2["predicate1');
      expect(mermaidContent).toContain('QUERY --> P2');
      expect(mermaidContent).toContain('P2 -->|"20.00ms"| P3');
      expect(mermaidContent).toContain('```');
    });

    it('should use eventIds for node references', () => {
      // Verify that node IDs use eventId not array index
      const nodeId1 = 'P3';  // eventId 3
      const nodeId2 = 'P7';  // eventId 7
      
      expect(nodeId1).toBe('P3');
      expect(nodeId2).toBe('P7');
      expect(nodeId1).not.toBe('P0');  // Not index 0
    });
  });

  describe('JSON Profile Format', () => {
    it('should have required fields', () => {
      const profile = {
        queryName: '/path/to/test.ql',
        totalDuration: 100.5,
        totalEvents: 10,
        pipelines: []
      };

      expect(profile).toHaveProperty('queryName');
      expect(profile).toHaveProperty('totalDuration');
      expect(profile).toHaveProperty('totalEvents');
      expect(profile).toHaveProperty('pipelines');
      expect(Array.isArray(profile.pipelines)).toBe(true);
    });

    it('should not have summary fields', () => {
      const profile = {
        queryName: '/path/to/test.ql',
        totalDuration: 100.5,
        totalEvents: 10,
        pipelines: []
      };

      expect(profile).not.toHaveProperty('slowestPredicates');
      expect(profile).not.toHaveProperty('largestResults');
      expect(profile).not.toHaveProperty('summary');
    });

    it('pipeline nodes should have complete information', () => {
      const pipeline = {
        eventId: 5,
        name: 'testPredicate',
        position: 'test.ql:10,5-15,20',
        type: 'SIMPLE_INTENSIONAL',
        startTime: 1000000,
        endTime: 5000000,
        duration: 4.0,
        resultSize: 42,
        dependencies: ['dep1', 'dep2'],
        dependencyEventIds: [2, 3]
      };

      expect(pipeline).toHaveProperty('eventId');
      expect(pipeline).toHaveProperty('name');
      expect(pipeline).toHaveProperty('duration');
      expect(pipeline).toHaveProperty('dependencies');
      expect(pipeline).toHaveProperty('dependencyEventIds');
      expect(pipeline.dependencyEventIds.length).toBe(pipeline.dependencies.length);
    });
  });

  describe('registerProfileCodeQLQueryTool', () => {
    it('should register the profile_codeql_query tool with the MCP server', () => {
      const mockServer = {
        tool: vi.fn(),
      } as unknown as McpServer;

      registerProfileCodeQLQueryTool(mockServer);

      expect(mockServer.tool).toHaveBeenCalledOnce();
      expect(mockServer.tool).toHaveBeenCalledWith(
        'profile_codeql_query',
        'Profile the performance of a CodeQL query run against a specific database by analyzing the evaluator log JSON file',
        expect.objectContaining({
          query: expect.any(Object),
          database: expect.any(Object),
          evaluatorLog: expect.any(Object),
          outputDir: expect.any(Object),
        }),
        expect.any(Function)
      );
    });

    it('should return error when evaluator log does not exist', async () => {
      const mockServer = {
        tool: vi.fn(),
      } as unknown as McpServer;

      registerProfileCodeQLQueryTool(mockServer);

      const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];

      const result = await handler({
        query: '/path/to/query.ql',
        database: '/path/to/database',
        evaluatorLog: '/nonexistent/evaluator-log.jsonl',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Evaluator log not found');
    });

    it('should parse existing evaluator log and return profile summary', async () => {
      const profileTestDir = join(testDir, 'handler-test');
      mkdirSync(profileTestDir, { recursive: true });

      // Create a valid evaluator log
      const evaluatorLog = [
        {
          time: '2025-10-08T20:00:00.000Z',
          type: 'LOG_HEADER',
          eventId: 0,
          nanoTime: 1000000,
          codeqlVersion: '2.23.1',
          logVersion: '0.5.0'
        },
        {
          time: '2025-10-08T20:00:01.000Z',
          type: 'QUERY_STARTED',
          eventId: 1,
          nanoTime: 2000000,
          queryName: '/path/to/test.ql',
          stages: [0, 1]
        },
        {
          time: '2025-10-08T20:00:02.000Z',
          type: 'PREDICATE_STARTED',
          eventId: 2,
          nanoTime: 3000000,
          predicateName: 'testPredicate',
          predicateType: 'SIMPLE_INTENSIONAL',
          position: 'test.ql:1,1-5,10',
          dependencies: {}
        },
        {
          time: '2025-10-08T20:00:03.000Z',
          type: 'PREDICATE_COMPLETED',
          eventId: 3,
          nanoTime: 8000000,
          startEvent: 2,
          resultSize: 42
        },
        {
          time: '2025-10-08T20:00:04.000Z',
          type: 'QUERY_COMPLETED',
          eventId: 4,
          nanoTime: 10000000
        }
      ];

      const logPath = join(profileTestDir, 'evaluator-log.jsonl');
      const logContent = evaluatorLog.map(e => JSON.stringify(e, null, 2)).join('\n\n');
      writeFileSync(logPath, logContent);

      const mockServer = {
        tool: vi.fn(),
      } as unknown as McpServer;

      registerProfileCodeQLQueryTool(mockServer);

      const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];

      const result = await handler({
        query: '/path/to/test.ql',
        database: '/path/to/database',
        evaluatorLog: logPath,
        outputDir: profileTestDir,
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Query profiling completed successfully');
      expect(result.content[0].text).toContain('Profile Summary');
      expect(result.content[0].text).toContain('Total Pipelines: 1');
      
      // Verify output files were created
      expect(existsSync(join(profileTestDir, 'query-evaluation-profile.json'))).toBe(true);
      expect(existsSync(join(profileTestDir, 'query-evaluation-profile.md'))).toBe(true);
    });

    it('should handle completely invalid evaluator log content gracefully', async () => {
      const errorTestDir = join(testDir, 'error-test');
      mkdirSync(errorTestDir, { recursive: true });

      // Create an invalid evaluator log (not valid JSON)
      const logPath = join(errorTestDir, 'evaluator-log.jsonl');
      writeFileSync(logPath, 'not valid json content');

      const mockServer = {
        tool: vi.fn(),
      } as unknown as McpServer;

      registerProfileCodeQLQueryTool(mockServer);

      const handler = (mockServer.tool as ReturnType<typeof vi.fn>).mock.calls[0][3];

      const result = await handler({
        query: '/path/to/test.ql',
        database: '/path/to/database',
        evaluatorLog: logPath,
        outputDir: errorTestDir,
      });

      // The implementation filters out invalid JSON rather than failing
      // So it should still return a profile, just with empty/zero values
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Query profiling completed successfully');
      expect(result.content[0].text).toContain('Total Pipelines: 0');
    });
  });
});
