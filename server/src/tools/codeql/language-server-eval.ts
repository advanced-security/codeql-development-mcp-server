/**
 * CodeQL Language Server Eval tool for MCP server
 * Provides real-time QL code validation through LSP communication
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CodeQLLanguageServer, Diagnostic, LanguageServerOptions } from '../../lib/language-server';
import { logger } from '../../utils/logger';
import { getProjectTmpDir } from '../../utils/temp-dir';
import { resolve } from 'path';

// Global language server instance for reuse across evaluations
let globalLanguageServer: CodeQLLanguageServer | null = null;

export interface LanguageServerEvalParams {
  qlCode: string;
  workspaceUri?: string;
  serverOptions?: LanguageServerOptions;
}

export interface LanguageServerEvalResult {
  isValid: boolean;
  diagnostics: Diagnostic[];
  summary: {
    errorCount: number;
    warningCount: number;
    infoCount: number;
    hintCount: number;
  };
  formattedOutput: string;
}

/**
 * Format diagnostics for human-readable output
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
 * Initialize or get existing language server instance
 */
async function getLanguageServer(options: LanguageServerOptions = {}): Promise<CodeQLLanguageServer> {
  if (globalLanguageServer && globalLanguageServer.isRunning()) {
    return globalLanguageServer;
  }

  // Set default options
  const defaultOptions: LanguageServerOptions = {
    searchPath: resolve(process.cwd(), 'ql'),
    loglevel: 'WARN',
    ...options
  };

  globalLanguageServer = new CodeQLLanguageServer(defaultOptions);
  
  try {
    await globalLanguageServer.start();
    
    // Use provided workspace URI or default to ql directory
    const workspaceUri = `file://${resolve(process.cwd(), 'ql')}`;
    await globalLanguageServer.initialize(workspaceUri);
    
    logger.info('CodeQL Language Server started and initialized successfully');
    return globalLanguageServer;
  } catch (error) {
    logger.error('Failed to start language server:', error);
    globalLanguageServer = null;
    throw error;
  }
}

/**
 * Evaluate QL code using the CodeQL Language Server
 */
export async function evaluateQLCode({
  qlCode,
  workspaceUri: _workspaceUri,
  serverOptions = {}
}: LanguageServerEvalParams): Promise<LanguageServerEvalResult> {
  try {
    logger.info('Evaluating QL code via Language Server...');
    
    const languageServer = await getLanguageServer(serverOptions);
    
    // Generate unique URI for this evaluation
    const evalUri = `file://${getProjectTmpDir('lsp-eval')}/eval_${Date.now()}.ql`;
    
    const diagnostics = await languageServer.evaluateQL(qlCode, evalUri);
    
    // Count diagnostics by severity
    const summary = {
      errorCount: diagnostics.filter(d => d.severity === 1).length,
      warningCount: diagnostics.filter(d => d.severity === 2).length,
      infoCount: diagnostics.filter(d => d.severity === 3).length,
      hintCount: diagnostics.filter(d => d.severity === 4).length
    };
    
    const isValid = summary.errorCount === 0;
    const formattedOutput = formatDiagnostics(diagnostics);
    
    logger.info(`QL evaluation complete. Valid: ${isValid}, Issues: ${diagnostics.length}`);
    
    return {
      isValid,
      diagnostics,
      summary,
      formattedOutput
    };
    
  } catch (error) {
    logger.error('Error evaluating QL code:', error);
    throw new Error(`QL evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Shutdown the global language server
 */
export async function shutdownLanguageServer(): Promise<void> {
  if (globalLanguageServer) {
    logger.info('Shutting down CodeQL Language Server...');
    await globalLanguageServer.shutdown();
    globalLanguageServer = null;
  }
}

/**
 * Register the language server eval tool with the MCP server
 */
export function registerLanguageServerEvalTool(server: McpServer): void {
  server.tool(
    'codeql_language_server_eval',
    'Authoritative syntax and semantic validation of CodeQL (QL) code via the CodeQL Language Server. Compiles the query and provides real-time diagnostics with precise error locations. Use this for accurate validation; for quick heuristic checks without compilation, use validate_codeql_query instead.',
    {
      ql_code: z.string().describe('The CodeQL (QL) code to evaluate for syntax and semantic errors'),
      workspace_uri: z.string().optional().describe('Optional workspace URI for context (defaults to ./ql directory)'),
      search_path: z.string().optional().describe('Optional search path for CodeQL libraries'),
      log_level: z.enum(['OFF', 'ERROR', 'WARN', 'INFO', 'DEBUG', 'TRACE', 'ALL']).optional().describe('Language server log level')
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
        
        const result = await evaluateQLCode({
          qlCode: ql_code,
          workspaceUri: workspace_uri,
          serverOptions
        });
        
        // Return structured result
        const responseContent = {
          isValid: result.isValid,
          summary: result.summary,
          formattedOutput: result.formattedOutput,
          diagnostics: result.diagnostics.map(d => ({
            line: d.range.start.line + 1, // Convert to 1-based line numbers
            column: d.range.start.character + 1, // Convert to 1-based column numbers
            severity: getSeverityName(d.severity),
            message: d.message,
            code: d.code,
            source: d.source
          }))
        };
        
        return {
          content: [
            { 
              type: 'text', 
              text: JSON.stringify(responseContent, null, 2) 
            }
          ],
        };
        
      } catch (error) {
        logger.error('Error in language server eval tool:', error);
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
  
  // Register cleanup on server shutdown
  process.on('SIGINT', async () => {
    await shutdownLanguageServer();
  });
  process.on('SIGTERM', async () => {
    await shutdownLanguageServer();
  });
}