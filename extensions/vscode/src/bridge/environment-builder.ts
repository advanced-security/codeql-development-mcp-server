import * as vscode from 'vscode';
import { join } from 'path';
import { DisposableObject } from '../common/disposable';
import type { Logger } from '../common/logger';
import type { CliResolver } from '../codeql/cli-resolver';
import type { StoragePaths } from './storage-paths';

/**
 * Assembles the environment variables for the MCP server process.
 *
 * Combines:
 *  - Resolved CodeQL CLI path
 *  - Workspace root path
 *  - vscode-codeql storage paths (for CODEQL_ADDITIONAL_PACKS)
 *  - User-configured additional env vars
 *  - Fixed transport mode (stdio)
 *
 * Results are cached. Call `invalidate()` when any input changes.
 */
export class EnvironmentBuilder extends DisposableObject {
  private cachedEnv: Record<string, string> | null = null;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly cliResolver: CliResolver,
    private readonly storagePaths: StoragePaths,
    private readonly logger: Logger,
  ) {
    super();
  }

  /** Invalidate the cached environment so the next `build()` recomputes. */
  invalidate(): void {
    this.cachedEnv = null;
  }

  /** Build the full environment object for the MCP server process. */
  async build(): Promise<Record<string, string>> {
    if (this.cachedEnv) {
      return this.cachedEnv;
    }

    const env: Record<string, string> = {};

    // Transport mode is always stdio when launched from VS Code
    env.TRANSPORT_MODE = 'stdio';

    // CodeQL CLI path
    const cliPath = await this.cliResolver.resolve();
    if (cliPath) {
      env.CODEQL_PATH = cliPath;
    }

    // Workspace root
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      env.CODEQL_MCP_WORKSPACE = workspaceFolders[0].uri.fsPath;
    }

    // Temp directory for MCP server scratch files
    env.CODEQL_MCP_TMP_DIR = join(
      this.context.globalStorageUri.fsPath,
      'tmp',
    );

    // Additional packs path — include vscode-codeql's database storage
    // so the MCP server can discover databases registered there
    const additionalPaths = [
      this.storagePaths.getDatabaseStoragePath(),
    ];

    // Also include workspace folder paths
    if (workspaceFolders) {
      for (const folder of workspaceFolders) {
        additionalPaths.push(folder.uri.fsPath);
      }
    }

    env.CODEQL_ADDITIONAL_PACKS = additionalPaths.join(':');

    // Database discovery directory for list_codeql_databases
    env.CODEQL_DATABASES_BASE_DIRS = this.storagePaths.getDatabaseStoragePath();

    // MRVA run results directory for variant analysis discovery
    env.CODEQL_MRVA_RUN_RESULTS_DIRS = this.storagePaths.getVariantAnalysisStoragePath();

    // Query run results directory for query history discovery
    env.CODEQL_QUERY_RUN_RESULTS_DIRS = this.storagePaths.getQueryStoragePath();

    // User-configured additional environment variables
    const config = vscode.workspace.getConfiguration('codeql-mcp');
    const additionalEnv = config.get<Record<string, string>>('additionalEnv', {});
    for (const [key, value] of Object.entries(additionalEnv)) {
      env[key] = value;
    }

    this.logger.debug(
      `Built MCP server environment: ${Object.keys(env).join(', ')}`,
    );
    this.cachedEnv = env;
    return env;
  }
}
