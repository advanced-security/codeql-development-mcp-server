/**
 * Tests for query results evaluator
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { createTestTempDir, cleanupTestTempDir } from '../../utils/temp-dir';

// Mock CLI executor at the top level
vi.mock('../../../src/lib/cli-executor', () => ({
  executeCodeQLCommand: vi.fn()
}));

import {
  evaluateQueryResults,
  evaluateWithJsonDecoder,
  evaluateWithCsvDecoder,
  evaluateWithMermaidGraph,
  extractQueryMetadata,
  BUILT_IN_EVALUATORS
} from '../../../src/lib/query-results-evaluator';

import { executeCodeQLCommand } from '../../../src/lib/cli-executor';

const mockExecuteCodeQLCommand = vi.mocked(executeCodeQLCommand);

describe('Query Results Evaluator', () => {
  const testDir = createTestTempDir('query-evaluator-test');
  const testBqrsPath = join(testDir, 'test-results.bqrs');
  const testQueryPath = join(testDir, 'TestQuery.ql');
  
  beforeEach(() => {
    // Clean up and create test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
    
    // Create mock .bqrs file
    writeFileSync(testBqrsPath, 'mock binary data');
    
    // Reset mocks
    vi.clearAllMocks();
    mockExecuteCodeQLCommand.mockReset();
  });
  
  afterEach(() => {
    // Clean up test directory
    cleanupTestTempDir(testDir);
  });

  describe('extractQueryMetadata', () => {
    it('should extract metadata from a CodeQL query file', async () => {
      const queryContent = `/**
 * @name Test Query
 * @description A test query for unit testing
 * @id test/query
 * @kind graph
 * @tags test ast
 */

import javascript

from AstNode n
select n`;

      writeFileSync(testQueryPath, queryContent);
      
      const metadata = await extractQueryMetadata(testQueryPath);
      
      expect(metadata).toEqual({
        name: 'Test Query',
        description: 'A test query for unit testing',
        id: 'test/query',
        kind: 'graph',
        tags: ['test', 'ast']
      });
    });

    it('should handle queries with missing metadata', async () => {
      const queryContent = `import javascript
from AstNode n
select n`;

      writeFileSync(testQueryPath, queryContent);
      
      const metadata = await extractQueryMetadata(testQueryPath);
      
      expect(metadata).toEqual({});
    });

    it('should handle file read errors gracefully', async () => {
      const metadata = await extractQueryMetadata('/nonexistent/file.ql');
      
      expect(metadata).toEqual({});
    });
  });

  describe('evaluateWithJsonDecoder', () => {
    it('should decode BQRS to JSON format', async () => {
      const mockJsonResults = JSON.stringify({
        tuples: [
          ['node1', 'node2', 'edge'],
          ['node2', 'node3', 'edge']
        ]
      });

      mockExecuteCodeQLCommand.mockResolvedValue({
        success: true,
        stdout: mockJsonResults,
        stderr: '',
        exitCode: 0
      });

      const result = await evaluateWithJsonDecoder(testBqrsPath);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(testBqrsPath.replace('.bqrs', '.json'));
      expect(result.content).toBe(mockJsonResults);
      
      // Verify file was written
      expect(existsSync(result.outputPath!)).toBe(true);
      expect(readFileSync(result.outputPath!, 'utf-8')).toBe(mockJsonResults);
      
      // Verify correct CLI command was called
      expect(mockExecuteCodeQLCommand).toHaveBeenCalledWith(
        'bqrs decode',
        { format: 'json' },
        [testBqrsPath]
      );
    });

    it('should handle CLI command failures', async () => {
      mockExecuteCodeQLCommand.mockResolvedValue({
        success: false,
        stdout: '',
        stderr: 'Failed to decode BQRS',
        exitCode: 1
      });

      const result = await evaluateWithJsonDecoder(testBqrsPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to decode BQRS file');
    });

    it('should use custom output path when provided', async () => {
      const customOutputPath = join(testDir, 'custom-output.json');
      const mockJsonResults = '{"test": true}';

      mockExecuteCodeQLCommand.mockResolvedValue({
        success: true,
        stdout: mockJsonResults,
        stderr: '',
        exitCode: 0
      });

      const result = await evaluateWithJsonDecoder(testBqrsPath, customOutputPath);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(customOutputPath);
      expect(existsSync(customOutputPath)).toBe(true);
    });
  });

  describe('evaluateWithCsvDecoder', () => {
    it('should decode BQRS to CSV format', async () => {
      const mockCsvResults = 'node1,node2,edge\nnode2,node3,edge';

      mockExecuteCodeQLCommand.mockResolvedValue({
        success: true,
        stdout: mockCsvResults,
        stderr: '',
        exitCode: 0
      });

      const result = await evaluateWithCsvDecoder(testBqrsPath);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(testBqrsPath.replace('.bqrs', '.csv'));
      expect(result.content).toBe(mockCsvResults);
      
      // Verify correct CLI command was called
      expect(mockExecuteCodeQLCommand).toHaveBeenCalledWith(
        'bqrs decode',
        { format: 'csv' },
        [testBqrsPath]
      );
    });
  });

  describe('evaluateWithMermaidGraph', () => {
    it('should generate mermaid diagram for graph queries', async () => {
      // Create a graph query
      const queryContent = `/**
 * @name Print AST
 * @description Outputs AST representation
 * @kind graph
 * @tags ast
 */

import javascript`;

      writeFileSync(testQueryPath, queryContent);

      const mockJsonResults = JSON.stringify({
        tuples: [
          ['FunctionDef', 'Parameter', 'has_param'],
          ['Parameter', 'Identifier', 'has_name']
        ]
      });

      mockExecuteCodeQLCommand.mockResolvedValue({
        success: true,
        stdout: mockJsonResults,
        stderr: '',
        exitCode: 0
      });

      const result = await evaluateWithMermaidGraph(testBqrsPath, testQueryPath);

      expect(result.success).toBe(true);
      expect(result.outputPath).toBe(testBqrsPath.replace('.bqrs', '.md'));
      expect(result.content).toContain('# Print AST');
      expect(result.content).toContain('```mermaid\ngraph TD');
      expect(result.content).toContain('FunctionDef -->|has_param| Parameter');
      expect(result.content).toContain('Parameter -->|has_name| Identifier');
      expect(result.content).toContain('## Query Statistics');
    });

    it('should reject non-graph queries', async () => {
      // Create a non-graph query
      const queryContent = `/**
 * @name Test Query
 * @kind table
 */

import javascript`;

      writeFileSync(testQueryPath, queryContent);

      const result = await evaluateWithMermaidGraph(testBqrsPath, testQueryPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Query is not a graph query');
    });

    it('should handle empty results gracefully', async () => {
      const queryContent = `/**
 * @name Empty Graph
 * @kind graph
 */

import javascript`;

      writeFileSync(testQueryPath, queryContent);

      const mockJsonResults = JSON.stringify({ tuples: [] });

      mockExecuteCodeQLCommand.mockResolvedValue({
        success: true,
        stdout: mockJsonResults,
        stderr: '',
        exitCode: 0
      });

      const result = await evaluateWithMermaidGraph(testBqrsPath, testQueryPath);

      expect(result.success).toBe(true);
      expect(result.content).toContain('No Graph Data');
    });

    it('should handle malformed JSON results', async () => {
      const queryContent = `/**
 * @kind graph
 */`;

      writeFileSync(testQueryPath, queryContent);

      mockExecuteCodeQLCommand.mockResolvedValue({
        success: true,
        stdout: 'invalid json',
        stderr: '',
        exitCode: 0
      });

      const result = await evaluateWithMermaidGraph(testBqrsPath, testQueryPath);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse query results JSON');
    });
  });

  describe('evaluateQueryResults', () => {
    it('should default to json-decode when no evaluation function specified', async () => {
      const mockJsonResults = '{"test": true}';

      mockExecuteCodeQLCommand.mockResolvedValue({
        success: true,
        stdout: mockJsonResults,
        stderr: '',
        exitCode: 0
      });

      const result = await evaluateQueryResults(testBqrsPath, testQueryPath);

      expect(result.success).toBe(true);
      expect(mockExecuteCodeQLCommand).toHaveBeenCalledWith(
        'bqrs decode',
        { format: 'json' },
        [testBqrsPath]
      );
    });

    it('should handle unknown evaluation functions', async () => {
      const result = await evaluateQueryResults(testBqrsPath, testQueryPath, 'unknown-function');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown evaluation function: unknown-function');
      expect(result.error).toContain(Object.keys(BUILT_IN_EVALUATORS).join(', '));
    });

    it('should handle custom script paths', async () => {
      const result = await evaluateQueryResults(testBqrsPath, testQueryPath, '/absolute/path/to/script.sh');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Custom evaluation scripts are not yet implemented');
    });

    it('should reject relative paths that look like script paths', async () => {
      const result = await evaluateQueryResults(testBqrsPath, testQueryPath, 'relative/path/script.sh');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown evaluation function');
    });
  });

  describe('BUILT_IN_EVALUATORS', () => {
    it('should contain expected evaluator types', () => {
      expect(BUILT_IN_EVALUATORS).toHaveProperty('json-decode');
      expect(BUILT_IN_EVALUATORS).toHaveProperty('csv-decode');
      expect(BUILT_IN_EVALUATORS).toHaveProperty('mermaid-graph');
      
      expect(Object.keys(BUILT_IN_EVALUATORS)).toHaveLength(3);
    });
  });
});