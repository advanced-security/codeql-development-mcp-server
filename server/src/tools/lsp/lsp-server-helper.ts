/**
 * Shared helper for obtaining a running, initialized CodeQL Language Server.
 *
 * Both `lsp-diagnostics.ts` and `lsp-handlers.ts` need to:
 * 1. Build a `LanguageServerConfig` with sensible defaults
 * 2. Obtain a server instance from the `CodeQLServerManager`
 * 3. Resolve a workspace URI (relative → absolute → `file://`)
 * 4. Initialize the server with the resolved workspace
 *
 * Centralizing this logic avoids duplication and ensures consistent
 * default behaviour across all LSP tools.
 */

import { isAbsolute, resolve } from 'path';
import { pathToFileURL } from 'url';

import { CodeQLLanguageServer, LanguageServerOptions } from '../../lib/language-server';
import { LanguageServerConfig } from '../../lib/server-config';
import { getServerManager } from '../../lib/server-manager';
import { logger } from '../../utils/logger';

/**
 * Options accepted by {@link getInitializedLanguageServer}.
 */
export interface InitializedServerOptions {
  /** Language-server-level options (loglevel, searchPath, etc.). */
  serverOptions?: LanguageServerOptions;
  /** Workspace URI — may be a `file://` URI, absolute path, or relative path. */
  workspaceUri?: string;
}

/**
 * Return a running, initialized `CodeQLLanguageServer`.
 *
 * - Resolves `searchPath` to the bundled `ql` directory when not provided.
 * - Converts relative / bare-directory `workspaceUri` paths to `file://` URIs
 *   resolved against `getUserWorkspaceDir()` (respects `CODEQL_MCP_WORKSPACE`).
 * - Falls back to the bundled `ql` directory when no workspace is given.
 * - Delegates lifecycle management to the global `CodeQLServerManager`.
 */
export async function getInitializedLanguageServer(
  opts: InitializedServerOptions = {},
): Promise<CodeQLLanguageServer> {
  const { packageRootDir: pkgRoot, getUserWorkspaceDir } = await import('../../utils/package-paths');
  const options = opts.serverOptions ?? {};

  const config: LanguageServerConfig = {
    checkErrors: 'ON_CHANGE',
    loglevel: options.loglevel ?? 'WARN',
    searchPath: options.searchPath ?? resolve(pkgRoot, 'ql'),
    synchronous: options.synchronous,
    verbosity: options.verbosity,
  };

  const manager = getServerManager();
  const server = await manager.getLanguageServer(config);

  // Normalize workspace URI: convert relative / bare directory paths to
  // file:// URIs against getUserWorkspaceDir() (respects CODEQL_MCP_WORKSPACE).
  let effectiveUri = opts.workspaceUri;
  if (effectiveUri && !effectiveUri.startsWith('file://')) {
    const absWorkspace = isAbsolute(effectiveUri)
      ? effectiveUri
      : resolve(getUserWorkspaceDir(), effectiveUri);
    effectiveUri = pathToFileURL(absWorkspace).href;
  }
  effectiveUri = effectiveUri ?? pathToFileURL(resolve(pkgRoot, 'ql')).href;

  await server.initialize(effectiveUri);
  logger.debug(`Language server initialized with workspace: ${effectiveUri}`);

  return server;
}
