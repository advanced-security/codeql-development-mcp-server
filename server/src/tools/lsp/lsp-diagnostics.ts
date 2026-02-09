/**
 * CodeQL LSP Diagnostics tool for MCP server.
 *
 * Provides real-time QL code validation through LSP communication.
 * Renamed from `codeql_language_server_eval` to `codeql_lsp_diagnostics`
 * for consistency with the `codeql_lsp_*` tool naming convention.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Diagnostic, LanguageServerOptions } from '../../lib/language-server';
import { LanguageServerConfig } from '../../lib/server-config';
import { getServerManager } from '../../lib/server-manager';
import { logger } from '../../utils/logger';
import { getProjectTmpDir } from '../../utils/temp-dir';
import { join, isAbsolute, resolve } from 'path';
import { pathToFileURL } from 'url';

export interface LspDiagnosticsParams {
  qlCode: string;
  serverOptions?: LanguageServerOptions;
  workspaceUri?: string;
}

export interface LspDiagnosticsResult {
  diagnostics: Diagnostic[];
  formattedOutput: string;
  isValid: boolean;
  summary: {
    errorCount: number;
    hintCount: number;
    infoCount: number;
    warningCount: number;
  };
}

/**
 * Format diagnostics for human-readable output.
 */
function formatDiagnostics(diagnostics: Diagnostic[]): string {
  if (diagnostics.length === 0) {
    return '✅ No issues found in QL code';
  }

  const lines: string[] = [];
  lines.push(`Found ${diagnostics.length} issue(s):\n`);

  diagnostics.forEach((diagnostic, index) => {
    const severityIcon = getSeverityIcon(diagnostic.severity);
    const severityName = getSeverityName(diagnostic.severity);
    const location = `Line ${diagnostic.range.start.line + 1}, Column ${diagnostic.range.start.character + 1}`;

    lines.push(`${index + 1}. ${severityIcon} ${severityName} at ${location}`);
    lines.push(`   ${diagnostic.message}`);
    if (diagnostic.source) {
      lines.push(`   Source: ${diagnostic.source}`);
    }
    if (diagnostic.code) {
      lines.push(`   Code: ${diagnostic.code}`);
    }
    lines.push('');
  });

  return lines.join('\n');
}

function getSeverityIcon(severity: number): string {
  switch (severity) {
    case 1: return '❌'; // Error
    case 2: return '⚠️';  // Warning
    case 3: return 'ℹ️';  // Information
    case 4: return '💡'; // Hint
    default: return '❓';
  }
}

function getSeverityName(severity: number): string {
  switch (severity) {
    case 1: return 'Error';
    case 2: return 'Warning';
    case 3: return 'Information';
    case 4: return 'Hint';
    default: return 'Unknown';
  }
}

/**
 * Initialize or get existing language server instance via the server manager.
 *
 * - Respects `searchPath` and `workspaceUri` on every call
 * - Restarts the server when configuration changes
 * - Uses session-isolated cache directories
 */
async function getLanguageServer(
  options: LanguageServerOptions = {},
  workspaceUri?: string,
): Promise<import('../../lib/language-server').CodeQLLanguageServer> {
  const { packageRootDir: pkgRoot } = await import('../../utils/package-paths');

  const config: LanguageServerConfig = {
    checkErrors: 'ON_CHANGE',
    loglevel: options.loglevel ?? 'WARN',
    searchPath: options.searchPath ?? resolve(pkgRoot, 'ql'),
    synchronous: options.synchronous,
    verbosity: options.verbosity,
  };

  const manager = getServerManager();
  const languageServer = await manager.getLanguageServer(config);

  // Normalize workspace URI: resolve relative / bare directory paths to
  // file:// URIs against getUserWorkspaceDir() (respects CODEQL_MCP_WORKSPACE).
  let effectiveUri = workspaceUri;
  if (effectiveUri && !effectiveUri.startsWith('file://')) {
    const { getUserWorkspaceDir } = await import('../../utils/package-paths');
    const absWorkspace = isAbsolute(effectiveUri)
      ? effectiveUri
      : resolve(getUserWorkspaceDir(), effectiveUri);
    effectiveUri = pathToFileURL(absWorkspace).href;
  }
  effectiveUri = effectiveUri ?? pathToFileURL(resolve(pkgRoot, 'ql')).href;
  await languageServer.initialize(effectiveUri);

  return languageServer;
}

/**
 * Evaluate QL code using the CodeQL Language Server and return diagnostics.
 */
export async function lspDiagnostics({
  qlCode,
  workspaceUri,
  serverOptions = {}
}: LspDiagnosticsParams): Promise<LspDiagnosticsResult> {
  try {
    logger.info('Evaluating QL code via Language Server...');

    const languageServer = await getLanguageServer(serverOptions, workspaceUri);

    // Generate unique URI for this evaluation
    const evalUri = pathToFileURL(join(getProjectTmpDir('lsp-eval'), `eval_${Date.now()}.ql`)).href;

    const diagnostics = await languageServer.evaluateQL(qlCode, evalUri);

    // Count diagnostics by severity
    const summary = {
      errorCount: diagnostics.filter(d => d.severity === 1).length,
      hintCount: diagnostics.filter(d => d.severity === 4).length,
      infoCount: diagnostics.filter(d => d.severity === 3).length,
      warningCount: diagnostics.filter(d => d.severity === 2).length,
    };

    const isValid = summary.errorCount === 0;
    const formattedOutput = formatDiagnostics(diagnostics);

    logger.info(`QL evaluation complete. Valid: ${isValid}, Issues: ${diagnostics.length}`);

    return {
      diagnostics,
      formattedOutput,
      isValid,
      summary,
    };

  } catch (error) {
    logger.error('Error evaluating QL code:', error);
    throw new Error(`QL evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Shutdown the language server via the server manager.
 */
export async function shutdownDiagnosticsServer(): Promise<void> {
  const manager = getServerManager();
  await manager.shutdownServer('language');
}

/**
 * Register the codeql_lsp_diagnostics tool with the MCP server.
 */
export function registerLspDiagnosticsTool(server: McpServer): void {
  server.tool(
    'codeql_lsp_diagnostics',
    'Authoritative syntax and semantic validation of CodeQL (QL) code via the CodeQL Language Server. Compiles the query and provides real-time diagnostics with precise error locations. Use this for accurate validation; for quick heuristic checks without compilation, use validate_codeql_query instead. Note: inline ql_code is evaluated as a virtual document and cannot resolve pack imports (e.g. `import javascript`). For validating queries with imports, use codeql_query_compile on the actual file instead.',
    {
      log_level: z.enum(['OFF', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE', 'ALL']).optional().describe('Language server log level'),
      ql_code: z.string().describe('The CodeQL (QL) code to evaluate for syntax and semantic errors'),
      search_path: z.string().optional().describe('Optional search path for CodeQL libraries'),
      workspace_uri: z.string().optional().describe('Optional workspace URI for context (defaults to ./ql directory)'),
    },
    async ({ ql_code, workspace_uri, search_path, log_level }) => {
      try {
        const serverOptions: LanguageServerOptions = {};

        if (search_path) {
          serverOptions.searchPath = search_path;
        }
        if (log_level) {
          serverOptions.loglevel = log_level;
        }

        const result = await lspDiagnostics({
          qlCode: ql_code,
          serverOptions,
          workspaceUri: workspace_uri,
        });

        // Return structured result
        const responseContent = {
          diagnostics: result.diagnostics.map(d => ({
            code: d.code,
            column: d.range.start.character + 1, // Convert to 1-based column numbers
            line: d.range.start.line + 1, // Convert to 1-based line numbers
            message: d.message,
            severity: getSeverityName(d.severity),
            source: d.source,
          })),
          formattedOutput: result.formattedOutput,
          isValid: result.isValid,
          summary: result.summary,
        };

        return {
          content: [
            {
              text: JSON.stringify(responseContent, null, 2),
              type: 'text',
            }
          ],
        };

      } catch (error) {
        logger.error('Error in codeql_lsp_diagnostics tool:', error);
        return {
          content: [
            {
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
              type: 'text',
            },
          ],
          isError: true,
        };
      }
    }
  );

  // NOTE: Cleanup is handled centrally by shutdownServerManager() in
  // codeql-development-mcp-server.ts (setupGracefulShutdown). Registering
  // additional process.on('SIGINT'/'SIGTERM') handlers here would
  // accumulate on repeated calls and is unnecessary.
}
