import * as vscode from 'vscode';
import { join } from 'path';
import { DisposableObject } from '../common/disposable';
import type { Logger } from '../common/logger';
import type { CliResolver } from '../codeql/cli-resolver';
import type { StoragePaths } from './storage-paths';
import { DatabaseCopier } from './database-copier';

/** Factory that creates a DatabaseCopier for a given destination. */
export type DatabaseCopierFactory = (dest: string, logger: Logger) => DatabaseCopier;

const defaultCopierFactory: DatabaseCopierFactory = (dest, logger) =>
  new DatabaseCopier(dest, logger);

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
  private readonly copierFactory: DatabaseCopierFactory;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly cliResolver: CliResolver,
    private readonly storagePaths: StoragePaths,
    private readonly logger: Logger,
    copierFactory?: DatabaseCopierFactory,
  ) {
    super();
    this.copierFactory = copierFactory ?? defaultCopierFactory;
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

    // User configuration
    const config = vscode.workspace.getConfiguration('codeql-mcp');

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

    // Database discovery directories for list_codeql_databases
    // Includes: global storage, workspace storage, and user-configured dirs
    const sourceDirs = this.storagePaths.getAllDatabaseStoragePaths();
    const userDbDirs = config.get<string[]>('additionalDatabaseDirs', []);

    // When copyDatabases is enabled, copy databases from vscode-codeql
    // storage to our own managed directory, removing query-server lock
    // files so the MCP server CLI can operate without contention.
    const copyEnabled = config.get<boolean>('copyDatabases', true);
    let dbDirs: string[];
    if (copyEnabled) {
      const managedDir = this.storagePaths.getManagedDatabaseStoragePath();
      const copier = this.copierFactory(managedDir, this.logger);
      copier.syncAll(sourceDirs);
      dbDirs = [managedDir, ...userDbDirs];
    } else {
      dbDirs = [...sourceDirs, ...userDbDirs];
    }
    env.CODEQL_DATABASES_BASE_DIRS = dbDirs.join(':');

    // MRVA run results directory for variant analysis discovery
    const mrvaDirs = [this.storagePaths.getVariantAnalysisStoragePath()];
    const userMrvaDirs = config.get<string[]>('additionalMrvaRunResultsDirs', []);
    mrvaDirs.push(...userMrvaDirs);
    env.CODEQL_MRVA_RUN_RESULTS_DIRS = mrvaDirs.join(':');

    // Query run results directory for query history discovery
    const queryDirs = [this.storagePaths.getQueryStoragePath()];
    const userQueryDirs = config.get<string[]>('additionalQueryRunResultsDirs', []);
    queryDirs.push(...userQueryDirs);
    env.CODEQL_QUERY_RUN_RESULTS_DIRS = queryDirs.join(':');

    // User-configured additional environment variables
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
