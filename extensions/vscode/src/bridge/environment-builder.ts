import * as vscode from 'vscode';
import { delimiter, isAbsolute, join } from 'path';
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

    // Workspace root and all workspace folders
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      env.CODEQL_MCP_WORKSPACE = workspaceFolders[0].uri.fsPath;
      env.CODEQL_MCP_WORKSPACE_FOLDERS = workspaceFolders
        .map((f) => f.uri.fsPath)
        .join(delimiter);
    }

    // Workspace-local scratch directory for tool output (query logs, etc.)
    // Defaults to `.codeql/ql-mcp` within the first workspace folder.
    // This is also used as CODEQL_MCP_TMP_DIR so that the server writes
    // all temporary output (query logs, external predicate CSVs) inside
    // the workspace, avoiding out-of-workspace file access prompts.
    const scratchRelative = config.get<string>('scratchDir', '.codeql/ql-mcp');
    if (workspaceFolders && workspaceFolders.length > 0) {
      const scratchDir = isAbsolute(scratchRelative)
        ? scratchRelative
        : join(workspaceFolders[0].uri.fsPath, scratchRelative);
      env.CODEQL_MCP_SCRATCH_DIR = scratchDir;
      env.CODEQL_MCP_TMP_DIR = scratchDir;
    } else {
      // No workspace — fall back to extension globalStorage
      env.CODEQL_MCP_TMP_DIR = join(
        this.context.globalStorageUri.fsPath,
        'tmp',
      );
    }

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

    env.CODEQL_ADDITIONAL_PACKS = additionalPaths.join(delimiter);

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
      try {
        await copier.syncAll(sourceDirs);
        dbDirs = [managedDir, ...userDbDirs];
      } catch (err) {
        this.logger.error(
          `Database copy failed, falling back to source dirs: ${err instanceof Error ? err.message : String(err)}`,
        );
        dbDirs = [...sourceDirs, ...userDbDirs];
      }
    } else {
      dbDirs = [...sourceDirs, ...userDbDirs];
    }
    env.CODEQL_DATABASES_BASE_DIRS = dbDirs.join(delimiter);

    // MRVA run results directory for variant analysis discovery
    const mrvaDirs = [this.storagePaths.getVariantAnalysisStoragePath()];
    const userMrvaDirs = config.get<string[]>('additionalMrvaRunResultsDirs', []);
    mrvaDirs.push(...userMrvaDirs);
    env.CODEQL_MRVA_RUN_RESULTS_DIRS = mrvaDirs.join(delimiter);

    // Query run results directory for query history discovery
    const queryDirs = [this.storagePaths.getQueryStoragePath()];
    const userQueryDirs = config.get<string[]>('additionalQueryRunResultsDirs', []);
    queryDirs.push(...userQueryDirs);
    env.CODEQL_QUERY_RUN_RESULTS_DIRS = queryDirs.join(delimiter);

    // Annotation, audit, and cache tools — enabled by default (Design 5).
    // The setting controls ENABLE_ANNOTATION_TOOLS and defaults
    // MONITORING_STORAGE_LOCATION to the scratch directory so tools work
    // out-of-the-box without manual env var configuration.
    // Respect values inherited from the extension host process environment;
    // only apply defaults when not already defined there. The additionalEnv
    // block below still overrides everything for advanced users.
    const enableAnnotations = config.get<boolean>('enableAnnotationTools', true);
    if (typeof process.env.ENABLE_ANNOTATION_TOOLS === 'string') {
      env.ENABLE_ANNOTATION_TOOLS = process.env.ENABLE_ANNOTATION_TOOLS;
    } else {
      env.ENABLE_ANNOTATION_TOOLS = enableAnnotations ? 'true' : 'false';
    }
    if (typeof process.env.MONITORING_STORAGE_LOCATION === 'string') {
      env.MONITORING_STORAGE_LOCATION = process.env.MONITORING_STORAGE_LOCATION;
    } else if (enableAnnotations && env.CODEQL_MCP_SCRATCH_DIR) {
      env.MONITORING_STORAGE_LOCATION = env.CODEQL_MCP_SCRATCH_DIR;
    }

    // User-configured additional environment variables (overrides above defaults)
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
