/**
 * MCP Server workflow prompts for CodeQL development
 *
 * All prompt content is loaded from .prompt.md files in this directory.
 * This file only handles prompt registration and parameter processing.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { basename, isAbsolute, normalize, relative, resolve, sep } from 'path';
import { access } from 'fs/promises';
import { fileURLToPath } from 'url';
import { loadPromptTemplate, processPromptTemplate } from './prompt-loader';
import { getUserWorkspaceDir } from '../utils/package-paths';
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
// File-path resolution for prompt parameters
// ────────────────────────────────────────────────────────────────────────────

/**
 * Result of resolving a user-supplied file path in a prompt parameter.
 *
 * `resolvedPath` is set to the best-effort absolute path, or an empty
 * string when the path is blocked (e.g. traversal outside workspace).
 * `warning` is set when the path is problematic — the caller should
 * embed it in the prompt response so the user sees a clear message.
 * `blocked` is `true` when the path must not be used (e.g. traversal).
 */
export interface PromptFilePathResult {
  blocked?: boolean;
  resolvedPath: string;
  warning?: string;
}

/**
 * Resolve a user-supplied file path for a prompt parameter.
 *
 * Handles `file://` URIs (converted via `fileURLToPath`) and plain paths.
 * Relative paths are resolved against `workspaceRoot` (which defaults to
 * `getUserWorkspaceDir()`).  The function never throws — it returns a
 * `warning` string when the path is empty, traverses outside the workspace,
 * or does not exist on disk.  Path traversal attempts are treated as a hard
 * failure: `blocked` is `true` and `resolvedPath` is empty so that the
 * outside-root absolute path is never embedded in the prompt context.
 *
 * @param filePath      - The raw path value from the prompt parameter.
 * @param workspaceRoot - Directory to resolve relative paths against.
 * @returns An object with the resolved absolute path and an optional warning.
 */
export async function resolvePromptFilePath(
  filePath: string,
  workspaceRoot?: string,
): Promise<PromptFilePathResult> {
  if (!filePath || filePath.trim() === '') {
    return {
      resolvedPath: filePath ?? '',
      warning: '⚠ **File path is empty.** Please provide a valid file path.',
    };
  }

  // Convert file:// URIs to filesystem paths before resolution.
  let effectivePath = filePath;
  if (/^file:\/\//i.test(filePath.trim())) {
    try {
      effectivePath = fileURLToPath(filePath.trim());
    } catch {
      return {
        resolvedPath: '',
        blocked: true,
        warning: `⚠ **File path** \`${filePath}\` **is not a valid file URI.**`,
      };
    }
  }

  const effectiveRoot = workspaceRoot ?? getUserWorkspaceDir();

  // Normalise first to collapse any . or .. segments.
  const normalizedPath = normalize(effectivePath);

  // Resolve to absolute path.
  const absolutePath = isAbsolute(normalizedPath)
    ? normalizedPath
    : resolve(effectiveRoot, normalizedPath);

  // Verify the resolved path stays within the workspace root.
  // This catches path traversal (e.g. "../../etc/passwd") after full
  // resolution rather than relying on a fragile substring check.
  const rel = relative(effectiveRoot, absolutePath);
  if (rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) {
    return {
      blocked: true,
      resolvedPath: '',
      warning: '⚠ **File path resolves outside the workspace root.** The path has been blocked for security.',
    };
  }

  // Check existence on disk (advisory only — the resolved path is always
  // returned so that downstream tools can attempt the operation themselves
  // and surface their own errors).
  try {
    await access(absolutePath);
  } catch {
    return {
      resolvedPath: absolutePath,
      warning: `⚠ **File path** \`${filePath}\` **does not exist.** Resolved to: \`${absolutePath}\``,
    };
  }

  return { resolvedPath: absolutePath };
}

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
 * - `language` is **required** – TDD workflows are language-specific.
 * - `queryName` is optional.
 */
export const qlTddBasicSchema = z.object({
  language: z
    .enum(SUPPORTED_LANGUAGES)
    .describe('Programming language for the query'),
  queryName: z
    .string()
    .optional()
    .describe('Name of the query to develop'),
});

/**
 * Schema for ql_tdd_advanced prompt parameters.
 *
 * - `language` is **required** – TDD workflows are language-specific.
 * - `database` and `queryName` are optional.
 */
export const qlTddAdvancedSchema = z.object({
  database: z
    .string()
    .optional()
    .describe('Path to the CodeQL database for analysis'),
  language: z
    .enum(SUPPORTED_LANGUAGES)
    .describe('Programming language for the query'),
  queryName: z
    .string()
    .optional()
    .describe('Name of the query to develop'),
});

/**
 * Schema for sarif_rank_false_positives / sarif_rank_true_positives.
 *
 * - `sarifPath` is **required** – the prompt needs a SARIF file to analyze.
 * - `queryId` is optional – narrows analysis to a specific rule.
 */
export const sarifRankSchema = z.object({
  queryId: z
    .string()
    .optional()
    .describe('CodeQL query/rule identifier'),
  sarifPath: z
    .string()
    .describe('Path to the SARIF file to analyze'),
});

/**
 * Schema for run_query_and_summarize_false_positives prompt parameters.
 *
 * - `queryPath` is **required** – the prompt needs a query to analyze.
 */
export const describeFalsePositivesSchema = z.object({
  queryPath: z
    .string()
    .describe('Path to the CodeQL query file'),
});

/**
 * Schema for explain_codeql_query prompt parameters.
 *
 * - `queryPath` and `language` are **required**.
 * - `databasePath` is optional – a database may also be derived from tests.
 */
export const explainCodeqlQuerySchema = z.object({
  databasePath: z
    .string()
    .optional()
    .describe('Path to a CodeQL database for profiling'),
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
 * Schema for check_for_duplicated_code prompt parameters.
 *
 * - `queryPath` is **required** – the file to audit.
 * - `workspaceUri` is optional – if omitted the agent will derive it from the
 *   pack root containing the query.
 */
export const checkForDuplicatedCodeSchema = z.object({
  queryPath: z
    .string()
    .describe('Path to the .ql or .qll file to audit for duplicated definitions'),
  workspaceUri: z
    .string()
    .optional()
    .describe('Pack root directory containing codeql-pack.yml (for LSP resolution)'),
});

/**
 * Schema for find_overlapping_queries prompt parameters.
 *
 * - `queryDescription` is **required** – describes the new query's purpose.
 * - `language` is **required** – the target CodeQL language.
 * - `packRoot` is optional – directory containing `codeql-pack.yml` for the
 *   pack that will own the new query.
 */
export const findOverlappingQueriesSchema = z.object({
  queryDescription: z
    .string()
    .describe(
      'Description of the new query\'s purpose and target constructs '
      + '(e.g. "detect placement-new on types with non-trivial destructors")'
    ),
  language: z
    .enum(SUPPORTED_LANGUAGES)
    .describe('Target language for the new query (e.g. cpp, java, python)'),
  packRoot: z
    .string()
    .optional()
    .describe('Directory containing codeql-pack.yml for the pack that will own the new query'),
});

/**
 * Schema for ql_lsp_iterative_development prompt parameters.
 *
 * - `language` and `queryPath` are **required** – LSP tools need both.
 * - `workspaceUri` is optional – defaults to the pack root.
 */
export const qlLspIterativeDevelopmentSchema = z.object({
  language: z
    .enum(SUPPORTED_LANGUAGES)
    .describe('Programming language for the query'),
  queryPath: z
    .string()
    .describe('Path to the query file being developed'),
  workspaceUri: z
    .string()
    .optional()
    .describe('Workspace URI for LSP dependency resolution'),
});

// ────────────────────────────────────────────────────────────────────────────
// Error-recovery utilities for prompt handlers
// ────────────────────────────────────────────────────────────────────────────

/**
 * Prompt result shape returned by every workflow prompt handler.
 */
interface PromptResult {
  messages: Array<{
    role: 'user';
    content: { type: 'text'; text: string };
  }>;
}

/**
 * Create a permissive copy of a Zod schema shape for MCP registration.
 *
 * The MCP SDK validates prompt arguments against the registered schema
 * **before** invoking the handler. If validation fails, the SDK throws a
 * raw `McpError(-32602)` with a cryptic JSON dump that is poor UX when
 * surfaced as a VS Code slash-command error.
 *
 * This function converts every `z.enum()` field in the shape to a
 * `z.string()` (preserving `.describe()` and `.optional()` modifiers) so
 * that the SDK never rejects user input at the protocol layer. The strict
 * enum validation then happens inside `createSafePromptHandler()`, which
 * can return a user-friendly inline error instead of throwing.
 *
 * All non-enum field types are passed through unchanged.
 */
export function toPermissiveShape(
  shape: Record<string, z.ZodTypeAny>,
): Record<string, z.ZodTypeAny> {
  const permissive: Record<string, z.ZodTypeAny> = {};

  for (const [key, zodType] of Object.entries(shape)) {
    permissive[key] = widenZodType(zodType);
  }

  return permissive;
}

/**
 * Widen a single Zod type for permissive registration:
 *
 * - Replace z.enum() with z.string() (so any string value passes SDK
 *   validation; the handler validates the enum via createSafePromptHandler)
 * - Preserve optional/required status and .describe() metadata so
 *   VS Code correctly marks fields in the slash-command input dialog.
 */
function widenZodType(zodType: z.ZodTypeAny): z.ZodTypeAny {
  // Unwrap ZodOptional → widen inner → re-wrap (only if inner changed)
  if (zodType instanceof z.ZodOptional) {
    const inner = zodType.unwrap();
    const widenedInner = widenZodType(inner);
    if (widenedInner === inner) return zodType; // no change needed
    const result = widenedInner.optional();
    const desc = zodType.description;
    return desc ? result.describe(desc) : result;
  }

  // Replace ZodEnum with ZodString, preserving description
  if (zodType instanceof z.ZodEnum) {
    const desc = zodType.description;
    const replacement = z.string();
    return desc ? replacement.describe(desc) : replacement;
  }

  // All other types (string, number, coerce, etc.) pass through unchanged
  return zodType;
}

/**
 * Format a Zod validation error into a user-friendly markdown message.
 *
 * Extracts the relevant details from ZodError issues and presents them
 * as actionable guidance rather than raw JSON.
 */
export function formatValidationError(
  promptName: string,
  error: z.ZodError,
): string {
  const lines = [
    `⚠ **Invalid input for \`${promptName}\`**`,
    '',
  ];

  for (const issue of error.issues) {
    const field = issue.path.length > 0 ? issue.path.join('.') : 'input';

    if (issue.code === 'invalid_enum_value' && 'options' in issue) {
      const opts = (issue.options as string[]).join(', ');
      lines.push(
        `- **\`${field}\`**: received \`${String(issue.received)}\` — ` +
        `must be one of: ${opts}`,
      );
    } else if (issue.code === 'invalid_type') {
      lines.push(
        `- **\`${field}\`**: expected ${issue.expected}, received ${issue.received}`,
      );
    } else {
      lines.push(`- **\`${field}\`**: ${issue.message}`);
    }
  }

  lines.push(
    '',
    'Please correct the input and try again.',
  );

  return lines.join('\n');
}

/**
 * Wrap a prompt handler with early validation and exception recovery.
 *
 * 1. Validates `rawArgs` against the **strict** Zod schema (with enums).
 * 2. On validation failure → returns a user-friendly inline error message.
 * 3. On unexpected handler exception → catches and returns inline error.
 * 4. On success → returns the handler's result normally.
 *
 * This ensures slash-command users never see raw MCP protocol errors.
 */
export function createSafePromptHandler<T extends z.ZodObject<z.ZodRawShape>>(
  promptName: string,
  strictSchema: T,
  handler: (_args: z.infer<T>) => Promise<PromptResult>,
): (_rawArgs: Record<string, unknown>) => Promise<PromptResult> {
  return async (rawArgs: Record<string, unknown>): Promise<PromptResult> => {
    // Step 1: Validate with the strict schema
    const parseResult = strictSchema.safeParse(rawArgs);
    if (!parseResult.success) {
      const errorText = formatValidationError(promptName, parseResult.error);
      logger.warn(`Prompt ${promptName} validation failed: ${parseResult.error.message}`);
      return {
        messages: [{
          role: 'user',
          content: { type: 'text', text: errorText },
        }],
      };
    }

    // Step 2: Call the handler with validated args, catching exceptions
    try {
      return await handler(parseResult.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`Prompt ${promptName} handler error: ${msg}`);
      return {
        messages: [{
          role: 'user',
          content: {
            type: 'text',
            text: `⚠ **Error in \`${promptName}\`**: ${msg}\n\nPlease check your inputs and try again.`,
          },
        }],
      };
    }
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Prompt names (exported for testing)
// ────────────────────────────────────────────────────────────────────────────

/** Names of every workflow prompt registered with the MCP server. */
export const WORKFLOW_PROMPT_NAMES = [
  'check_for_duplicated_code',
  'document_codeql_query',
  'explain_codeql_query',
  'find_overlapping_queries',
  'ql_lsp_iterative_development',
  'ql_tdd_advanced',
  'ql_tdd_basic',
  'run_query_and_summarize_false_positives',
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
    toPermissiveShape(testDrivenDevelopmentSchema.shape),
    createSafePromptHandler(
      'test_driven_development',
      testDrivenDevelopmentSchema,
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
      },
    ),
  );

  // Tools Query Workflow Prompt
  server.prompt(
    'tools_query_workflow',
    'Guide for using built-in tools queries (PrintAST, PrintCFG, CallGraphFrom, CallGraphTo) to understand code structure',
    toPermissiveShape(toolsQueryWorkflowSchema.shape),
    createSafePromptHandler(
      'tools_query_workflow',
      toolsQueryWorkflowSchema,
      async ({ language, database, sourceFiles, sourceFunction, targetFunction }) => {
        const template = loadPromptTemplate('tools-query-workflow.prompt.md');

        const warnings: string[] = [];
        const dbResult = await resolvePromptFilePath(database);
        const resolvedDatabase = dbResult.resolvedPath;
        if (dbResult.warning) warnings.push(dbResult.warning);

        const content = processPromptTemplate(template, {
          language,
          database: resolvedDatabase
        });

        const contextSection = buildToolsQueryContext(
          language,
          resolvedDatabase,
          sourceFiles,
          sourceFunction,
          targetFunction
        );

        const warningSection = warnings.length > 0
          ? warnings.join('\n') + '\n\n'
          : '';

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: warningSection + contextSection + content
              }
            }
          ]
        };
      },
    ),
  );

  // Workshop Creation Workflow Prompt
  server.prompt(
    'workshop_creation_workflow',
    'Guide for creating CodeQL query development workshops from production-grade queries',
    toPermissiveShape(workshopCreationWorkflowSchema.shape),
    createSafePromptHandler(
      'workshop_creation_workflow',
      workshopCreationWorkflowSchema,
      async ({ queryPath, language, workshopName, numStages }) => {
        const template = loadPromptTemplate('workshop-creation-workflow.prompt.md');

        const warnings: string[] = [];
        const qpResult = await resolvePromptFilePath(queryPath);
        const resolvedQueryPath = qpResult.resolvedPath;
        if (qpResult.warning) warnings.push(qpResult.warning);

        const derivedName =
          workshopName ||
          basename(resolvedQueryPath)
            .replace(/\.(ql|qlref)$/, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-') ||
          'codeql-workshop';

        const contextSection = buildWorkshopContext(
          resolvedQueryPath,
          language,
          derivedName,
          numStages
        );

        const warningSection = warnings.length > 0
          ? warnings.join('\n') + '\n\n'
          : '';

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: warningSection + contextSection + template
              }
            }
          ]
        };
      },
    ),
  );

  // TDD Basic Prompt - Test-Driven Development Checklist
  server.prompt(
    'ql_tdd_basic',
    'Test-driven CodeQL query development checklist - write tests first, implement query, iterate until tests pass',
    toPermissiveShape(qlTddBasicSchema.shape),
    createSafePromptHandler(
      'ql_tdd_basic',
      qlTddBasicSchema,
      async ({ language, queryName }) => {
        const template = loadPromptTemplate('ql-tdd-basic.prompt.md');

        let contextSection = '## Your Development Context\n\n';
        contextSection += `- **Language**: ${language}\n`;
        if (queryName) {
          contextSection += `- **Query Name**: ${queryName}\n`;
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
      },
    ),
  );

  // TDD Advanced Prompt - Advanced Techniques with AST/CFG/CallGraph
  server.prompt(
    'ql_tdd_advanced',
    'Advanced test-driven CodeQL development with AST visualization, control flow, and call graph analysis',
    toPermissiveShape(qlTddAdvancedSchema.shape),
    createSafePromptHandler(
      'ql_tdd_advanced',
      qlTddAdvancedSchema,
      async ({ language, queryName, database }) => {
        const template = loadPromptTemplate('ql-tdd-advanced.prompt.md');

        const warnings: string[] = [];
        let resolvedDatabase = database;
        if (database) {
          const dbResult = await resolvePromptFilePath(database);
          resolvedDatabase = dbResult.resolvedPath;
          if (dbResult.warning) warnings.push(dbResult.warning);
        }

        let contextSection = '## Your Development Context\n\n';
        contextSection += `- **Language**: ${language}\n`;
        if (queryName) {
          contextSection += `- **Query Name**: ${queryName}\n`;
        }
        if (resolvedDatabase) {
          contextSection += `- **Database**: ${resolvedDatabase}\n`;
        }
        contextSection += '\n';

        const warningSection = warnings.length > 0
          ? warnings.join('\n') + '\n\n'
          : '';

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: warningSection + contextSection + template
              }
            }
          ]
        };
      },
    ),
  );

  // SARIF Rank False Positives Prompt
  server.prompt(
    'sarif_rank_false_positives',
    'Analyze SARIF results to identify likely false positives in CodeQL query results',
    toPermissiveShape(sarifRankSchema.shape),
    createSafePromptHandler(
      'sarif_rank_false_positives',
      sarifRankSchema,
      async ({ queryId, sarifPath }) => {
        const template = loadPromptTemplate('sarif-rank-false-positives.prompt.md');

        const warnings: string[] = [];
        const spResult = await resolvePromptFilePath(sarifPath);
        const resolvedSarifPath = spResult.resolvedPath;
        if (spResult.warning) warnings.push(spResult.warning);

        let contextSection = '## Analysis Context\n\n';
        if (queryId) {
          contextSection += `- **Query ID**: ${queryId}\n`;
        }
        contextSection += `- **SARIF File**: ${resolvedSarifPath}\n`;
        contextSection += '\n';

        const warningSection = warnings.length > 0
          ? warnings.join('\n') + '\n\n'
          : '';

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: warningSection + contextSection + template
              }
            }
          ]
        };
      },
    ),
  );

  // SARIF Rank True Positives Prompt
  server.prompt(
    'sarif_rank_true_positives',
    'Analyze SARIF results to identify likely true positives in CodeQL query results',
    toPermissiveShape(sarifRankSchema.shape),
    createSafePromptHandler(
      'sarif_rank_true_positives',
      sarifRankSchema,
      async ({ queryId, sarifPath }) => {
        const template = loadPromptTemplate('sarif-rank-true-positives.prompt.md');

        const warnings: string[] = [];
        const spResult = await resolvePromptFilePath(sarifPath);
        const resolvedSarifPath = spResult.resolvedPath;
        if (spResult.warning) warnings.push(spResult.warning);

        let contextSection = '## Analysis Context\n\n';
        if (queryId) {
          contextSection += `- **Query ID**: ${queryId}\n`;
        }
        contextSection += `- **SARIF File**: ${resolvedSarifPath}\n`;
        contextSection += '\n';

        const warningSection = warnings.length > 0
          ? warnings.join('\n') + '\n\n'
          : '';

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: warningSection + contextSection + template
              }
            }
          ]
        };
      },
    ),
  );

  // Run a query and describe its false positives
  server.prompt(
    'run_query_and_summarize_false_positives',
    'Help a user figure out where their query may need improvement to have a lower false positive rate',
    toPermissiveShape(describeFalsePositivesSchema.shape),
    createSafePromptHandler(
      'run_query_and_summarize_false_positives',
      describeFalsePositivesSchema,
      async ({ queryPath }) => {
        const template = loadPromptTemplate('run-query-and-summarize-false-positives.prompt.md');

        const warnings: string[] = [];
        const qpResult = await resolvePromptFilePath(queryPath);
        const resolvedQueryPath = qpResult.resolvedPath;
        if (qpResult.warning) warnings.push(qpResult.warning);

        const contextSection = `## Analysis Context\n\n- **Query Path**: ${resolvedQueryPath}\n\n`;

        const warningSection = warnings.length > 0
          ? warnings.join('\n') + '\n\n'
          : '';

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: warningSection + contextSection + template
              }
            }
          ]
        };
      },
    ),
  );

  // Explain CodeQL Query Prompt (for workshop learning content)
  server.prompt(
    'explain_codeql_query',
    'Generate detailed explanation of a CodeQL query for workshop learning content - uses MCP tools to gather context and produces both verbal explanations and mermaid evaluation diagrams',
    toPermissiveShape(explainCodeqlQuerySchema.shape),
    createSafePromptHandler(
      'explain_codeql_query',
      explainCodeqlQuerySchema,
      async ({ queryPath, language, databasePath }) => {
        const template = loadPromptTemplate('explain-codeql-query.prompt.md');

        const warnings: string[] = [];
        const qpResult = await resolvePromptFilePath(queryPath);
        const resolvedQueryPath = qpResult.resolvedPath;
        if (qpResult.warning) warnings.push(qpResult.warning);

        let resolvedDatabasePath = databasePath;
        if (databasePath) {
          const dbResult = await resolvePromptFilePath(databasePath);
          resolvedDatabasePath = dbResult.resolvedPath;
          if (dbResult.warning) warnings.push(dbResult.warning);
        }

        let contextSection = '## Query to Explain\n\n';
        contextSection += `- **Query Path**: ${resolvedQueryPath}\n`;
        contextSection += `- **Language**: ${language}\n`;
        if (resolvedDatabasePath) {
          contextSection += `- **Database Path**: ${resolvedDatabasePath}\n`;
        }
        contextSection += '\n';

        const warningSection = warnings.length > 0
          ? warnings.join('\n') + '\n\n'
          : '';

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: warningSection + contextSection + template
              }
            }
          ]
        };
      },
    ),
  );

  // Document CodeQL Query Prompt
  server.prompt(
    'document_codeql_query',
    'Create or update documentation for a CodeQL query - generates standardized markdown documentation as a sibling file to the query',
    toPermissiveShape(documentCodeqlQuerySchema.shape),
    createSafePromptHandler(
      'document_codeql_query',
      documentCodeqlQuerySchema,
      async ({ queryPath, language }) => {
        const template = loadPromptTemplate('document-codeql-query.prompt.md');

        const warnings: string[] = [];
        const qpResult = await resolvePromptFilePath(queryPath);
        const resolvedQueryPath = qpResult.resolvedPath;
        if (qpResult.warning) warnings.push(qpResult.warning);

        const contextSection = `## Query to Document

- **Query Path**: ${resolvedQueryPath}
- **Language**: ${language}

`;

        const warningSection = warnings.length > 0
          ? warnings.join('\n') + '\n\n'
          : '';

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: warningSection + contextSection + template
              }
            }
          ]
        };
      },
    ),
  );

  // Check for Duplicated Code Prompt
  server.prompt(
    'check_for_duplicated_code',
    'Check a .ql or .qll file for classes, predicates, and modules that duplicate definitions already available in the standard CodeQL libraries or shared project .qll files',
    checkForDuplicatedCodeSchema.shape,
    async ({ queryPath, workspaceUri }) => {
      const template = loadPromptTemplate('check-for-duplicated-code.prompt.md');

      const contextSection = `## File to Audit

- **Query Path**: ${queryPath}
${workspaceUri ? `- **Workspace URI**: ${workspaceUri}
` : ''}
`;

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

  // Find Overlapping Queries Prompt
  server.prompt(
    'find_overlapping_queries',
    'Discover existing .ql query files and .qll library files whose content may overlap with a new query design, identifying reusable classes, predicates, and modules',
    findOverlappingQueriesSchema.shape,
    async ({ queryDescription, language, packRoot }) => {
      const template = loadPromptTemplate('find-overlapping-queries.prompt.md');

      const contextSection =
        `## New Query Context

`
        + `- **Query Description**: ${queryDescription}
`
        + `- **Language**: ${language}
`
        + (packRoot ? `- **Pack Root**: ${packRoot}
` : '');

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: contextSection + '\n' + template,
            },
          },
        ],
      };
    }
  );

  // LSP-powered Iterative Development Prompt
  server.prompt(
    'ql_lsp_iterative_development',
    'Iterative CodeQL query development using LSP tools for completion, navigation, and validation',
    toPermissiveShape(qlLspIterativeDevelopmentSchema.shape),
    createSafePromptHandler(
      'ql_lsp_iterative_development',
      qlLspIterativeDevelopmentSchema,
      async ({ language, queryPath, workspaceUri }) => {
        const template = loadPromptTemplate('ql-lsp-iterative-development.prompt.md');

        const warnings: string[] = [];
        const qpResult = await resolvePromptFilePath(queryPath);
        const resolvedQueryPath = qpResult.resolvedPath;
        if (qpResult.warning) warnings.push(qpResult.warning);

        let resolvedWorkspaceUri = workspaceUri;
        if (workspaceUri) {
          const wsResult = await resolvePromptFilePath(workspaceUri);
          resolvedWorkspaceUri = wsResult.resolvedPath;
          if (wsResult.warning) warnings.push(wsResult.warning);
        }

        let contextSection = '## Your Development Context\n\n';
        contextSection += `- **Language**: ${language}\n`;
        contextSection += `- **Query Path**: ${resolvedQueryPath}\n`;
        if (resolvedWorkspaceUri) {
          contextSection += `- **Workspace URI**: ${resolvedWorkspaceUri}\n`;
        }
        contextSection += '\n';

        const warningSection = warnings.length > 0
          ? warnings.join('\n') + '\n\n'
          : '';

        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: warningSection + contextSection + template,
              },
            },
          ],
        };
      },
    ),
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
