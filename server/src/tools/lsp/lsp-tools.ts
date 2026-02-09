/**
 * CodeQL LSP MCP tool definitions.
 *
 * Registers four LSP-based tools:
 * - codeql_lsp_completion     – code completions at cursor position
 * - codeql_lsp_definition     – go to definition
 * - codeql_lsp_diagnostics    – QL code validation via LSP diagnostics
 * - codeql_lsp_references     – find all references
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { registerLspDiagnosticsTool } from './lsp-diagnostics';
import {
  lspCompletion,
  lspDefinition,
  lspReferences,
} from './lsp-handlers';
import { logger } from '../../utils/logger';

/**
 * Shared Zod schema for the common LSP tool parameters.
 */
const lspParamsSchema = {
  character: z.number().int().min(0).describe('0-based character offset within the line'),
  file_content: z.string().optional().describe('Optional file content override (reads from disk if omitted)'),
  file_path: z.string().describe('Path to the CodeQL (.ql/.qll) file. Relative paths are resolved against the user workspace directory (see CODEQL_MCP_WORKSPACE).'),
  line: z.number().int().min(0).describe('0-based line number in the document'),
  search_path: z.string().optional().describe('Optional search path for CodeQL libraries'),
  workspace_uri: z.string().optional().describe('Optional workspace URI for context (defaults to ./ql directory)'),
};

/**
 * Helper to build the handler params from the raw MCP tool input.
 */
function toHandlerParams(input: {
  character: number;
  file_content?: string;
  file_path: string;
  line: number;
  search_path?: string;
  workspace_uri?: string;
}) {
  return {
    character: input.character,
    fileContent: input.file_content,
    filePath: input.file_path,
    line: input.line,
    searchPath: input.search_path,
    workspaceUri: input.workspace_uri,
  };
}

/**
 * Register all LSP-based tools with the MCP server.
 */
export function registerLSPTools(server: McpServer): void {
  // --- codeql_lsp_diagnostics (relocated from codeql_language_server_eval) ---
  registerLspDiagnosticsTool(server);

  // --- codeql_lsp_completion ---
  server.tool(
    'codeql_lsp_completion',
    'Get code completions at a cursor position in a CodeQL file. Returns completion items with labels, documentation, and insert text. The file must be a .ql or .qll file. IMPORTANT: Set workspace_uri to the pack or workspace root directory for dependency resolution; without it, completions for imported libraries will be empty.',
    lspParamsSchema,
    async (input) => {
      try {
        const items = await lspCompletion(toHandlerParams(input));
        return {
          content: [{
            text: JSON.stringify({
              completionCount: items.length,
              items: items.map((item) => ({
                detail: item.detail,
                documentation: item.documentation,
                insertText: item.insertText,
                kind: item.kind,
                label: item.label,
              })),
            }, null, 2),
            type: 'text' as const,
          }],
        };
      } catch (error) {
        logger.error('codeql_lsp_completion error:', error);
        return {
          content: [{ text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'text' as const }],
          isError: true,
        };
      }
    },
  );

  // --- codeql_lsp_definition ---
  server.tool(
    'codeql_lsp_definition',
    'Go to the definition of a CodeQL symbol at a given position. Returns one or more file locations where the symbol is defined. Set workspace_uri to the pack root for dependency resolution.',
    lspParamsSchema,
    async (input) => {
      try {
        const locations = await lspDefinition(toHandlerParams(input));
        return {
          content: [{
            text: JSON.stringify({
              definitionCount: locations.length,
              locations: locations.map((loc) => ({
                endCharacter: loc.range.end.character,
                endLine: loc.range.end.line + 1,
                startCharacter: loc.range.start.character,
                startLine: loc.range.start.line + 1,
                uri: loc.uri,
              })),
            }, null, 2),
            type: 'text' as const,
          }],
        };
      } catch (error) {
        logger.error('codeql_lsp_definition error:', error);
        return {
          content: [{ text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'text' as const }],
          isError: true,
        };
      }
    },
  );

  // --- codeql_lsp_references ---
  server.tool(
    'codeql_lsp_references',
    'Find all references to a CodeQL symbol at a given position. Returns file locations of all usages, including the declaration. Set workspace_uri to the pack root for dependency resolution.',
    lspParamsSchema,
    async (input) => {
      try {
        const locations = await lspReferences(toHandlerParams(input));
        return {
          content: [{
            text: JSON.stringify({
              locations: locations.map((loc) => ({
                endCharacter: loc.range.end.character,
                endLine: loc.range.end.line + 1,
                startCharacter: loc.range.start.character,
                startLine: loc.range.start.line + 1,
                uri: loc.uri,
              })),
              referenceCount: locations.length,
            }, null, 2),
            type: 'text' as const,
          }],
        };
      } catch (error) {
        logger.error('codeql_lsp_references error:', error);
        return {
          content: [{ text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`, type: 'text' as const }],
          isError: true,
        };
      }
    },
  );
}
