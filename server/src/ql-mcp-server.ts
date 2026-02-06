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
import { pathToFileURL } from 'url';
import { registerCodeQLTools, registerCodeQLResources } from './tools';
import { registerLanguageResources } from './resources/language-resources';
import { registerWorkflowPrompts } from './prompts/workflow-prompts';
import { registerMonitoringTools } from './tools/monitoring-tools';
import { sessionDataManager } from './lib/session-data-manager';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const PACKAGE_NAME = 'codeql-development-mcp-server';
const VERSION = '1.0.0';

/**
 * Start the MCP server
 */
export async function startServer(mode: 'stdio' | 'http' = 'stdio'): Promise<McpServer> {
  logger.info(`Starting CodeQL Development MCP McpServer v${VERSION} in ${mode} mode`);

  const server = new McpServer({
    name: PACKAGE_NAME,
    version: VERSION,
  });

  // Register CodeQL tools (legacy high-level helpers)
  registerCodeQLTools(server);

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
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
