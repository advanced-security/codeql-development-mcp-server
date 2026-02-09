/**
 * MCP Server workflow prompts for CodeQL development
 *
 * All prompt content is loaded from .prompt.md files in this directory.
 * This file only handles prompt registration and parameter processing.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { basename } from 'path';
import { loadPromptTemplate, processPromptTemplate } from './prompt-loader';
import { logger } from '../utils/logger';

/** Supported CodeQL languages for tools queries */
export const SUPPORTED_LANGUAGES = [
  'actions',
  'cpp',
  'csharp',
  'go',
  'java',
  'javascript',
  'python',
  'ruby',
  'swift'
] as const;

// ────────────────────────────────────────────────────────────────────────────
// Exported parameter schemas for each workflow prompt.
//
// Extracting the schemas makes it easy to unit-test required vs optional
// validation independently of the MCP server registration.
//
// **Convention for VS Code UX consistency**:
// Every prompt MUST expose at least one parameter – even if all parameters
// are optional – so that VS Code always displays the parameter input dialog
// and allows the user to customize the prompt before Copilot Chat processes
// it.  The `description` field on each Zod schema member doubles as the
// placeholder text shown in the VS Code input box.
// ────────────────────────────────────────────────────────────────────────────

/**
 * Schema for test_driven_development prompt parameters.
 *
 * - `language` is **required** – the TDD workflow is language-specific.
 * - `queryName` is optional – defaults to '[QueryName]' if omitted.
 */
export const testDrivenDevelopmentSchema = z.object({
  language: z
    .enum(SUPPORTED_LANGUAGES)
    .describe('Programming language for the query'),
  queryName: z
    .string()
    .optional()
    .describe('Name of the query to develop'),
});

/**
 * Schema for tools_query_workflow prompt parameters.
 *
 * - `language` and `database` are **required**.
 * - `sourceFiles`, `sourceFunction`, `targetFunction` are optional context.
 */
export const toolsQueryWorkflowSchema = z.object({
  database: z
    .string()
    .describe('Path to the CodeQL database'),
  language: z
    .enum(SUPPORTED_LANGUAGES)
    .describe('Programming language for the tools queries'),
  sourceFiles: z
    .string()
    .optional()
    .describe('Comma-separated source file names for PrintAST (e.g., "main.js,utils.js")'),
  sourceFunction: z
    .string()
    .optional()
    .describe('Function name for PrintCFG or CallGraphFrom (e.g., "processData")'),
  targetFunction: z
    .string()
    .optional()
    .describe('Function name for CallGraphTo (e.g., "validate")'),
});

/**
 * Schema for workshop_creation_workflow prompt parameters.
 * Uses z.coerce.number() for numStages to handle string inputs from VSCode slash commands.
 *
 * - `queryPath` and `language` are **required**.
 * - `workshopName` and `numStages` are optional.
 */
export const workshopCreationWorkflowSchema = z.object({
  queryPath: z
    .string()
    .describe('Path to the production-grade CodeQL query (.ql or .qlref)'),
  language: z
    .enum(SUPPORTED_LANGUAGES)
    .describe('Programming language of the query'),
  workshopName: z
    .string()
    .optional()
    .describe('Name for the workshop directory'),
  numStages: z
    .coerce.number()
    .optional()
    .describe('Number of incremental stages (default: 4-8)'),
});

/**
 * Schema for ql_tdd_basic prompt parameters.
 *
 * All parameters are optional – but at least one should be present so the
 * VS Code quick-pick dialog appears.
 */
export const qlTddBasicSchema = z.object({
  language: z
    .enum(SUPPORTED_LANGUAGES)
    .optional()
    .describe('Programming language for the query (optional)'),
  queryName: z
    .string()
    .optional()
    .describe('Name of the query to develop'),
});

/**
 * Schema for ql_tdd_advanced prompt parameters.
 *
 * All parameters are optional.
 */
export const qlTddAdvancedSchema = z.object({
  database: z
    .string()
    .optional()
    .describe('Path to the CodeQL database for analysis'),
  language: z
    .enum(SUPPORTED_LANGUAGES)
    .optional()
    .describe('Programming language for the query (optional)'),
  queryName: z
    .string()
    .optional()
    .describe('Name of the query to develop'),
});

/**
 * Schema for sarif_rank_false_positives / sarif_rank_true_positives.
 *
 * Both parameters are optional.
 */
export const sarifRankSchema = z.object({
  queryId: z
    .string()
    .optional()
    .describe('CodeQL query/rule identifier'),
  sarifPath: z
    .string()
    .optional()
    .describe('Path to the SARIF file to analyze'),
});

/**
 * Schema for explain_codeql_query prompt parameters.
 *
 * - `queryPath` and `language` are **required**.
 * - `databasePath` is optional.
 */
export const explainCodeqlQuerySchema = z.object({
  databasePath: z
    .string()
    .optional()
    .describe('Optional path to a real CodeQL database for profiling'),
  language: z
    .enum(SUPPORTED_LANGUAGES)
    .describe('Programming language of the query'),
  queryPath: z
    .string()
    .describe('Path to the CodeQL query file (.ql or .qlref)'),
});

/**
 * Schema for document_codeql_query prompt parameters.
 *
 * - `queryPath` and `language` are **required**.
 */
export const documentCodeqlQuerySchema = z.object({
  language: z
    .enum(SUPPORTED_LANGUAGES)
    .describe('Programming language of the query'),
  queryPath: z
    .string()
    .describe('Path to the CodeQL query file (.ql or .qlref)'),
});

/**
 * Schema for ql_lsp_iterative_development prompt parameters.
 *
 * All parameters are optional.
 */
export const qlLspIterativeDevelopmentSchema = z.object({
  language: z
    .enum(SUPPORTED_LANGUAGES)
    .optional()
    .describe('Programming language for the query'),
  queryPath: z
    .string()
    .optional()
    .describe('Path to the query file being developed'),
  workspaceUri: z
    .string()
    .optional()
    .describe('Workspace URI for LSP dependency resolution'),
});

// ────────────────────────────────────────────────────────────────────────────
// Prompt names (exported for testing)
// ────────────────────────────────────────────────────────────────────────────

/** Names of every workflow prompt registered with the MCP server. */
export const WORKFLOW_PROMPT_NAMES = [
  'document_codeql_query',
  'explain_codeql_query',
  'ql_lsp_iterative_development',
  'ql_tdd_advanced',
  'ql_tdd_basic',
  'sarif_rank_false_positives',
  'sarif_rank_true_positives',
  'test_driven_development',
  'tools_query_workflow',
  'workshop_creation_workflow',
] as const;

/**
 * Register MCP workflow prompts
 *
 * Each prompt loads its content from a corresponding .prompt.md file
 * and processes any parameter substitutions.
 *
 * **UX note**: Every prompt schema is passed to `server.prompt()` so that
 * VS Code always displays the parameter-input quick-pick before the prompt
 * is sent to Copilot Chat. This lets users review and customise the values.
 */
export function registerWorkflowPrompts(server: McpServer): void {
  // Test-Driven Development Prompt
  server.prompt(
    'test_driven_development',
    'Test-driven development workflow for CodeQL queries using MCP tools',
    testDrivenDevelopmentSchema.shape,
    async ({ language, queryName }) => {
      const template = loadPromptTemplate('ql-tdd-basic.prompt.md');
      const content = processPromptTemplate(template, {
        language,
        queryName: queryName || '[QueryName]'
      });

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `## Context\n\n- **Language**: ${language}\n${queryName ? `- **Query Name**: ${queryName}\n` : ''}\n${content}`
            }
          }
        ]
      };
    }
  );

  // Tools Query Workflow Prompt
  server.prompt(
    'tools_query_workflow',
    'Guide for using built-in tools queries (PrintAST, PrintCFG, CallGraphFrom, CallGraphTo) to understand code structure',
    toolsQueryWorkflowSchema.shape,
    async ({
      language,
      database,
      sourceFiles,
      sourceFunction,
      targetFunction
    }) => {
      const template = loadPromptTemplate('tools-query-workflow.prompt.md');
      const content = processPromptTemplate(template, {
        language,
        database
      });

      const contextSection = buildToolsQueryContext(
        language,
        database,
        sourceFiles,
        sourceFunction,
        targetFunction
      );

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: contextSection + content
            }
          }
        ]
      };
    }
  );

  // Workshop Creation Workflow Prompt
  server.prompt(
    'workshop_creation_workflow',
    'Guide for creating CodeQL query development workshops from production-grade queries',
    workshopCreationWorkflowSchema.shape,
    async ({ queryPath, language, workshopName, numStages }) => {
      const template = loadPromptTemplate('workshop-creation-workflow.prompt.md');

      // Derive workshop name from query path if not provided
      const derivedName =
        workshopName ||
        basename(queryPath)
          .replace(/\.(ql|qlref)$/, '')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-') ||
        'codeql-workshop';

      const contextSection = buildWorkshopContext(
        queryPath,
        language,
        derivedName,
        numStages
      );

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: contextSection + template
            }
          }
        ]
      };
    }
  );

  // TDD Basic Prompt - Test-Driven Development Checklist
  server.prompt(
    'ql_tdd_basic',
    'Test-driven CodeQL query development checklist - write tests first, implement query, iterate until tests pass',
    qlTddBasicSchema.shape,
    async ({ language, queryName }) => {
      const template = loadPromptTemplate('ql-tdd-basic.prompt.md');

      let contextSection = '## Your Development Context\n\n';
      if (language) {
        contextSection += `- **Language**: ${language}\n`;
      }
      if (queryName) {
        contextSection += `- **Query Name**: ${queryName}\n`;
      }
      if (language || queryName) {
        contextSection += '\n';
      }

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: contextSection + template
            }
          }
        ]
      };
    }
  );

  // TDD Advanced Prompt - Advanced Techniques with AST/CFG/CallGraph
  server.prompt(
    'ql_tdd_advanced',
    'Advanced test-driven CodeQL development with AST visualization, control flow, and call graph analysis',
    qlTddAdvancedSchema.shape,
    async ({ language, queryName, database }) => {
      const template = loadPromptTemplate('ql-tdd-advanced.prompt.md');

      let contextSection = '## Your Development Context\n\n';
      if (language) {
        contextSection += `- **Language**: ${language}\n`;
      }
      if (queryName) {
        contextSection += `- **Query Name**: ${queryName}\n`;
      }
      if (database) {
        contextSection += `- **Database**: ${database}\n`;
      }
      if (language || queryName || database) {
        contextSection += '\n';
      }

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: contextSection + template
            }
          }
        ]
      };
    }
  );

  // SARIF Rank False Positives Prompt
  server.prompt(
    'sarif_rank_false_positives',
    'Analyze SARIF results to identify likely false positives in CodeQL query results',
    sarifRankSchema.shape,
    async ({ queryId, sarifPath }) => {
      const template = loadPromptTemplate('sarif-rank-false-positives.prompt.md');

      let contextSection = '## Analysis Context\n\n';
      if (queryId) {
        contextSection += `- **Query ID**: ${queryId}\n`;
      }
      if (sarifPath) {
        contextSection += `- **SARIF File**: ${sarifPath}\n`;
      }
      if (queryId || sarifPath) {
        contextSection += '\n';
      }

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: contextSection + template
            }
          }
        ]
      };
    }
  );

  // SARIF Rank True Positives Prompt
  server.prompt(
    'sarif_rank_true_positives',
    'Analyze SARIF results to identify likely true positives in CodeQL query results',
    sarifRankSchema.shape,
    async ({ queryId, sarifPath }) => {
      const template = loadPromptTemplate('sarif-rank-true-positives.prompt.md');

      let contextSection = '## Analysis Context\n\n';
      if (queryId) {
        contextSection += `- **Query ID**: ${queryId}\n`;
      }
      if (sarifPath) {
        contextSection += `- **SARIF File**: ${sarifPath}\n`;
      }
      if (queryId || sarifPath) {
        contextSection += '\n';
      }

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: contextSection + template
            }
          }
        ]
      };
    }
  );

  // Explain CodeQL Query Prompt (for workshop learning content)
  server.prompt(
    'explain_codeql_query',
    'Generate detailed explanation of a CodeQL query for workshop learning content - uses MCP tools to gather context and produces both verbal explanations and mermaid evaluation diagrams',
    explainCodeqlQuerySchema.shape,
    async ({ queryPath, language, databasePath }) => {
      const template = loadPromptTemplate('explain-codeql-query.prompt.md');

      let contextSection = '## Query to Explain\n\n';
      contextSection += `- **Query Path**: ${queryPath}\n`;
      contextSection += `- **Language**: ${language}\n`;
      if (databasePath) {
        contextSection += `- **Database Path**: ${databasePath}\n`;
      }
      contextSection += '\n';

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: contextSection + template
            }
          }
        ]
      };
    }
  );

  // Document CodeQL Query Prompt
  server.prompt(
    'document_codeql_query',
    'Create or update documentation for a CodeQL query - generates standardized markdown documentation as a sibling file to the query',
    documentCodeqlQuerySchema.shape,
    async ({ queryPath, language }) => {
      const template = loadPromptTemplate('document-codeql-query.prompt.md');

      const contextSection = `## Query to Document

- **Query Path**: ${queryPath}
- **Language**: ${language}

`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: contextSection + template
            }
          }
        ]
      };
    }
  );

  // LSP-powered Iterative Development Prompt
  server.prompt(
    'ql_lsp_iterative_development',
    'Iterative CodeQL query development using LSP tools for completion, navigation, and validation',
    qlLspIterativeDevelopmentSchema.shape,
    async ({ language, queryPath, workspaceUri }) => {
      const template = loadPromptTemplate('ql-lsp-iterative-development.prompt.md');

      let contextSection = '## Your Development Context\n\n';
      if (language) {
        contextSection += `- **Language**: ${language}\n`;
      }
      if (queryPath) {
        contextSection += `- **Query Path**: ${queryPath}\n`;
      }
      if (workspaceUri) {
        contextSection += `- **Workspace URI**: ${workspaceUri}\n`;
      }
      if (language || queryPath || workspaceUri) {
        contextSection += '\n';
      }

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: contextSection + template,
            },
          },
        ],
      };
    }
  );

  logger.info(`Registered ${WORKFLOW_PROMPT_NAMES.length} workflow prompts`);
}

/**
 * Build context section for tools query workflow
 */
export function buildToolsQueryContext(
  language: string,
  database: string,
  sourceFiles?: string,
  sourceFunction?: string,
  targetFunction?: string
): string {
  const lines = [
    '## Your Context',
    '',
    `- **Language**: ${language}`,
    `- **Database**: ${database}`
  ];

  if (sourceFiles) {
    lines.push(`- **Source Files**: ${sourceFiles}`);
  }
  if (sourceFunction) {
    lines.push(`- **Source Function**: ${sourceFunction}`);
  }
  if (targetFunction) {
    lines.push(`- **Target Function**: ${targetFunction}`);
  }

  lines.push('', '## Recommended Next Steps', '');

  if (sourceFiles) {
    lines.push(
      `1. Run \`codeql_query_run\` with queryName="PrintAST", sourceFiles="${sourceFiles}"`
    );
  } else {
    lines.push('1. Identify source files to analyze with PrintAST');
  }

  if (sourceFunction) {
    lines.push(
      `2. Run \`codeql_query_run\` with queryName="PrintCFG" or "CallGraphFrom", sourceFunction="${sourceFunction}"`
    );
  } else {
    lines.push(
      '2. Identify key functions for CFG or call graph analysis'
    );
  }

  if (targetFunction) {
    lines.push(
      `3. Run \`codeql_query_run\` with queryName="CallGraphTo", targetFunction="${targetFunction}"`
    );
  } else {
    lines.push('3. Identify target functions to find callers');
  }

  lines.push('', '');
  return lines.join('\n');
}

/**
 * Build context section for workshop creation workflow
 */
export function buildWorkshopContext(
  queryPath: string,
  language: string,
  workshopName: string,
  numStages?: number
): string {
  return `## Your Workshop Context

- **Target Query**: ${queryPath}
- **Language**: ${language}
- **Workshop Name**: ${workshopName}
- **Suggested Stages**: ${numStages || '4-8 (auto-detect based on query complexity)'}

## Immediate Actions

1. **Locate query files**: Use \`find_codeql_query_files\` with queryPath="${queryPath}"
2. **Understand query for learning content**: Use the \`explain_codeql_query\` prompt with queryPath="${queryPath}" and language="${language}"
3. **Document each workshop stage**: Use the \`document_codeql_query\` prompt to create/update documentation for each solution query
4. **Verify tests pass**: Use \`codeql_test_run\` on existing tests
5. **Run tools queries**: Generate AST/CFG understanding for workshop materials

`;
}
