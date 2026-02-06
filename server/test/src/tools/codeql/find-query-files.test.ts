/**
 * Tests for find-query-files tool
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerFindCodeQLQueryFilesTool } from '../../../../src/tools/codeql/find-query-files';
import { findCodeQLQueryFiles } from '../../../../src/lib/query-file-finder';
import * as fs from 'fs';
import * as path from 'path';
import { createTestTempDir, cleanupTestTempDir } from '../../../utils/temp-dir';

describe('Find Query Files Tool', () => {
  let testDir: string;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = createTestTempDir('test-find-tool');
  });

  afterEach(() => {
    // Clean up test directory
    cleanupTestTempDir(testDir);
  });

  describe('registerFindCodeQLQueryFilesTool', () => {
    it('should register the find_codeql_query_files tool', () => {
      const mockServer = {
        tool: vi.fn()
      } as unknown as McpServer;

      registerFindCodeQLQueryFilesTool(mockServer);

      const toolCalls = (mockServer.tool as any).mock.calls;
      const toolNames = toolCalls.map((call: any) => call[0]);
      expect(toolNames).toContain('find_codeql_query_files');
    });

    it('should call findCodeQLQueryFiles function', async () => {
      // This test verifies the integration by actually calling the function
      const srcDir = path.join(testDir, 'go', 'src', 'TestQuery');
      const testDirPath = path.join(testDir, 'go', 'test', 'TestQuery');

      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(testDirPath, { recursive: true });

      const queryFile = path.join(srcDir, 'TestQuery.ql');
      const mdFile = path.join(srcDir, 'TestQuery.md');
      const qlrefFile = path.join(testDirPath, 'TestQuery.qlref');

      fs.writeFileSync(queryFile, 'import go\nselect 1');
      fs.writeFileSync(mdFile, '# TestQuery');
      fs.writeFileSync(qlrefFile, 'TestQuery/TestQuery.ql');

      const result = await findCodeQLQueryFiles(queryFile, 'go', false);

      expect(result.queryName).toBe('TestQuery');
      expect(result.language).toBe('go');
      expect(result.status.queryExists).toBe(true);
      expect(result.status.documentationExists).toBe(true);
      expect(result.status.qlrefExists).toBe(true);
    });

    it('should handle missing query file gracefully', async () => {
      const nonExistentFile = path.join(testDir, 'missing', 'Query.ql');

      const result = await findCodeQLQueryFiles(nonExistentFile, undefined, false);

      expect(result.status.queryExists).toBe(false);
      expect(result.queryName).toBe('Query');
      expect(result.allFilesExist).toBe(false);
      expect(result.missingFiles.length).toBeGreaterThan(0);
    });

    it('should infer language when not provided', async () => {
      const srcDir = path.join(testDir, 'python', 'src', 'InferQuery');
      fs.mkdirSync(srcDir, { recursive: true});

      const queryFile = path.join(srcDir, 'InferQuery.ql');
      fs.writeFileSync(queryFile, 'import python\nselect 1');

      const result = await findCodeQLQueryFiles(queryFile, undefined, false);

      expect(result.language).toBe('python');
    });

    it('should return comprehensive file status', async () => {
      const srcDir = path.join(testDir, 'java', 'src', 'StatusQuery');
      const testDirPath = path.join(testDir, 'java', 'test', 'StatusQuery');

      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(testDirPath, { recursive: true });

      const queryFile = path.join(srcDir, 'StatusQuery.ql');
      const qspecFile = path.join(srcDir, 'StatusQuery.qspec');
      const testCodeFile = path.join(testDirPath, 'StatusQuery.java');
      const expectedFile = path.join(testDirPath, 'StatusQuery.expected');

      fs.writeFileSync(queryFile, 'import java\nselect 1');
      fs.writeFileSync(qspecFile, 'purpose: Test');
      fs.writeFileSync(testCodeFile, '// test');
      fs.writeFileSync(expectedFile, '');

      const result = await findCodeQLQueryFiles(queryFile, undefined, false);

      expect(result.status.queryExists).toBe(true);
      expect(result.status.documentationExists).toBe(false);
      expect(result.status.specificationExists).toBe(true);
      expect(result.status.testDirectoryExists).toBe(true);
      expect(result.files.test.testCode.length).toBeGreaterThan(0);
      expect(result.status.expectedResultsExist).toBe(true);
      expect(result.status.actualResultsExist).toBe(false);
      expect(result.status.testDatabaseDirExists).toBe(false);
    });

    it('should list all file paths in the result', async () => {
      const srcDir = path.join(testDir, 'javascript', 'src', 'PathQuery');
      fs.mkdirSync(srcDir, { recursive: true });

      const queryFile = path.join(srcDir, 'PathQuery.ql');
      fs.writeFileSync(queryFile, 'import javascript\nselect 1');

      const result = await findCodeQLQueryFiles(queryFile, undefined, false);

      expect(result.files.query.dir).toBeDefined();
      expect(result.files.query.query).toBeDefined();
      expect(result.files.query.doc).toBeDefined();
      expect(result.files.query.spec).toBeDefined();
      expect(result.files.test.dir).toBeDefined();
      expect(result.files.test.qlref).toBeDefined();
      expect(Array.isArray(result.files.test.testCode)).toBe(true);
      expect(result.files.test.expected).toBeDefined();
      expect(result.files.test.actual).toBeDefined();
      expect(result.files.test.testDatabaseDir).toBeDefined();
    });

    it('should include missing files list', async () => {
      const srcDir = path.join(testDir, 'cpp', 'src', 'MissingQuery');
      fs.mkdirSync(srcDir, { recursive: true });

      const queryFile = path.join(srcDir, 'MissingQuery.ql');
      fs.writeFileSync(queryFile, 'import cpp\nselect 1');

      const result = await findCodeQLQueryFiles(queryFile, undefined, false);

      expect(result.missingFiles).toBeDefined();
      expect(Array.isArray(result.missingFiles)).toBe(true);
      expect(result.missingFiles.length).toBeGreaterThan(0);
      expect(result.allFilesExist).toBe(false);
    });
  });

  describe('Tool Handler Invocation', () => {
    it('should handle valid query path in tool handler', async () => {
      const srcDir = path.join(testDir, 'ruby', 'src', 'HandlerQuery');
      fs.mkdirSync(srcDir, { recursive: true });

      const queryFile = path.join(srcDir, 'HandlerQuery.ql');
      fs.writeFileSync(queryFile, 'import ruby\nselect 1');

      const mockServer = {
        tool: vi.fn()
      } as unknown as McpServer;

      registerFindCodeQLQueryFilesTool(mockServer);

      const toolCall = (mockServer.tool as any).mock.calls[0];
      const handler = toolCall[3];

      const result = await handler({
        queryPath: queryFile,
        language: 'ruby',
        resolveMetadata: false
      });

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.queryName).toBe('HandlerQuery');
      expect(parsed.language).toBe('ruby');
    });

    it('should handle error in tool handler gracefully', async () => {
      const mockServer = {
        tool: vi.fn()
      } as unknown as McpServer;

      registerFindCodeQLQueryFilesTool(mockServer);

      const toolCall = (mockServer.tool as any).mock.calls[0];
      const handler = toolCall[3];

      // Pass invalid query path to trigger error path
      const result = await handler({
        queryPath: '/nonexistent/path/Query.ql',
        resolveMetadata: false
      });

      // Even with non-existent file, the function should return result without error
      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.status.queryExists).toBe(false);
    });

    it('should resolve metadata when resolveMetadata is not specified', async () => {
      const srcDir = path.join(testDir, 'go', 'src', 'MetadataQuery');
      fs.mkdirSync(srcDir, { recursive: true });

      const queryFile = path.join(srcDir, 'MetadataQuery.ql');
      fs.writeFileSync(queryFile, '/**\n * @name Test\n * @kind problem\n */\nimport go\nselect 1');

      const mockServer = {
        tool: vi.fn()
      } as unknown as McpServer;

      registerFindCodeQLQueryFilesTool(mockServer);

      const toolCall = (mockServer.tool as any).mock.calls[0];
      const handler = toolCall[3];

      const result = await handler({
        queryPath: queryFile
        // resolveMetadata not specified, should default to true
      });

      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.queryName).toBe('MetadataQuery');
    });
  });
});
