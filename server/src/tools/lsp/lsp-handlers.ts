/**
 * CodeQL LSP tool handlers.
 *
 * Bridges MCP tool invocations to LSP requests on the CodeQL Language Server.
 * Each handler acquires a language server via the CodeQLServerManager,
 * opens the requested document, sends the LSP request, and returns the result.
 */

import { LanguageServerConfig } from '../../lib/server-config';
import { getServerManager } from '../../lib/server-manager';
import {
  CompletionItem,
  LSPLocation,
  TextDocumentPositionParams,
} from '../../lib/language-server';
import { logger } from '../../utils/logger';
import { readFileSync } from 'fs';
import { pathToFileURL } from 'url';
import { isAbsolute, resolve } from 'path';

/**
 * Common parameters for LSP tool invocations.
 */
export interface LSPToolParams {
  /** 0-based character offset within the line. */
  character: number;
  /** Optional override for the file content (if not reading from disk). */
  fileContent?: string;
  /** Absolute path to the QL file. */
  filePath: string;
  /** 0-based line number in the document. */
  line: number;
  /** Optional search path for CodeQL libraries. */
  searchPath?: string;
  /** Optional workspace URI for context. */
  workspaceUri?: string;
}

/**
 * Get a running, initialized language server for the given parameters.
 */
async function getInitializedServer(params: LSPToolParams) {
  const { packageRootDir: pkgRoot } = await import('../../utils/package-paths');

  const config: LanguageServerConfig = {
    checkErrors: 'ON_CHANGE',
    loglevel: 'WARN',
    searchPath: params.searchPath ?? resolve(pkgRoot, 'ql'),
  };

  const manager = getServerManager();
  const server = await manager.getLanguageServer(config);

  const effectiveUri = params.workspaceUri ?? pathToFileURL(resolve(pkgRoot, 'ql')).href;
  await server.initialize(effectiveUri);

  return server;
}

/**
 * Build TextDocumentPositionParams and ensure the document is open.
 */
function prepareDocumentPosition(
  server: Awaited<ReturnType<typeof getInitializedServer>>,
  params: LSPToolParams,
): { docUri: string; positionParams: TextDocumentPositionParams } {
  // Resolve relative paths against CWD (supports integration test fixtures)
  const absPath = isAbsolute(params.filePath) ? params.filePath : resolve(process.cwd(), params.filePath);
  const docUri = pathToFileURL(absPath).href;

  // Read file content from disk or use provided content
  let text: string;
  if (params.fileContent) {
    text = params.fileContent;
  } else {
    try {
      text = readFileSync(absPath, 'utf-8');
    } catch (error) {
      throw new Error(`Cannot read file: ${absPath}: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Open the document so the language server knows about it
  server.openDocument(docUri, text);

  const positionParams: TextDocumentPositionParams = {
    position: { character: params.character, line: params.line },
    textDocument: { uri: docUri },
  };

  return { docUri, positionParams };
}

/**
 * Get code completions at a position.
 */
export async function lspCompletion(params: LSPToolParams): Promise<CompletionItem[]> {
  logger.info(`LSP completion at ${params.filePath}:${params.line}:${params.character}`);
  const server = await getInitializedServer(params);
  const { docUri, positionParams } = prepareDocumentPosition(server, params);

  try {
    return await server.getCompletions(positionParams);
  } finally {
    server.closeDocument(docUri);
  }
}

/**
 * Go to definition of a symbol at a position.
 */
export async function lspDefinition(params: LSPToolParams): Promise<LSPLocation[]> {
  logger.info(`LSP definition at ${params.filePath}:${params.line}:${params.character}`);
  const server = await getInitializedServer(params);
  const { docUri, positionParams } = prepareDocumentPosition(server, params);

  try {
    return await server.getDefinition(positionParams);
  } finally {
    server.closeDocument(docUri);
  }
}

/**
 * Find all references to a symbol at a position.
 */
export async function lspReferences(params: LSPToolParams): Promise<LSPLocation[]> {
  logger.info(`LSP references at ${params.filePath}:${params.line}:${params.character}`);
  const server = await getInitializedServer(params);
  const { docUri, positionParams } = prepareDocumentPosition(server, params);

  try {
    return await server.getReferences({
      ...positionParams,
      context: { includeDeclaration: true },
    });
  } finally {
    server.closeDocument(docUri);
  }
}
