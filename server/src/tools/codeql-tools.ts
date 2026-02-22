/**
 * CodeQL tools registration for MCP server
 * Includes both high-level helpers and CLI command wrappers
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { validateCodeQLSyntax } from '../lib/validation';
import { createCodeQLQuery } from '../lib/query-scaffolding';
import { registerCLITool } from '../lib/cli-tool-registry';
import {
  codeqlBqrsDecodeTool,
  codeqlBqrsInfoTool,
  codeqlBqrsInterpretTool,
  codeqlDatabaseAnalyzeTool,
  codeqlDatabaseCreateTool,
  codeqlGenerateLogSummaryTool,
  codeqlGenerateQueryHelpTool,
  codeqlPackInstallTool,
  codeqlPackLsTool,
  codeqlQueryCompileTool,
  codeqlQueryFormatTool,
  codeqlQueryRunTool,
  codeqlResolveDatabaseTool,
  codeqlResolveLanguagesTool,
  codeqlResolveLibraryPathTool,
  codeqlResolveMetadataTool,
  codeqlResolveQlrefTool,
  codeqlResolveQueriesTool,
  codeqlResolveTestsTool,
  codeqlTestAcceptTool,
  codeqlTestExtractTool,
  codeqlTestRunTool,
  registerFindClassPositionTool,
  registerFindCodeQLQueryFilesTool,
  registerFindPredicatePositionTool,
  registerListDatabasesTool,
  registerListMrvaRunResultsTool,
  registerListQueryRunResultsTool,
  registerProfileCodeQLQueryFromLogsTool,
  registerProfileCodeQLQueryTool,
  registerQuickEvaluateTool,
  registerReadDatabaseSourceTool,
  registerRegisterDatabaseTool
} from './codeql';
import { logger } from '../utils/logger';

/**
 * Register all CodeQL tools with the MCP server
 */
export function registerCodeQLTools(server: McpServer): void {
  // Register high-level helper tools
  
  // Tool: Validate CodeQL Query (heuristic-based)
  server.tool(
    'validate_codeql_query',
    'Quick heuristic validation for CodeQL query structure - checks for common patterns like from/where/select clauses and metadata presence. Does NOT compile the query. For authoritative validation with actual compilation, use codeql_lsp_diagnostics instead.',
    {
      query: z.string().describe('The CodeQL query to validate'),
      language: z.string().optional().describe('Target programming language'),
    },
    async ({ query, language }) => {
      try {
        const validation = validateCodeQLSyntax(query, language);
        return {
          content: [{ type: 'text', text: JSON.stringify(validation, null, 2) }],
        };
      } catch (error) {
        logger.error('Error validating CodeQL query:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Tool: Create CodeQL Query
  server.tool(
    'create_codeql_query',
    'Create directory structure and files for a new CodeQL query with tests',
    {
      basePath: z.string().describe('Base path where src/ and test/ directories will be created'),
      queryName: z.string().describe('Name of the query (e.g., MySecurityQuery)'),
      language: z.string().describe('Target programming language (e.g., javascript, python, java)'),
      description: z.string().optional().describe('Description of what the query does'),
      queryId: z.string().optional().describe('Custom query ID (defaults to language/example/queryname)'),
    },
    async ({ basePath, queryName, language, description, queryId }) => {
      try {
        const result = createCodeQLQuery({
          basePath,
          queryName,
          language,
          description,
          queryId
        });
        
        const summary = {
          success: true,
          queryPath: result.queryPath,
          testPath: result.testPath,
          qlrefPath: result.qlrefPath,
          testCodePath: result.testCodePath,
          filesCreated: result.filesCreated,
          nextSteps: [
            'Review and customize the generated query in: ' + result.queryPath,
            'Add test cases to: ' + result.testCodePath,
            'Run codeql_pack_install to install dependencies',
            'Run codeql_test_extract to create test database',
            'Run codeql_test_run to execute tests'
          ]
        };
        
        return {
          content: [{ type: 'text', text: JSON.stringify(summary, null, 2) }],
        };
      } catch (error) {
        logger.error('Error creating CodeQL query:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // Register CLI tools (alphabetically by tool name)
  registerCLITool(server, codeqlBqrsDecodeTool);
  registerCLITool(server, codeqlBqrsInfoTool);
  registerCLITool(server, codeqlBqrsInterpretTool);
  registerCLITool(server, codeqlDatabaseAnalyzeTool);
  registerCLITool(server, codeqlDatabaseCreateTool);
  registerCLITool(server, codeqlGenerateLogSummaryTool);
  registerCLITool(server, codeqlGenerateQueryHelpTool);
  registerCLITool(server, codeqlPackInstallTool);
  registerCLITool(server, codeqlPackLsTool);
  registerCLITool(server, codeqlQueryCompileTool);
  registerCLITool(server, codeqlQueryFormatTool);
  registerCLITool(server, codeqlQueryRunTool);
  registerCLITool(server, codeqlResolveDatabaseTool);
  registerCLITool(server, codeqlResolveLanguagesTool);
  registerCLITool(server, codeqlResolveLibraryPathTool);
  registerCLITool(server, codeqlResolveMetadataTool);
  registerCLITool(server, codeqlResolveQlrefTool);
  registerCLITool(server, codeqlResolveQueriesTool);
  registerCLITool(server, codeqlResolveTestsTool);
  registerCLITool(server, codeqlTestAcceptTool);
  registerCLITool(server, codeqlTestExtractTool);
  registerCLITool(server, codeqlTestRunTool);

  // Register new MCP tools (inspired by JordyZomer/codeql-mcp repository)
  registerFindClassPositionTool(server);
  registerFindCodeQLQueryFilesTool(server);
  registerFindPredicatePositionTool(server);
  registerListDatabasesTool(server);
  registerListMrvaRunResultsTool(server);
  registerListQueryRunResultsTool(server);
  registerProfileCodeQLQueryFromLogsTool(server);
  registerProfileCodeQLQueryTool(server);
  registerQuickEvaluateTool(server);
  registerReadDatabaseSourceTool(server);
  registerRegisterDatabaseTool(server);
}
