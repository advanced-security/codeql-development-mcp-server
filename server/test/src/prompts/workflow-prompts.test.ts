/**
 * Tests for workflow prompts context builders, schema validation,
 * and registerWorkflowPrompts registration consistency.
 *
 * This file ensures that:
 * 1. Required vs optional parameters are properly enforced per schema.
 * 2. VS Code slash-command string inputs are handled correctly (coercion).
 * 3. Each schema exposes exactly the expected parameter keys.
 * 4. Registered schemas match the exported schema constants.
 * 5. Handler outputs reflect user-supplied parameter values.
 * 6. Default/derived values behave consistently.
 * 7. All SUPPORTED_LANGUAGES are accepted by every schema with a language field.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  buildToolsQueryContext,
  buildWorkshopContext,
  checkForDuplicatedCodeSchema,
  createSafePromptHandler,
  describeFalsePositivesSchema,
  documentCodeqlQuerySchema,
  explainCodeqlQuerySchema,
  findOverlappingQueriesSchema,
  formatValidationError,
  markdownInlineCode,
  qlLspIterativeDevelopmentSchema,
  qlTddAdvancedSchema,
  qlTddBasicSchema,
  registerWorkflowPrompts,
  resolvePromptFilePath,
  sarifRankSchema,
  SUPPORTED_LANGUAGES,
  testDrivenDevelopmentSchema,
  toPermissiveShape,
  toolsQueryWorkflowSchema,
  WORKFLOW_PROMPT_NAMES,
  workshopCreationWorkflowSchema,
} from '../../../src/prompts/workflow-prompts';
import { createTestTempDir, cleanupTestTempDir } from '../../utils/temp-dir';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Mock prompt-loader so tests never read .prompt.md files from disk.
// ---------------------------------------------------------------------------
vi.mock('../../../src/prompts/prompt-loader', () => ({
  loadPromptTemplate: vi.fn(() => '# mock template\n'),
  processPromptTemplate: vi.fn(() => '# processed mock template\n'),
}));

// ---------------------------------------------------------------------------
// Helper types
// ---------------------------------------------------------------------------

/** Handler result shape returned by every workflow prompt. */
interface PromptResult {
  messages: Array<{
    content: { text: string; type: string };
    role: string;
  }>;
}

// eslint-disable-next-line no-unused-vars
type PromptHandler = (args: Record<string, any>) => Promise<PromptResult>;

// ---------------------------------------------------------------------------
// Helper: invoke a registered handler by prompt name
// ---------------------------------------------------------------------------
function getRegisteredHandler(
  mockServer: McpServer,
  promptName: string
): PromptHandler {
  const calls = (mockServer.prompt as ReturnType<typeof vi.fn>).mock.calls;
  const match = calls.find((c: unknown[]) => c[0] === promptName);
  if (!match) {
    throw new Error(`Prompt "${promptName}" not registered`);
  }
  return match[3] as PromptHandler;
}

describe('Workflow Prompts', () => {
  // -----------------------------------------------------------------------
  // SUPPORTED_LANGUAGES
  // -----------------------------------------------------------------------
  describe('SUPPORTED_LANGUAGES', () => {
    it('should contain the expected 9 languages', () => {
      expect(SUPPORTED_LANGUAGES).toHaveLength(9);
    });

    it.each([
      'actions', 'cpp', 'csharp', 'go', 'java',
      'javascript', 'python', 'ruby', 'swift',
    ] as const)('should include "%s"', (lang) => {
      expect(SUPPORTED_LANGUAGES).toContain(lang);
    });

    it('should be sorted alphabetically', () => {
      const sorted = [...SUPPORTED_LANGUAGES].sort();
      expect(SUPPORTED_LANGUAGES).toEqual(sorted);
    });
  });

  // -----------------------------------------------------------------------
  // WORKFLOW_PROMPT_NAMES
  // -----------------------------------------------------------------------
  describe('WORKFLOW_PROMPT_NAMES', () => {
    it('should contain 13 prompt names', () => {
      expect(WORKFLOW_PROMPT_NAMES).toHaveLength(13);
    });

    it('should be sorted alphabetically', () => {
      const sorted = [...WORKFLOW_PROMPT_NAMES].sort();
      expect(WORKFLOW_PROMPT_NAMES).toEqual(sorted);
    });
  });

  // -----------------------------------------------------------------------
  // testDrivenDevelopmentSchema
  // -----------------------------------------------------------------------
  describe('testDrivenDevelopmentSchema', () => {
    it('should expose exactly the expected parameter keys', () => {
      expect(Object.keys(testDrivenDevelopmentSchema.shape).sort()).toEqual(
        ['language', 'queryName']
      );
    });

    it('should accept valid required language', () => {
      const result = testDrivenDevelopmentSchema.safeParse({ language: 'javascript' });
      expect(result.success).toBe(true);
    });

    it('should accept language with optional queryName', () => {
      const result = testDrivenDevelopmentSchema.safeParse({
        language: 'python',
        queryName: 'MyQuery',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.queryName).toBe('MyQuery');
      }
    });

    it('should leave queryName as undefined when omitted', () => {
      const result = testDrivenDevelopmentSchema.safeParse({ language: 'java' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.queryName).toBeUndefined();
      }
    });

    it('should reject missing language', () => {
      const result = testDrivenDevelopmentSchema.safeParse({ queryName: 'Q' });
      expect(result.success).toBe(false);
    });

    it('should reject empty object (language is required)', () => {
      const result = testDrivenDevelopmentSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject invalid language', () => {
      const result = testDrivenDevelopmentSchema.safeParse({ language: 'rust' });
      expect(result.success).toBe(false);
    });

    it('should reject language with wrong case (enum is case-sensitive)', () => {
      const result = testDrivenDevelopmentSchema.safeParse({ language: 'JavaScript' });
      expect(result.success).toBe(false);
    });

    it.each([...SUPPORTED_LANGUAGES])('should accept language "%s"', (lang) => {
      const result = testDrivenDevelopmentSchema.safeParse({ language: lang });
      expect(result.success).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // toolsQueryWorkflowSchema
  // -----------------------------------------------------------------------
  describe('toolsQueryWorkflowSchema', () => {
    it('should expose exactly the expected parameter keys', () => {
      expect(Object.keys(toolsQueryWorkflowSchema.shape).sort()).toEqual(
        ['database', 'language', 'sourceFiles', 'sourceFunction', 'targetFunction']
      );
    });

    it('should accept required database and language', () => {
      const result = toolsQueryWorkflowSchema.safeParse({
        database: '/db',
        language: 'go',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing database', () => {
      const result = toolsQueryWorkflowSchema.safeParse({ language: 'go' });
      expect(result.success).toBe(false);
    });

    it('should reject missing language', () => {
      const result = toolsQueryWorkflowSchema.safeParse({ database: '/db' });
      expect(result.success).toBe(false);
    });

    it('should reject empty object (both required fields missing)', () => {
      const result = toolsQueryWorkflowSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should accept all optional parameters', () => {
      const result = toolsQueryWorkflowSchema.safeParse({
        database: '/db',
        language: 'cpp',
        sourceFiles: 'main.cpp',
        sourceFunction: 'init',
        targetFunction: 'cleanup',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sourceFiles).toBe('main.cpp');
        expect(result.data.sourceFunction).toBe('init');
        expect(result.data.targetFunction).toBe('cleanup');
      }
    });

    it('should leave optional parameters as undefined when omitted', () => {
      const result = toolsQueryWorkflowSchema.safeParse({
        database: '/db',
        language: 'go',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sourceFiles).toBeUndefined();
        expect(result.data.sourceFunction).toBeUndefined();
        expect(result.data.targetFunction).toBeUndefined();
      }
    });

    it.each([...SUPPORTED_LANGUAGES])('should accept language "%s"', (lang) => {
      const result = toolsQueryWorkflowSchema.safeParse({ database: '/db', language: lang });
      expect(result.success).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // workshopCreationWorkflowSchema
  // -----------------------------------------------------------------------
  describe('workshopCreationWorkflowSchema', () => {
    it('should expose exactly the expected parameter keys', () => {
      expect(Object.keys(workshopCreationWorkflowSchema.shape).sort()).toEqual(
        ['language', 'numStages', 'queryPath', 'workshopName']
      );
    });

    it('should accept valid parameters with number numStages', () => {
      const result = workshopCreationWorkflowSchema.safeParse({
        queryPath: '/path/to/query.ql',
        language: 'javascript',
        numStages: 5
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.numStages).toBe(5);
      }
    });

    it('should coerce string numStages to number (VSCode slash command input)', () => {
      // VSCode slash commands pass all arguments as strings
      const result = workshopCreationWorkflowSchema.safeParse({
        queryPath: '/path/to/query.ql',
        language: 'python',
        numStages: '6' // String input from VSCode
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.numStages).toBe(6);
        expect(typeof result.data.numStages).toBe('number');
      }
    });

    it('should coerce string "0" numStages to number 0', () => {
      const result = workshopCreationWorkflowSchema.safeParse({
        queryPath: '/q.ql',
        language: 'java',
        numStages: '0',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.numStages).toBe(0);
      }
    });

    it('should accept optional numStages', () => {
      const result = workshopCreationWorkflowSchema.safeParse({
        queryPath: '/path/to/query.ql',
        language: 'java'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.numStages).toBeUndefined();
      }
    });

    it('should accept optional workshopName', () => {
      const result = workshopCreationWorkflowSchema.safeParse({
        queryPath: '/path/to/query.ql',
        language: 'go',
        workshopName: 'my-workshop'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.workshopName).toBe('my-workshop');
      }
    });

    it('should leave optional fields undefined when omitted', () => {
      const result = workshopCreationWorkflowSchema.safeParse({
        queryPath: '/q.ql',
        language: 'ruby',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.workshopName).toBeUndefined();
        expect(result.data.numStages).toBeUndefined();
      }
    });

    it('should reject invalid language', () => {
      const result = workshopCreationWorkflowSchema.safeParse({
        queryPath: '/path/to/query.ql',
        language: 'invalid-language'
      });

      expect(result.success).toBe(false);
    });

    it('should reject missing queryPath', () => {
      const result = workshopCreationWorkflowSchema.safeParse({
        language: 'javascript'
      });

      expect(result.success).toBe(false);
    });

    it('should reject missing language', () => {
      const result = workshopCreationWorkflowSchema.safeParse({
        queryPath: '/path/to/query.ql'
      });

      expect(result.success).toBe(false);
    });

    it('should reject empty object (both required fields missing)', () => {
      const result = workshopCreationWorkflowSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it.each([...SUPPORTED_LANGUAGES])('should accept language "%s"', (lang) => {
      const result = workshopCreationWorkflowSchema.safeParse({
        queryPath: '/path/to/query.ql',
        language: lang
      });

      expect(result.success).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // qlTddBasicSchema
  // -----------------------------------------------------------------------
  describe('qlTddBasicSchema', () => {
    it('should expose exactly the expected parameter keys', () => {
      expect(Object.keys(qlTddBasicSchema.shape).sort()).toEqual(
        ['language', 'queryName']
      );
    });

    it('should accept required language', () => {
      const result = qlTddBasicSchema.safeParse({ language: 'java' });
      expect(result.success).toBe(true);
    });

    it('should reject empty object (language is required)', () => {
      const result = qlTddBasicSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should accept language with optional queryName', () => {
      const result = qlTddBasicSchema.safeParse({ language: 'java', queryName: 'TestQ' });
      expect(result.success).toBe(true);
    });

    it('should reject queryName without language', () => {
      const result = qlTddBasicSchema.safeParse({ queryName: 'TestQ' });
      expect(result.success).toBe(false);
    });

    it('should leave queryName as undefined when omitted', () => {
      const result = qlTddBasicSchema.safeParse({ language: 'java' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.queryName).toBeUndefined();
      }
    });

    it('should reject invalid language', () => {
      const result = qlTddBasicSchema.safeParse({ language: 'fortran' });
      expect(result.success).toBe(false);
    });

    it.each([...SUPPORTED_LANGUAGES])('should accept language "%s"', (lang) => {
      const result = qlTddBasicSchema.safeParse({ language: lang });
      expect(result.success).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // qlTddAdvancedSchema
  // -----------------------------------------------------------------------
  describe('qlTddAdvancedSchema', () => {
    it('should expose exactly the expected parameter keys', () => {
      expect(Object.keys(qlTddAdvancedSchema.shape).sort()).toEqual(
        ['database', 'language', 'queryName']
      );
    });

    it('should accept required language', () => {
      const result = qlTddAdvancedSchema.safeParse({ language: 'swift' });
      expect(result.success).toBe(true);
    });

    it('should reject empty object (language is required)', () => {
      const result = qlTddAdvancedSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should accept all parameters', () => {
      const result = qlTddAdvancedSchema.safeParse({
        database: '/db',
        language: 'swift',
        queryName: 'AdvancedQ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.database).toBe('/db');
      }
    });

    it('should leave optional fields as undefined when omitted', () => {
      const result = qlTddAdvancedSchema.safeParse({ language: 'swift' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.database).toBeUndefined();
        expect(result.data.queryName).toBeUndefined();
      }
    });

    it('should reject invalid language', () => {
      const result = qlTddAdvancedSchema.safeParse({ language: 'sql' });
      expect(result.success).toBe(false);
    });

    it.each([...SUPPORTED_LANGUAGES])('should accept language "%s"', (lang) => {
      const result = qlTddAdvancedSchema.safeParse({ language: lang });
      expect(result.success).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // sarifRankSchema
  // -----------------------------------------------------------------------
  describe('sarifRankSchema', () => {
    it('should expose exactly the expected parameter keys', () => {
      expect(Object.keys(sarifRankSchema.shape).sort()).toEqual(
        ['queryId', 'sarifPath']
      );
    });

    it('should accept required sarifPath', () => {
      const result = sarifRankSchema.safeParse({ sarifPath: '/results.sarif' });
      expect(result.success).toBe(true);
    });

    it('should reject empty object (sarifPath is required)', () => {
      const result = sarifRankSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject queryId alone (sarifPath is required)', () => {
      const result = sarifRankSchema.safeParse({ queryId: 'js/xss' });
      expect(result.success).toBe(false);
    });

    it('should accept both parameters', () => {
      const result = sarifRankSchema.safeParse({
        queryId: 'py/sql-injection',
        sarifPath: '/path.sarif',
      });
      expect(result.success).toBe(true);
    });

    it('should leave queryId as undefined when omitted', () => {
      const result = sarifRankSchema.safeParse({ sarifPath: '/path.sarif' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.queryId).toBeUndefined();
      }
    });
  });

  // -----------------------------------------------------------------------
  // explainCodeqlQuerySchema
  // -----------------------------------------------------------------------
  describe('explainCodeqlQuerySchema', () => {
    it('should expose exactly the expected parameter keys', () => {
      expect(Object.keys(explainCodeqlQuerySchema.shape).sort()).toEqual(
        ['databasePath', 'language', 'queryPath']
      );
    });

    it('should accept required queryPath and language', () => {
      const result = explainCodeqlQuerySchema.safeParse({
        language: 'javascript',
        queryPath: '/q.ql',
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional databasePath', () => {
      const result = explainCodeqlQuerySchema.safeParse({
        databasePath: '/db',
        language: 'python',
        queryPath: '/q.ql',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.databasePath).toBe('/db');
      }
    });

    it('should leave databasePath as undefined when omitted', () => {
      const result = explainCodeqlQuerySchema.safeParse({
        language: 'go',
        queryPath: '/q.ql',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.databasePath).toBeUndefined();
      }
    });

    it('should reject missing queryPath', () => {
      const result = explainCodeqlQuerySchema.safeParse({
        language: 'java',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing language', () => {
      const result = explainCodeqlQuerySchema.safeParse({
        queryPath: '/q.ql',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty object (both required fields missing)', () => {
      const result = explainCodeqlQuerySchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it.each([...SUPPORTED_LANGUAGES])('should accept language "%s"', (lang) => {
      const result = explainCodeqlQuerySchema.safeParse({
        language: lang,
        queryPath: '/q.ql',
      });
      expect(result.success).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // describeFalsePositivesSchema
  // -----------------------------------------------------------------------
  describe('describeFalsePositivesSchema', () => {
    it('should expose exactly the expected parameter keys', () => {
      expect(Object.keys(describeFalsePositivesSchema.shape).sort()).toEqual(
        ['queryPath']
      );
    });

    it('should accept required queryPath', () => {
      const result = describeFalsePositivesSchema.safeParse({
        queryPath: '/path/to/query.ql',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.queryPath).toBe('/path/to/query.ql');
      }
    });

    it('should reject empty object (queryPath is required)', () => {
      const result = describeFalsePositivesSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // documentCodeqlQuerySchema
  // -----------------------------------------------------------------------
  describe('documentCodeqlQuerySchema', () => {
    it('should expose exactly the expected parameter keys', () => {
      expect(Object.keys(documentCodeqlQuerySchema.shape).sort()).toEqual(
        ['language', 'queryPath']
      );
    });

    it('should accept required queryPath and language', () => {
      const result = documentCodeqlQuerySchema.safeParse({
        language: 'go',
        queryPath: '/q.ql',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing queryPath', () => {
      const result = documentCodeqlQuerySchema.safeParse({ language: 'go' });
      expect(result.success).toBe(false);
    });

    it('should reject missing language', () => {
      const result = documentCodeqlQuerySchema.safeParse({ queryPath: '/q.ql' });
      expect(result.success).toBe(false);
    });

    it('should reject empty object (both required fields missing)', () => {
      const result = documentCodeqlQuerySchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it.each([...SUPPORTED_LANGUAGES])('should accept language "%s"', (lang) => {
      const result = documentCodeqlQuerySchema.safeParse({
        language: lang,
        queryPath: '/q.ql',
      });
      expect(result.success).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // qlLspIterativeDevelopmentSchema
  // -----------------------------------------------------------------------
  describe('qlLspIterativeDevelopmentSchema', () => {
    it('should expose exactly the expected parameter keys', () => {
      expect(Object.keys(qlLspIterativeDevelopmentSchema.shape).sort()).toEqual(
        ['language', 'queryPath', 'workspaceUri']
      );
    });

    it('should accept required language and queryPath', () => {
      const result = qlLspIterativeDevelopmentSchema.safeParse({
        language: 'ruby',
        queryPath: '/q.ql',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty object (language and queryPath required)', () => {
      const result = qlLspIterativeDevelopmentSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should accept all parameters', () => {
      const result = qlLspIterativeDevelopmentSchema.safeParse({
        language: 'ruby',
        queryPath: '/q.ql',
        workspaceUri: '/ws',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.workspaceUri).toBe('/ws');
      }
    });

    it('should leave workspaceUri as undefined when omitted', () => {
      const result = qlLspIterativeDevelopmentSchema.safeParse({
        language: 'ruby',
        queryPath: '/q.ql',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.workspaceUri).toBeUndefined();
      }
    });

    it('should reject missing language', () => {
      const result = qlLspIterativeDevelopmentSchema.safeParse({ queryPath: '/q.ql' });
      expect(result.success).toBe(false);
    });

    it('should reject missing queryPath', () => {
      const result = qlLspIterativeDevelopmentSchema.safeParse({ language: 'ruby' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid language', () => {
      const result = qlLspIterativeDevelopmentSchema.safeParse({ language: 'haskell' });
      expect(result.success).toBe(false);
    });

    it.each([...SUPPORTED_LANGUAGES])('should accept language "%s"', (lang) => {
      const result = qlLspIterativeDevelopmentSchema.safeParse({ language: lang, queryPath: '/q.ql' });
      expect(result.success).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Cross-schema: VS Code slash command string-input compatibility
  // -----------------------------------------------------------------------
  describe('VS Code slash command string-input compatibility', () => {
    it('should accept string language values as-is (already strings)', () => {
      // VS Code passes everything as strings — language enums must accept
      // the literal string values without coercion.
      const result = testDrivenDevelopmentSchema.safeParse({
        language: 'javascript',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty string for required language enum', () => {
      // If VS Code sends an empty string for the language input box
      const result = testDrivenDevelopmentSchema.safeParse({ language: '' });
      expect(result.success).toBe(false);
    });

    it('should accept empty string for optional string parameters', () => {
      // VS Code may send empty strings for optional text inputs
      const result = testDrivenDevelopmentSchema.safeParse({
        language: 'python',
        queryName: '',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.queryName).toBe('');
      }
    });

    it('should reject null for required string parameters', () => {
      const result = toolsQueryWorkflowSchema.safeParse({
        database: null,
        language: 'go',
      });
      expect(result.success).toBe(false);
    });

    it('should reject null for required language enum', () => {
      const result = toolsQueryWorkflowSchema.safeParse({
        database: '/db',
        language: null,
      });
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric string for numStages (NaN coercion)', () => {
      // z.coerce.number() on a non-numeric string produces NaN, which Zod
      // rejects because NaN is not a valid finite number.
      const result = workshopCreationWorkflowSchema.safeParse({
        queryPath: '/q.ql',
        language: 'java',
        numStages: 'abc',
      });
      expect(result.success).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // Cross-schema: required vs optional classification
  // -----------------------------------------------------------------------
  describe('Required vs optional parameter classification', () => {
    /**
     * Mapping of schema name → { required: string[], optional: string[] }
     * This serves as a living specification for the VS Code parameter dialog.
     */
    const schemaSpecs: Array<{
      name: string;

      schema: any;
      required: string[];
      optional: string[];
    }> = [
      {
        name: 'testDrivenDevelopmentSchema',
        schema: testDrivenDevelopmentSchema,
        required: ['language'],
        optional: ['queryName'],
      },
      {
        name: 'toolsQueryWorkflowSchema',
        schema: toolsQueryWorkflowSchema,
        required: ['database', 'language'],
        optional: ['sourceFiles', 'sourceFunction', 'targetFunction'],
      },
      {
        name: 'workshopCreationWorkflowSchema',
        schema: workshopCreationWorkflowSchema,
        required: ['language', 'queryPath'],
        optional: ['numStages', 'workshopName'],
      },
      {
        name: 'qlTddBasicSchema',
        schema: qlTddBasicSchema,
        required: ['language'],
        optional: ['queryName'],
      },
      {
        name: 'qlTddAdvancedSchema',
        schema: qlTddAdvancedSchema,
        required: ['language'],
        optional: ['database', 'queryName'],
      },
      {
        name: 'sarifRankSchema',
        schema: sarifRankSchema,
        required: ['sarifPath'],
        optional: ['queryId'],
      },
      {
        name: 'explainCodeqlQuerySchema',
        schema: explainCodeqlQuerySchema,
        required: ['language', 'queryPath'],
        optional: ['databasePath'],
      },
      {
        name: 'documentCodeqlQuerySchema',
        schema: documentCodeqlQuerySchema,
        required: ['language', 'queryPath'],
        optional: [],
      },
      {
        name: 'qlLspIterativeDevelopmentSchema',
        schema: qlLspIterativeDevelopmentSchema,
        required: ['language', 'queryPath'],
        optional: ['workspaceUri'],
      },
      {
        name: 'checkForDuplicatedCodeSchema',
        schema: checkForDuplicatedCodeSchema,
        required: ['queryPath'],
        optional: ['workspaceUri'],
      },
      {
        name: 'findOverlappingQueriesSchema',
        schema: findOverlappingQueriesSchema,
        required: ['language', 'queryDescription'],
        optional: ['packRoot'],
      },
    ];

    it.each(schemaSpecs)(
      '$name — should have exactly the expected required and optional keys',
      ({ schema, required, optional }) => {
        const allKeys = [...required, ...optional].sort();
        expect(Object.keys(schema.shape).sort()).toEqual(allKeys);
      }
    );

    it.each(schemaSpecs)(
      '$name — required fields must cause rejection when omitted individually',
      ({ schema, required, optional: _optional }) => {
        // Build a fully-valid object first
        const validObj: Record<string, string | number> = {};
        for (const key of required) {
          if (key === 'language') {
            validObj[key] = 'javascript';
          } else if (key === 'numStages') {
            validObj[key] = 5;
          } else {
            validObj[key] = `/test/${key}`;
          }
        }
        // Leave optional keys out — valid object with only required keys
        void _optional;

        // Verify the base valid object passes
        const baseResult = schema.safeParse(validObj);
        expect(baseResult.success).toBe(true);

        // Omit each required key one at a time and verify rejection
        for (const reqKey of required) {
          const partial = { ...validObj };
          delete partial[reqKey];
          const result = schema.safeParse(partial);
          expect(result.success).toBe(false);
        }
      }
    );

    it.each(schemaSpecs)(
      '$name — optional fields should be undefined when omitted from a valid parse',
      ({ schema, required, optional }) => {
        // Build object with only required fields
        const validObj: Record<string, string | number> = {};
        for (const key of required) {
          if (key === 'language') {
            validObj[key] = 'python';
          } else if (key === 'numStages') {
            validObj[key] = 3;
          } else {
            validObj[key] = `/test/${key}`;
          }
        }

        const result = schema.safeParse(validObj);
        expect(result.success).toBe(true);
        if (result.success) {
          for (const optKey of optional) {
            expect(result.data[optKey]).toBeUndefined();
          }
        }
      }
    );
  });

  // -----------------------------------------------------------------------
  // Cross-schema: every schema has a non-empty Zod description per field
  // -----------------------------------------------------------------------
  describe('Schema field descriptions (VS Code placeholder text)', () => {
    const allSchemas = {
      checkForDuplicatedCodeSchema,
      describeFalsePositivesSchema,
      documentCodeqlQuerySchema,
      explainCodeqlQuerySchema,
      findOverlappingQueriesSchema,
      qlLspIterativeDevelopmentSchema,
      qlTddAdvancedSchema,
      qlTddBasicSchema,
      sarifRankSchema,
      testDrivenDevelopmentSchema,
      toolsQueryWorkflowSchema,
      workshopCreationWorkflowSchema,
    };

    it.each(Object.entries(allSchemas))(
      '%s — every field should have a non-empty description',
      (_name, schema) => {
        for (const [key, zodType] of Object.entries(schema.shape)) {

          const desc = (zodType as any).description ?? (zodType as any)._def?.description;
          expect(
            desc,
            `Field "${key}" must have a description for VS Code placeholder text`
          ).toBeDefined();
          expect(typeof desc).toBe('string');
          expect(desc.length).toBeGreaterThan(0);
        }
      }
    );
  });

  // -----------------------------------------------------------------------
  // registerWorkflowPrompts
  // -----------------------------------------------------------------------
  describe('registerWorkflowPrompts', () => {
    let mockServer: McpServer;

    beforeEach(() => {
      vi.clearAllMocks();
      mockServer = { prompt: vi.fn() } as unknown as McpServer;
    });

    it('should register exactly WORKFLOW_PROMPT_NAMES.length prompts', () => {
      registerWorkflowPrompts(mockServer);
      expect(mockServer.prompt).toHaveBeenCalledTimes(WORKFLOW_PROMPT_NAMES.length);
    });

    it('should register every prompt listed in WORKFLOW_PROMPT_NAMES', () => {
      registerWorkflowPrompts(mockServer);

      const registeredNames = (mockServer.prompt as ReturnType<typeof vi.fn>)
        .mock.calls.map((call: unknown[]) => call[0] as string)
        .sort();

      expect(registeredNames).toEqual([...WORKFLOW_PROMPT_NAMES]);
    });

    it('should register each prompt with a description string', () => {
      registerWorkflowPrompts(mockServer);

      for (const call of (mockServer.prompt as ReturnType<typeof vi.fn>).mock.calls) {
        expect(typeof call[1]).toBe('string');
        expect((call[1] as string).length).toBeGreaterThan(0);
      }
    });

    it('should register each prompt with a non-empty schema object', () => {
      registerWorkflowPrompts(mockServer);

      for (const call of (mockServer.prompt as ReturnType<typeof vi.fn>).mock.calls) {
        const schema = call[2];
        expect(schema).toBeDefined();
        expect(typeof schema).toBe('object');
        // Every prompt should have at least one parameter key
        expect(Object.keys(schema).length).toBeGreaterThan(0);
      }
    });

    it('should register each prompt with an async handler function', () => {
      registerWorkflowPrompts(mockServer);

      for (const call of (mockServer.prompt as ReturnType<typeof vi.fn>).mock.calls) {
        expect(typeof call[3]).toBe('function');
      }
    });

    // -------------------------------------------------------------------
    // Schema-to-registration consistency: permissive shape keys match
    // -------------------------------------------------------------------
    describe('schema-to-registration consistency', () => {
      /** Map prompt name → exported strict schema .shape */
      const expectedSchemaShapes: Record<string, Record<string, unknown>> = {
        check_for_duplicated_code: checkForDuplicatedCodeSchema.shape,
        document_codeql_query: documentCodeqlQuerySchema.shape,
        explain_codeql_query: explainCodeqlQuerySchema.shape,
        find_overlapping_queries: findOverlappingQueriesSchema.shape,
        ql_lsp_iterative_development: qlLspIterativeDevelopmentSchema.shape,
        ql_tdd_advanced: qlTddAdvancedSchema.shape,
        ql_tdd_basic: qlTddBasicSchema.shape,
        run_query_and_summarize_false_positives: describeFalsePositivesSchema.shape,
        sarif_rank_false_positives: sarifRankSchema.shape,
        sarif_rank_true_positives: sarifRankSchema.shape,
        test_driven_development: testDrivenDevelopmentSchema.shape,
        tools_query_workflow: toolsQueryWorkflowSchema.shape,
        workshop_creation_workflow: workshopCreationWorkflowSchema.shape,
      };

      it.each(Object.entries(expectedSchemaShapes))(
        'prompt "%s" should register a permissive schema with matching keys',
        (promptName, expectedShape) => {
          registerWorkflowPrompts(mockServer);

          const calls = (mockServer.prompt as ReturnType<typeof vi.fn>).mock.calls;
          const match = calls.find((c: unknown[]) => c[0] === promptName);
          expect(match).toBeDefined();

          const registeredSchema = match![2] as Record<string, unknown>;
          // The permissive shape must have the same parameter keys
          expect(Object.keys(registeredSchema).sort()).toEqual(
            Object.keys(expectedShape).sort()
          );
        }
      );
    });

    // -------------------------------------------------------------------
    // Handler output structure validation (minimal args)
    // -------------------------------------------------------------------
    it('each handler should return { messages: [...] } with a user message', async () => {
      registerWorkflowPrompts(mockServer);

      // Build a minimal-valid args map for each prompt to invoke its handler.
      const minimalArgs: Record<string, Record<string, string>> = {
        check_for_duplicated_code: { queryPath: '/q.ql' },
        document_codeql_query: { language: 'java', queryPath: '/q.ql' },
        explain_codeql_query: { language: 'java', queryPath: '/q.ql' },
        find_overlapping_queries: { language: 'cpp', queryDescription: 'detect placement-new on non-trivial types' },
        ql_lsp_iterative_development: { language: 'ruby', queryPath: '/q.ql' },
        ql_tdd_advanced: { language: 'javascript' },
        ql_tdd_basic: { language: 'javascript' },
        run_query_and_summarize_false_positives: { queryPath: '/q.ql' },
        sarif_rank_false_positives: { sarifPath: '/results.sarif' },
        sarif_rank_true_positives: { sarifPath: '/results.sarif' },
        test_driven_development: { language: 'javascript' },
        tools_query_workflow: { database: '/db', language: 'javascript' },
        workshop_creation_workflow: { language: 'javascript', queryPath: '/q.ql' },
      };

      for (const call of (mockServer.prompt as ReturnType<typeof vi.fn>).mock.calls) {
        const promptName = call[0] as string;

        const handler = call[3] as PromptHandler;

        const result = await handler(minimalArgs[promptName] ?? {});

        expect(result).toHaveProperty('messages');
        expect(result.messages.length).toBeGreaterThan(0);
        expect(result.messages[0].role).toBe('user');
        expect(result.messages[0].content.type).toBe('text');
        expect(typeof result.messages[0].content.text).toBe('string');
        expect(result.messages[0].content.text.length).toBeGreaterThan(0);
      }
    });
  });

  // -----------------------------------------------------------------------
  // Handler output content: parameter values reflected in context
  // -----------------------------------------------------------------------
  describe('Handler output reflects user-supplied parameters', () => {
    let mockServer: McpServer;

    beforeEach(() => {
      vi.clearAllMocks();
      mockServer = { prompt: vi.fn() } as unknown as McpServer;
      registerWorkflowPrompts(mockServer);
    });

    it('test_driven_development handler should include language in context', async () => {
      const handler = getRegisteredHandler(mockServer, 'test_driven_development');
      const result: PromptResult = await handler({ language: 'python' });
      expect(result.messages[0].content.text).toContain('**Language**: python');
    });

    it('test_driven_development handler should include queryName when provided', async () => {
      const handler = getRegisteredHandler(mockServer, 'test_driven_development');
      const result: PromptResult = await handler({
        language: 'java',
        queryName: 'SqlInjection',
      });
      expect(result.messages[0].content.text).toContain('**Query Name**: SqlInjection');
    });

    it('test_driven_development handler should omit Query Name line when queryName not provided', async () => {
      const handler = getRegisteredHandler(mockServer, 'test_driven_development');
      const result: PromptResult = await handler({ language: 'go' });
      expect(result.messages[0].content.text).not.toContain('**Query Name**');
    });

    it('tools_query_workflow handler should include language and database', async () => {
      const handler = getRegisteredHandler(mockServer, 'tools_query_workflow');
      const result: PromptResult = await handler({
        database: 'path/to/mydb',
        language: 'cpp',
      });
      const text = result.messages[0].content.text;
      expect(text).toContain('**Language**: cpp');
      expect(text).toContain('mydb');
    });

    it('tools_query_workflow handler should include optional source parameters', async () => {
      const handler = getRegisteredHandler(mockServer, 'tools_query_workflow');
      const result: PromptResult = await handler({
        database: 'db',
        language: 'javascript',
        sourceFiles: 'app.js,index.js',
        sourceFunction: 'handleRequest',
        targetFunction: 'validateInput',
      });
      const text = result.messages[0].content.text;
      expect(text).toContain('**Source Files**: app.js,index.js');
      expect(text).toContain('**Source Function**: handleRequest');
      expect(text).toContain('**Target Function**: validateInput');
    });

    it('workshop_creation_workflow handler should derive workshop name from queryPath', async () => {
      const handler = getRegisteredHandler(mockServer, 'workshop_creation_workflow');
      const result: PromptResult = await handler({
        language: 'python',
        queryPath: 'path/to/SqlInjection.ql',
      });
      const text = result.messages[0].content.text;
      expect(text).toContain('**Workshop Name**: sqlinjection');
    });

    it('workshop_creation_workflow handler should prefer explicit workshopName', async () => {
      const handler = getRegisteredHandler(mockServer, 'workshop_creation_workflow');
      const result: PromptResult = await handler({
        language: 'javascript',
        queryPath: 'path/to/Xss.ql',
        workshopName: 'custom-workshop',
      });
      const text = result.messages[0].content.text;
      expect(text).toContain('**Workshop Name**: custom-workshop');
    });

    it('workshop_creation_workflow handler should show numStages when provided', async () => {
      const handler = getRegisteredHandler(mockServer, 'workshop_creation_workflow');
      const result: PromptResult = await handler({
        language: 'go',
        queryPath: 'q.ql',
        numStages: 7,
      });
      const text = result.messages[0].content.text;
      expect(text).toContain('**Suggested Stages**: 7');
    });

    it('workshop_creation_workflow handler should show auto-detect when numStages omitted', async () => {
      const handler = getRegisteredHandler(mockServer, 'workshop_creation_workflow');
      const result: PromptResult = await handler({
        language: 'ruby',
        queryPath: 'q.ql',
      });
      const text = result.messages[0].content.text;
      expect(text).toContain('4-8 (auto-detect based on query complexity)');
    });

    it('ql_tdd_basic handler should include context when parameters provided', async () => {
      const handler = getRegisteredHandler(mockServer, 'ql_tdd_basic');
      const result: PromptResult = await handler({
        language: 'csharp',
        queryName: 'WeakCrypto',
      });
      const text = result.messages[0].content.text;
      expect(text).toContain('**Language**: csharp');
      expect(text).toContain('**Query Name**: WeakCrypto');
    });

    it('ql_tdd_basic handler (createSafePromptHandler) should return inline validation error when called directly with missing parameters (defense-in-depth; SDK validates required fields before handler in real MCP usage)', async () => {
      const handler = getRegisteredHandler(mockServer, 'ql_tdd_basic');
      const result: PromptResult = await handler({});
      expect(result.messages[0].content.text).toContain('Invalid input');
    });

    it('ql_tdd_advanced handler should include database in context', async () => {
      const handler = getRegisteredHandler(mockServer, 'ql_tdd_advanced');
      const result: PromptResult = await handler({
        database: 'my/database',
        language: 'swift',
        queryName: 'TaintTrack',
      });
      const text = result.messages[0].content.text;
      expect(text).toContain('database');
      expect(text).toContain('**Language**: swift');
      expect(text).toContain('**Query Name**: TaintTrack');
    });

    it('ql_tdd_advanced handler (createSafePromptHandler) should return inline validation error when called directly with missing parameters (defense-in-depth; SDK validates required fields before handler in real MCP usage)', async () => {
      const handler = getRegisteredHandler(mockServer, 'ql_tdd_advanced');
      const result: PromptResult = await handler({});
      expect(result.messages[0].content.text).toContain('Invalid input');
    });

    it('sarif_rank_false_positives handler should include queryId and sarifPath', async () => {
      const handler = getRegisteredHandler(mockServer, 'sarif_rank_false_positives');
      const result: PromptResult = await handler({
        queryId: 'js/code-injection',
        sarifPath: 'results/scan.sarif',
      });
      const text = result.messages[0].content.text;
      expect(text).toContain('**Query ID**: js/code-injection');
      expect(text).toContain('results/scan.sarif');
    });

    it('sarif_rank_true_positives handler should include queryId and sarifPath', async () => {
      const handler = getRegisteredHandler(mockServer, 'sarif_rank_true_positives');
      const result: PromptResult = await handler({
        queryId: 'py/command-injection',
        sarifPath: 'out.sarif',
      });
      const text = result.messages[0].content.text;
      expect(text).toContain('**Query ID**: py/command-injection');
      expect(text).toContain('out.sarif');
    });

    it('sarif_rank handlers (createSafePromptHandler) should return inline error when called directly with no parameters (defense-in-depth; SDK validates required sarifPath before handler in real MCP usage)', async () => {
      for (const name of ['sarif_rank_false_positives', 'sarif_rank_true_positives']) {
        const handler = getRegisteredHandler(mockServer, name);
        const result: PromptResult = await handler({});
        expect(result.messages[0].content.text).toContain('Invalid input');
      }
    });

    it('run_query_and_summarize_false_positives handler should include queryPath', async () => {
      const handler = getRegisteredHandler(mockServer, 'run_query_and_summarize_false_positives');
      const result: PromptResult = await handler({
        queryPath: 'queries/SqlInjection.ql',
      });
      const text = result.messages[0].content.text;
      expect(text).toContain('queries/SqlInjection.ql');
    });

    it('run_query_and_summarize_false_positives handler (createSafePromptHandler) should return inline error when called directly with no parameters (defense-in-depth; SDK validates required queryPath before handler in real MCP usage)', async () => {
      const handler = getRegisteredHandler(mockServer, 'run_query_and_summarize_false_positives');
      const result: PromptResult = await handler({});
      expect(result.messages[0].content.text).toContain('Invalid input');
    });

    it('explain_codeql_query handler should include all params when provided', async () => {
      const handler = getRegisteredHandler(mockServer, 'explain_codeql_query');
      const result: PromptResult = await handler({
        databasePath: 'db/path',
        language: 'python',
        queryPath: 'queries/Xss.ql',
      });
      const text = result.messages[0].content.text;
      expect(text).toContain('queries/Xss.ql');
      expect(text).toContain('**Language**: python');
      expect(text).toContain('db/path');
    });

    it('explain_codeql_query handler should omit Database Path when not provided', async () => {
      const handler = getRegisteredHandler(mockServer, 'explain_codeql_query');
      const result: PromptResult = await handler({
        language: 'java',
        queryPath: 'q.ql',
      });
      const text = result.messages[0].content.text;
      expect(text).not.toContain('**Database Path**');
    });

    it('document_codeql_query handler should include queryPath and language', async () => {
      const handler = getRegisteredHandler(mockServer, 'document_codeql_query');
      const result: PromptResult = await handler({
        language: 'go',
        queryPath: 'queries/SqlInjection.ql',
      });
      const text = result.messages[0].content.text;
      expect(text).toContain('queries/SqlInjection.ql');
      expect(text).toContain('**Language**: go');
    });

    it('ql_lsp_iterative_development handler should include all params', async () => {
      const handler = getRegisteredHandler(mockServer, 'ql_lsp_iterative_development');
      const result: PromptResult = await handler({
        language: 'ruby',
        queryPath: 'my/query.ql',
        workspaceUri: 'pack/root',
      });
      const text = result.messages[0].content.text;
      expect(text).toContain('**Language**: ruby');
      expect(text).toContain('my/query.ql');
      expect(text).toContain('pack/root');
    });

    it('ql_lsp_iterative_development handler should omit workspaceUri when absent', async () => {
      const handler = getRegisteredHandler(mockServer, 'ql_lsp_iterative_development');
      const result: PromptResult = await handler({
        language: 'ruby',
        queryPath: 'q.ql',
      });
      const text = result.messages[0].content.text;
      expect(text).toContain('**Language**: ruby');
      expect(text).toContain('**Query Path**');
      expect(text).not.toContain('**Workspace URI**');
    });
  });

  // -----------------------------------------------------------------------
  // buildToolsQueryContext
  // -----------------------------------------------------------------------
  describe('buildToolsQueryContext', () => {
    it('should build minimal context with required fields only', () => {
      const result = buildToolsQueryContext('javascript', '/path/to/db');

      expect(result).toContain('## Your Context');
      expect(result).toContain('**Language**: javascript');
      expect(result).toContain('**Database**: /path/to/db');
      expect(result).toContain('## Recommended Next Steps');
    });

    it('should include source files when provided', () => {
      const result = buildToolsQueryContext(
        'python',
        '/path/to/db',
        'main.py,utils.py'
      );

      expect(result).toContain('**Source Files**: main.py,utils.py');
      expect(result).toContain('PrintAST');
      expect(result).toContain('sourceFiles="main.py,utils.py"');
    });

    it('should include source function when provided', () => {
      const result = buildToolsQueryContext(
        'java',
        '/path/to/db',
        undefined,
        'processData'
      );

      expect(result).toContain('**Source Function**: processData');
      expect(result).toContain('PrintCFG');
      expect(result).toContain('CallGraphFrom');
      expect(result).toContain('sourceFunction="processData"');
    });

    it('should include target function when provided', () => {
      const result = buildToolsQueryContext(
        'go',
        '/path/to/db',
        undefined,
        undefined,
        'validate'
      );

      expect(result).toContain('**Target Function**: validate');
      expect(result).toContain('CallGraphTo');
      expect(result).toContain('targetFunction="validate"');
    });

    it('should include all optional parameters when provided', () => {
      const result = buildToolsQueryContext(
        'cpp',
        '/path/to/db',
        'main.cpp',
        'init',
        'cleanup'
      );

      expect(result).toContain('**Source Files**: main.cpp');
      expect(result).toContain('**Source Function**: init');
      expect(result).toContain('**Target Function**: cleanup');
    });

    it('should provide generic guidance when optional parameters not provided', () => {
      const result = buildToolsQueryContext('ruby', '/path/to/db');

      expect(result).toContain('Identify source files to analyze');
      expect(result).toContain('Identify key functions for CFG');
      expect(result).toContain('Identify target functions');
    });

    it('should not contain optional field labels when those fields are omitted', () => {
      const result = buildToolsQueryContext('actions', '/db');
      expect(result).not.toContain('**Source Files**');
      expect(result).not.toContain('**Source Function**');
      expect(result).not.toContain('**Target Function**');
    });
  });

  // -----------------------------------------------------------------------
  // buildWorkshopContext
  // -----------------------------------------------------------------------
  describe('buildWorkshopContext', () => {
    it('should build context with required fields', () => {
      const result = buildWorkshopContext(
        'path/to/MyQuery.ql',
        'javascript',
        'my-workshop'
      );

      expect(result).toContain('## Your Workshop Context');
      expect(result).toContain('**Target Query**: path/to/MyQuery.ql');
      expect(result).toContain('**Language**: javascript');
      expect(result).toContain('**Workshop Name**: my-workshop');
    });

    it('should show auto-detect suggestion when numStages not provided', () => {
      const result = buildWorkshopContext(
        'query.ql',
        'python',
        'python-workshop'
      );

      expect(result).toContain(
        '**Suggested Stages**: 4-8 (auto-detect based on query complexity)'
      );
    });

    it('should show specific stage count when numStages provided', () => {
      const result = buildWorkshopContext(
        'query.ql',
        'java',
        'java-workshop',
        6
      );

      expect(result).toContain('**Suggested Stages**: 6');
    });

    it('should include immediate actions guidance', () => {
      const result = buildWorkshopContext(
        'path/to/MyQuery.ql',
        'go',
        'go-workshop'
      );

      expect(result).toContain('## Immediate Actions');
      expect(result).toContain('find_codeql_query_files');
      expect(result).toContain('explain_codeql_query');
      expect(result).toContain('codeql_test_run');
    });

    it('should include query path in find command', () => {
      const result = buildWorkshopContext(
        'experimental/Security/MyQuery.ql',
        'csharp',
        'csharp-workshop'
      );

      expect(result).toContain(
        'queryPath="experimental/Security/MyQuery.ql"'
      );
    });

    it('should include language in explain command', () => {
      const result = buildWorkshopContext(
        'query.ql',
        'swift',
        'swift-workshop'
      );

      expect(result).toContain('language="swift"');
    });
  });

  // -----------------------------------------------------------------------
  // toPermissiveShape
  // -----------------------------------------------------------------------
  describe('toPermissiveShape', () => {
    it('should make required z.enum() a required z.string()', () => {
      const shape = {
        language: z.enum(['javascript', 'python']).describe('The language'),
      };
      const permissive = toPermissiveShape(shape);

      const schema = z.object(permissive as Record<string, z.ZodTypeAny>);
      // Should accept any string
      expect(schema.safeParse({ language: 'rust' }).success).toBe(true);
      expect(schema.safeParse({ language: 'javascript' }).success).toBe(true);
      // Still required — missing field should fail
      expect(schema.safeParse({}).success).toBe(false);
    });

    it('should preserve descriptions on enum fields', () => {
      const shape = {
        language: z.enum(['javascript']).describe('My description'),
      };
      const permissive = toPermissiveShape(shape);
      expect(permissive.language.description).toBe('My description');
    });

    it('should replace optional z.enum() with optional z.string()', () => {
      const shape = {
        language: z.enum(['javascript', 'python']).optional().describe('desc'),
      };
      const permissive = toPermissiveShape(shape);

      const schema = z.object(permissive as Record<string, z.ZodTypeAny>);
      // Should accept any string
      expect(schema.safeParse({ language: 'rust' }).success).toBe(true);
      // Should accept missing field
      expect(schema.safeParse({}).success).toBe(true);
    });

    it('should pass through non-enum types unchanged', () => {
      const original = z.string().describe('A path');
      const shape = { queryPath: original };
      const permissive = toPermissiveShape(shape);
      expect(permissive.queryPath).toBe(original);
    });

    it('should pass through z.coerce.number() unchanged', () => {
      const original = z.coerce.number().optional().describe('Stages');
      const shape = { numStages: original };
      const permissive = toPermissiveShape(shape);
      expect(permissive.numStages).toBe(original);
    });

    it('should preserve all keys from the original shape', () => {
      const permissive = toPermissiveShape(explainCodeqlQuerySchema.shape);
      expect(Object.keys(permissive).sort()).toEqual(
        Object.keys(explainCodeqlQuerySchema.shape).sort()
      );
    });
  });

  // -----------------------------------------------------------------------
  // markdownInlineCode
  // -----------------------------------------------------------------------
  describe('markdownInlineCode', () => {
    it('should wrap plain text in single backticks', () => {
      expect(markdownInlineCode('foo')).toBe('`foo`');
    });

    it('should use double backticks when value contains a single backtick', () => {
      expect(markdownInlineCode('a`b')).toBe('``a`b``');
    });

    it('should use triple backticks when value contains a double backtick run', () => {
      expect(markdownInlineCode('a``b')).toBe('```a``b```');
    });

    it('should replace CRLF and CR with spaces so the output stays on one line', () => {
      expect(markdownInlineCode('a\r\nb')).toBe('`a b`');
      expect(markdownInlineCode('a\rb')).toBe('`a b`');
      expect(markdownInlineCode('a\nb')).toBe('`a b`');
    });

    it('should not mutate a value that contains no backticks', () => {
      const input = '/path/to/my-query.ql';
      expect(markdownInlineCode(input)).toBe(`\`${input}\``);
    });

    it('should handle a value that is only backticks', () => {
      const result = markdownInlineCode('``');
      // fence must be longer than the run of 2, so 3 backticks
      expect(result).toBe('```' + '``' + '```');
    });
  });

  // -----------------------------------------------------------------------
  // formatValidationError
  // -----------------------------------------------------------------------
  describe('formatValidationError', () => {
    it('should format invalid_enum_value with available options', () => {
      const result = testDrivenDevelopmentSchema.safeParse({ language: 'rust' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const msg = formatValidationError('test_driven_development', result.error);
        expect(msg).toContain('Invalid input');
        expect(msg).toContain('test_driven_development');
        expect(msg).toContain('`language`');
        expect(msg).toContain('rust');
        expect(msg).toContain('javascript');
        expect(msg).toContain('try again');
      }
    });

    it('should format missing required field errors', () => {
      const result = explainCodeqlQuerySchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        const msg = formatValidationError('explain_codeql_query', result.error);
        expect(msg).toContain('Invalid input');
        expect(msg).toContain('explain_codeql_query');
      }
    });

    it('should include corrective guidance', () => {
      const result = testDrivenDevelopmentSchema.safeParse({ language: 'invalid' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const msg = formatValidationError('test_prompt', result.error);
        expect(msg).toContain('correct the input');
      }
    });

    it('should produce well-formed markdown when the received value contains backticks', () => {
      // Construct a ZodError for an enum field whose received value has backticks.
      const schema = z.object({ mode: z.enum(['a', 'b']) });
      const result = schema.safeParse({ mode: 'val`ue' });
      expect(result.success).toBe(false);
      if (!result.success) {
        const msg = formatValidationError('test_prompt', result.error);
        // The raw backtick must not appear inside a single-backtick code span —
        // markdownInlineCode uses a longer fence so the value is fully enclosed.
        // The message must still contain the original value text.
        expect(msg).toContain('val`ue');
        // The fence wrapping the received value must use at least double backticks.
        expect(msg).toContain('``val`ue``');
      }
    });
  });

  // -----------------------------------------------------------------------
  // createSafePromptHandler
  // -----------------------------------------------------------------------
  describe('createSafePromptHandler', () => {
    it('should call the inner handler when validation passes', async () => {
      const innerHandler = vi.fn().mockResolvedValue({
        messages: [{ role: 'user', content: { type: 'text', text: 'ok' } }],
      });

      const safe = createSafePromptHandler(
        'test_driven_development',
        testDrivenDevelopmentSchema,
        innerHandler,
      );

      const result = await safe({ language: 'javascript' });
      expect(innerHandler).toHaveBeenCalledWith({ language: 'javascript' });
      expect(result.messages[0].content.text).toBe('ok');
    });

    it('should return inline error when validation fails (invalid enum)', async () => {
      const innerHandler = vi.fn();

      const safe = createSafePromptHandler(
        'test_driven_development',
        testDrivenDevelopmentSchema,
        innerHandler,
      );

      const result = await safe({ language: 'rust' });
      // Handler should NOT be called
      expect(innerHandler).not.toHaveBeenCalled();
      // Should return a message, not throw
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content.text).toContain('Invalid input');
      expect(result.messages[0].content.text).toContain('rust');
    });

    it('should return inline error when required fields are missing', async () => {
      const innerHandler = vi.fn();

      const safe = createSafePromptHandler(
        'explain_codeql_query',
        explainCodeqlQuerySchema,
        innerHandler,
      );

      const result = await safe({});
      expect(innerHandler).not.toHaveBeenCalled();
      expect(result.messages[0].content.text).toContain('Invalid input');
    });

    it('should catch handler exceptions and return inline error', async () => {
      const innerHandler = vi.fn().mockRejectedValue(
        new Error('Template not found'),
      );

      const safe = createSafePromptHandler(
        'test_driven_development',
        testDrivenDevelopmentSchema,
        innerHandler,
      );

      const result = await safe({ language: 'javascript' });
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content.text).toContain('Error');
      expect(result.messages[0].content.text).toContain('Template not found');
    });

    it('should accept valid optional fields', async () => {
      const innerHandler = vi.fn().mockResolvedValue({
        messages: [{ role: 'user', content: { type: 'text', text: 'ok' } }],
      });

      // Use a schema where all fields are optional
      const allOptionalSchema = z.object({
        name: z.string().optional(),
      });

      const safe = createSafePromptHandler(
        'test_prompt',
        allOptionalSchema,
        innerHandler,
      );

      // All optional — empty args should pass
      const result = await safe({});
      expect(innerHandler).toHaveBeenCalled();
      expect(result.messages[0].content.text).toBe('ok');
    });
  });

  // -----------------------------------------------------------------------
  // resolvePromptFilePath
  // -----------------------------------------------------------------------
  describe('resolvePromptFilePath', () => {
    let testDir: string;

    beforeEach(() => {
      testDir = createTestTempDir('prompt-path-test');
    });

    afterEach(() => {
      cleanupTestTempDir(testDir);
    });

    it('should resolve an existing absolute path and return it unchanged', async () => {
      const filePath = join(testDir, 'query.ql');
      writeFileSync(filePath, 'select 1');

      const result = await resolvePromptFilePath(filePath);
      expect(result.resolvedPath).toBe(filePath);
      expect(result.warning).toBeUndefined();
    });

    it('should resolve a relative path against the workspace root', async () => {
      // Create a file relative to testDir
      const relPath = 'sub/query.ql';
      mkdirSync(join(testDir, 'sub'), { recursive: true });
      writeFileSync(join(testDir, 'sub', 'query.ql'), 'select 1');

      const result = await resolvePromptFilePath(relPath, testDir);
      expect(result.resolvedPath).toBe(join(testDir, 'sub', 'query.ql'));
      expect(result.warning).toBeUndefined();
    });

    it('should return a warning when the resolved path does not exist', async () => {
      const result = await resolvePromptFilePath('nonexistent/path/query.ql', testDir);
      expect(result.resolvedPath).toBe(join(testDir, 'nonexistent', 'path', 'query.ql'));
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('does not exist');
    });

    it('should return a warning and block path traversal attempts', async () => {
      const result = await resolvePromptFilePath('../../../etc/passwd', testDir);
      expect(result.blocked).toBe(true);
      expect(result.resolvedPath).toBe('');
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('resolves outside the workspace root');
    });

    it('should not flag filenames containing consecutive dots as traversal', async () => {
      const filePath = 'my..query.ql';
      writeFileSync(join(testDir, filePath), 'select 1');

      const result = await resolvePromptFilePath(filePath, testDir);
      expect(result.resolvedPath).toBe(join(testDir, filePath));
      expect(result.warning).toBeUndefined();
    });

    it('should resolve invalid paths relative to the workspace root', async () => {
      const result = await resolvePromptFilePath('nonexistent.ql', testDir);
      expect(result.resolvedPath).toBe(join(testDir, 'nonexistent.ql'));
    });

    it('should handle an empty string path with a warning', async () => {
      const result = await resolvePromptFilePath('', testDir);
      expect(result.warning).toBeDefined();
    });

    it('should produce well-formed markdown when the path contains backticks', async () => {
      // A path that contains a backtick must not corrupt the warning's inline code span.
      const filePath = 'bad`name.ql';
      const result = await resolvePromptFilePath(filePath, testDir);
      expect(result.warning).toBeDefined();
      // The raw backtick must be preserved and the fence must be at least double.
      expect(result.warning).toContain('bad`name.ql');
      expect(result.warning).toContain('``bad`name.ql``');
    });
  });

  // -----------------------------------------------------------------------
  // Handler path resolution: resolved paths appear in handler output
  // -----------------------------------------------------------------------
  describe('Handler path resolution and error handling', () => {
    let mockServer: McpServer;

    beforeEach(() => {
      vi.clearAllMocks();
      mockServer = { prompt: vi.fn() } as unknown as McpServer;
      registerWorkflowPrompts(mockServer);
    });

    it('explain_codeql_query handler should include warning for nonexistent queryPath', async () => {
      const handler = getRegisteredHandler(mockServer, 'explain_codeql_query');
      const result: PromptResult = await handler({
        databasePath: 'db',
        language: 'javascript',
        queryPath: 'nonexistent/query.ql',
      });
      const text = result.messages[0].content.text;
      expect(text).toContain('does not exist');
      // Verify the warning mentions the provided queryPath value
      expect(text).toContain('nonexistent/query.ql');
    });

    it('document_codeql_query handler should include warning for nonexistent queryPath', async () => {
      const handler = getRegisteredHandler(mockServer, 'document_codeql_query');
      const result: PromptResult = await handler({
        language: 'java',
        queryPath: 'nonexistent/nowhere/query.ql',
      });
      const text = result.messages[0].content.text;
      expect(text).toContain('does not exist');
      expect(text).toContain('nonexistent/nowhere/query.ql');
    });

    it('workshop_creation_workflow handler should include warning for nonexistent queryPath', async () => {
      const handler = getRegisteredHandler(mockServer, 'workshop_creation_workflow');
      const result: PromptResult = await handler({
        language: 'python',
        queryPath: 'missing/Workshop.ql',
      });
      const text = result.messages[0].content.text;
      expect(text).toContain('does not exist');
      expect(text).toContain('missing/Workshop.ql');
    });

    // Only the `database` parameter is a file path — sourceFiles, sourceFunction,
    // and targetFunction are plain string identifiers (not paths on disk).
    it('tools_query_workflow handler should include warning for nonexistent database path', async () => {
      const handler = getRegisteredHandler(mockServer, 'tools_query_workflow');
      const result: PromptResult = await handler({
        language: 'go',
        database: 'nonexistent/db',
      });
      const text = result.messages[0].content.text;
      expect(text).toContain('does not exist');
      expect(text).toContain('nonexistent/db');
    });

    // -----------------------------------------------------------------
    // Invalid argument handling (issue #143): inline errors, not throws
    // -----------------------------------------------------------------
    it('explain_codeql_query handler should return inline error for invalid language', async () => {
      const handler = getRegisteredHandler(mockServer, 'explain_codeql_query');
      const result: PromptResult = await handler({
        language: 'rust',
        queryPath: '/q.ql',
      });
      const text = result.messages[0].content.text;
      expect(text).toContain('Invalid input');
      expect(text).toContain('rust');
      expect(text).toContain('javascript');
    });

    it('test_driven_development handler should return inline error for invalid language', async () => {
      const handler = getRegisteredHandler(mockServer, 'test_driven_development');
      const result: PromptResult = await handler({
        language: 'PYTHON',
      });
      const text = result.messages[0].content.text;
      expect(text).toContain('Invalid input');
      expect(text).toContain('PYTHON');
    });

    it('document_codeql_query handler should return inline error when language is missing', async () => {
      const handler = getRegisteredHandler(mockServer, 'document_codeql_query');
      const result: PromptResult = await handler({
        queryPath: '/q.ql',
      });
      const text = result.messages[0].content.text;
      expect(text).toContain('Invalid input');
    });
  });
});