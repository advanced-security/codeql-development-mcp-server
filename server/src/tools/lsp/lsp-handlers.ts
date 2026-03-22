/**
 * CodeQL LSP tool handlers.
 *
 * Bridges MCP tool invocations to LSP requests on the CodeQL Language Server.
 * Each handler acquires a language server via the CodeQLServerManager,
 * opens the requested document, sends the LSP request, and returns the result.
 */

import { readFile } from 'fs/promises';
import { isAbsolute, resolve } from 'path';
import { pathToFileURL } from 'url';

import {
  CompletionItem,
  DocumentSymbol,
  LSPLocation,
  SymbolInformation,
  TextDocumentPositionParams,
} from '../../lib/language-server';
import { logger } from '../../utils/logger';
import { getUserWorkspaceDir } from '../../utils/package-paths';
import { getInitializedLanguageServer } from './lsp-server-helper';

/**
 * Common parameters for LSP tool invocations.
 */
export interface LSPToolParams {
  /** 0-based character offset within the line. */
  character: number;
  /** Optional override for the file content (if not reading from disk). */
  fileContent?: string;
  /**
   * Path to the QL file. May be absolute or relative.
   * Relative paths are resolved against `getUserWorkspaceDir()`
   * (respects the `CODEQL_MCP_WORKSPACE` environment variable).
   */
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
  return getInitializedLanguageServer({
    serverOptions: { searchPath: params.searchPath },
    workspaceUri: params.workspaceUri,
  });
}

/**
 * Resolve the file path to an absolute path and file:// URI.
 */
function prepareDocumentPosition(
  params: LSPToolParams,
): { absPath: string; docUri: string } {
  // Resolve relative paths against getUserWorkspaceDir() so that
  // CODEQL_MCP_WORKSPACE is respected and behaviour is consistent across tools.
  const absPath = isAbsolute(params.filePath)
    ? params.filePath
    : resolve(getUserWorkspaceDir(), params.filePath);
  const docUri = pathToFileURL(absPath).href;

  return { absPath, docUri };
}

/**
 * Read file content and open the document in the language server.
 */
async function openDocumentForPosition(
  server: Awaited<ReturnType<typeof getInitializedServer>>,
  params: LSPToolParams,
  absPath: string,
  docUri: string,
): Promise<TextDocumentPositionParams> {
  // Read file content from disk or use provided content
  let text: string;
  if (params.fileContent) {
    text = params.fileContent;
  } else {
    try {
      text = await readFile(absPath, 'utf-8');
    } catch (error) {
      throw new Error(`Cannot read file: ${absPath}: ${error instanceof Error ? error.message : error}`, { cause: error });
    }
  }

  // Open the document so the language server knows about it
  server.openDocument(docUri, text);

  return {
    position: { character: params.character, line: params.line },
    textDocument: { uri: docUri },
  };
}

/**
 * Get code completions at a position.
 */
export async function lspCompletion(params: LSPToolParams): Promise<CompletionItem[]> {
  logger.info(`LSP completion at ${params.filePath}:${params.line}:${params.character}`);
  const server = await getInitializedServer(params);
  const { absPath, docUri } = prepareDocumentPosition(params);
  const positionParams = await openDocumentForPosition(server, params, absPath, docUri);

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
  const { absPath, docUri } = prepareDocumentPosition(params);
  const positionParams = await openDocumentForPosition(server, params, absPath, docUri);

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
  const { absPath, docUri } = prepareDocumentPosition(params);
  const positionParams = await openDocumentForPosition(server, params, absPath, docUri);

  try {
    return await server.getReferences({
      ...positionParams,
      context: { includeDeclaration: true },
    });
  } finally {
    server.closeDocument(docUri);
  }
}

/**
 * File-level parameters for LSP tools that do not require a position.
 */
export interface LSPToolFileParams {
  /** Optional override for the file content (if not reading from disk). */
  fileContent?: string;
  /** Path to the QL file. May be absolute or relative. */
  filePath: string;
  /** Optional search path for CodeQL libraries. */
  searchPath?: string;
  /** Optional workspace URI for context. */
  workspaceUri?: string;
}

/**
 * List all top-level document symbols (classes, predicates, modules) in a file.
 */
export async function lspDocumentSymbols(
  params: LSPToolFileParams,
): Promise<DocumentSymbol[] | SymbolInformation[]> {
  logger.info(`LSP documentSymbol for ${params.filePath}`);
  const server = await getInitializedLanguageServer({
    serverOptions: { searchPath: params.searchPath },
    workspaceUri: params.workspaceUri,
  });
  const paramsWithPosition: LSPToolParams = {
    character: 0,
    line: 0,
    ...params,
  };
  const { absPath, docUri } = prepareDocumentPosition(paramsWithPosition);
  await openDocumentForPosition(server, paramsWithPosition, absPath, docUri);

  try {
    return await server.getDocumentSymbols({ textDocument: { uri: docUri } });
  } finally {
    server.closeDocument(docUri);
  }
}

export function extractNamesFromDocumentSymbols(symbols: DocumentSymbol[] | SymbolInformation[]): string[] {
  /**
   * Recursively collect symbol names from a DocumentSymbol tree.
   */
  let symbolNames: string[] = [];
  function collectSymbolNames(symbols: (DocumentSymbol | SymbolInformation)[]): void {
    symbols.forEach((s) => {
      const sym = s as { name?: string };
      symbolNames.push(sym.name ?? '(unknown)');
      // Only recurse into children if this is a DocumentSymbol (not SymbolInformation)
      if ('children' in sym && Array.isArray(sym.children)) {
        collectSymbolNames(sym.children);
      }
    });
  }

  collectSymbolNames(symbols);

  return symbolNames
}