/**
 * Tests for workflow prompts context builders, schema validation,
 * and registerWorkflowPrompts registration consistency.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  buildToolsQueryContext,
  buildWorkshopContext,
  documentCodeqlQuerySchema,
  explainCodeqlQuerySchema,
  qlLspIterativeDevelopmentSchema,
  qlTddAdvancedSchema,
  qlTddBasicSchema,
  registerWorkflowPrompts,
  sarifRankSchema,
  SUPPORTED_LANGUAGES,
  testDrivenDevelopmentSchema,
  toolsQueryWorkflowSchema,
  WORKFLOW_PROMPT_NAMES,
  workshopCreationWorkflowSchema,
} from '../../../src/prompts/workflow-prompts';

// ---------------------------------------------------------------------------
// Mock prompt-loader so tests never read .prompt.md files from disk.
// ---------------------------------------------------------------------------
vi.mock('../../../src/prompts/prompt-loader', () => ({
  loadPromptTemplate: vi.fn(() => '# mock template\n'),
  processPromptTemplate: vi.fn(() => '# processed mock template\n'),
}));

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
    it('should contain 10 prompt names', () => {
      expect(WORKFLOW_PROMPT_NAMES).toHaveLength(10);
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

    it('should reject missing language', () => {
      const result = testDrivenDevelopmentSchema.safeParse({ queryName: 'Q' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid language', () => {
      const result = testDrivenDevelopmentSchema.safeParse({ language: 'rust' });
      expect(result.success).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // toolsQueryWorkflowSchema
  // -----------------------------------------------------------------------
  describe('toolsQueryWorkflowSchema', () => {
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
  });

  // -----------------------------------------------------------------------
  // workshopCreationWorkflowSchema
  // -----------------------------------------------------------------------
  describe('workshopCreationWorkflowSchema', () => {
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

    it('should support all SUPPORTED_LANGUAGES', () => {
      for (const lang of SUPPORTED_LANGUAGES) {
        const result = workshopCreationWorkflowSchema.safeParse({
          queryPath: '/path/to/query.ql',
          language: lang
        });

        expect(result.success).toBe(true);
      }
    });
  });

  // -----------------------------------------------------------------------
  // qlTddBasicSchema
  // -----------------------------------------------------------------------
  describe('qlTddBasicSchema', () => {
    it('should accept empty object (all optional)', () => {
      const result = qlTddBasicSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept language only', () => {
      const result = qlTddBasicSchema.safeParse({ language: 'java' });
      expect(result.success).toBe(true);
    });

    it('should accept queryName only', () => {
      const result = qlTddBasicSchema.safeParse({ queryName: 'TestQ' });
      expect(result.success).toBe(true);
    });

    it('should reject invalid language', () => {
      const result = qlTddBasicSchema.safeParse({ language: 'fortran' });
      expect(result.success).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // qlTddAdvancedSchema
  // -----------------------------------------------------------------------
  describe('qlTddAdvancedSchema', () => {
    it('should accept empty object (all optional)', () => {
      const result = qlTddAdvancedSchema.safeParse({});
      expect(result.success).toBe(true);
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

    it('should reject invalid language', () => {
      const result = qlTddAdvancedSchema.safeParse({ language: 'sql' });
      expect(result.success).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // sarifRankSchema
  // -----------------------------------------------------------------------
  describe('sarifRankSchema', () => {
    it('should accept empty object (all optional)', () => {
      const result = sarifRankSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept queryId only', () => {
      const result = sarifRankSchema.safeParse({ queryId: 'js/xss' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.queryId).toBe('js/xss');
      }
    });

    it('should accept sarifPath only', () => {
      const result = sarifRankSchema.safeParse({ sarifPath: '/results.sarif' });
      expect(result.success).toBe(true);
    });

    it('should accept both parameters', () => {
      const result = sarifRankSchema.safeParse({
        queryId: 'py/sql-injection',
        sarifPath: '/path.sarif',
      });
      expect(result.success).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // explainCodeqlQuerySchema
  // -----------------------------------------------------------------------
  describe('explainCodeqlQuerySchema', () => {
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

    it('should reject missing queryPath', () => {
      const result = explainCodeqlQuerySchema.safeParse({ language: 'java' });
      expect(result.success).toBe(false);
    });

    it('should reject missing language', () => {
      const result = explainCodeqlQuerySchema.safeParse({ queryPath: '/q.ql' });
      expect(result.success).toBe(false);
    });
  });

  // -----------------------------------------------------------------------
  // documentCodeqlQuerySchema
  // -----------------------------------------------------------------------
  describe('documentCodeqlQuerySchema', () => {
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
  });

  // -----------------------------------------------------------------------
  // qlLspIterativeDevelopmentSchema
  // -----------------------------------------------------------------------
  describe('qlLspIterativeDevelopmentSchema', () => {
    it('should accept empty object (all optional)', () => {
      const result = qlLspIterativeDevelopmentSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept all parameters', () => {
      const result = qlLspIterativeDevelopmentSchema.safeParse({
        language: 'ruby',
        queryPath: '/q.ql',
        workspaceUri: 'file:///ws',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.workspaceUri).toBe('file:///ws');
      }
    });

    it('should reject invalid language', () => {
      const result = qlLspIterativeDevelopmentSchema.safeParse({ language: 'haskell' });
      expect(result.success).toBe(false);
    });
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

    it('each handler should return { messages: [...] } with a user message', async () => {
      registerWorkflowPrompts(mockServer);

      // Build a minimal-valid args map for each prompt to invoke its handler.
      const minimalArgs: Record<string, Record<string, string>> = {
        document_codeql_query: { language: 'java', queryPath: '/q.ql' },
        explain_codeql_query: { language: 'java', queryPath: '/q.ql' },
        ql_lsp_iterative_development: {},
        ql_tdd_advanced: {},
        ql_tdd_basic: {},
        sarif_rank_false_positives: {},
        sarif_rank_true_positives: {},
        test_driven_development: { language: 'javascript' },
        tools_query_workflow: { database: '/db', language: 'javascript' },
        workshop_creation_workflow: { language: 'javascript', queryPath: '/q.ql' },
      };

      for (const call of (mockServer.prompt as ReturnType<typeof vi.fn>).mock.calls) {
        const promptName = call[0] as string;
         
        const handler = call[3] as any;

        const result = (await handler(minimalArgs[promptName] ?? {})) as {
          messages: Array<{ content: { text: string; type: string }; role: string }>;
        };

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
  });
});