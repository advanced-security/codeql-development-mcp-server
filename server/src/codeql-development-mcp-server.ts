/**
 * CodeQL Development MCP McpServer
 * Main entry point for the server
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { registerCodeQLTools, registerCodeQLResources } from './tools';
import { registerLSPTools } from './tools/lsp';
import { registerLanguageResources } from './resources/language-resources';
import { registerWorkflowPrompts } from './prompts/workflow-prompts';
import { registerMonitoringTools } from './tools/monitoring-tools';
import { sessionDataManager } from './lib/session-data-manager';
import { resolveCodeQLBinary, validateCodeQLBinaryReachable } from './lib/cli-executor';
import { initServerManager, shutdownServerManager } from './lib/server-manager';
import { packageRootDir } from './utils/package-paths';
import { logger } from './utils/logger';

// Load environment variables from a .env file co-located with the package root.
// Uses the package directory (not CWD) so that npm-installed users don't
// accidentally inherit a .env from their project.
dotenv.config({ path: resolve(packageRootDir, '.env') });

const PACKAGE_NAME = 'codeql-development-mcp-server';
const VERSION = '2.24.1';

/**
 * Start the MCP server
 */
export async function startServer(mode: 'stdio' | 'http' = 'stdio'): Promise<McpServer> {
  logger.info(`Starting CodeQL Development MCP McpServer v${VERSION} in ${mode} mode`);

  // Resolve the CodeQL CLI binary path (honors CODEQL_PATH env var).
  // This must happen before any tool registration so that all CodeQL commands
  // use the user-specified binary.
  const codeqlBinary = resolveCodeQLBinary();
  logger.info(`CodeQL CLI binary: ${codeqlBinary}`);

  // Validate that the resolved binary is actually callable. This catches
  // misconfigurations early (e.g. codeql not on PATH and CODEQL_PATH unset)
  // instead of failing silently and producing confusing tool-level errors.
  const codeqlVersion = await validateCodeQLBinaryReachable();
  logger.info(`CodeQL CLI version: ${codeqlVersion}`);

  const server = new McpServer({
    name: PACKAGE_NAME,
    version: VERSION,
  });

  // Register CodeQL tools (legacy high-level helpers)
  registerCodeQLTools(server);

  // Register LSP-based tools (diagnostics, completion, definition, references)
  registerLSPTools(server);

  // Register CodeQL resources (static guides)
  registerCodeQLResources(server);

  // Register language-specific resources (AST references, security patterns)
  registerLanguageResources(server);

  // Register high-level workflow prompts (complete development workflows)
  registerWorkflowPrompts(server);

  // Register monitoring and reporting tools
  registerMonitoringTools(server);

  // Initialize session data manager
  await sessionDataManager.initialize();

  // Initialize the CodeQL background server manager and eagerly start the
  // language server and CLI server JVMs so they are warm when the first tool
  // calls arrive.  This avoids 2-60 s cold-start penalties per JVM.
  const manager = initServerManager();
  Promise.all([
    manager.warmUpLanguageServer(),
    manager.warmUpCLIServer(),
  ]).catch(() => { /* individual errors logged inside each warm-up method */ });

  if (mode === 'stdio') {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    logger.info('McpServer started successfully on STDIO transport');
  } else {
    // HTTP mode
    const app = express();
    app.use(cors());
    app.use(express.json());

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => Math.random().toString(36).substring(7),
    });
    await server.connect(transport);

    app.all('/mcp', (req, res) => {
      transport.handleRequest(req, res, req.body).catch((err) => {
        logger.error('Error handling MCP request:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal McpServer Error' });
        }
      });
    });

    app.get('/', (_req, res) => {
      res.json({
        name: PACKAGE_NAME,
        version: VERSION,
        description: 'CodeQL Development MCP McpServer',
        status: 'running',
      });
    });

    const host = process.env.HTTP_HOST || 'localhost';
    const port = Number(process.env.HTTP_PORT || process.env.PORT) || 3000;
    
    // Return a promise that keeps the process alive
    return new Promise<void>((resolve, reject) => {
      const httpServer = app.listen(port, host, () => {
        logger.info(`HTTP server listening on http://${host}:${port}/mcp`);
        resolve();
      });
      
      httpServer.on('error', (error) => {
        logger.error('HTTP server error:', error);
        reject(error);
      });
    });
  }

  setupGracefulShutdown(server);
  return server;
}

/**
 * Set up graceful shutdown handling
 */
function setupGracefulShutdown(server: McpServer): void {
  const shutdown = async () => {
    logger.info('Shutting down server...');
    try {
      // Shut down all CodeQL background servers first
      await shutdownServerManager();
      await server.close();
      logger.info('McpServer closed gracefully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

/**
 * Main function to start the server
 */
async function main(): Promise<void> {
  try {
    const transportMode = (process.env.TRANSPORT_MODE || 'stdio').toLowerCase();
    const mode: 'stdio' | 'http' = transportMode === 'http' ? 'http' : 'stdio';
    await startServer(mode);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
const scriptPath = process.argv[1] ? resolve(process.argv[1]) : undefined;
if (scriptPath && import.meta.url === pathToFileURL(scriptPath).href) {
  main();
}
