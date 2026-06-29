import * as vscode from 'vscode';
import { existsSync } from 'fs';
import { delimiter, isAbsolute, join, normalize, relative } from 'path';
import { DisposableObject } from '../common/disposable';
import type { Logger } from '../common/logger';
import type { CliResolver } from '../codeql/cli-resolver';
import type { StoragePaths } from './storage-paths';
import { DatabaseCopier } from './database-copier';

/** Factory that creates a DatabaseCopier for a given destination. */
export type DatabaseCopierFactory = (dest: string, logger: Logger) => DatabaseCopier;

const defaultCopierFactory: DatabaseCopierFactory = (dest, logger) =>
  new DatabaseCopier(dest, logger);

/** Predicate used to test for the presence of a path on disk (injectable for tests). */
export type FileExists = (path: string) => boolean;

/** Default {@link FileExists} backed by the real filesystem. */
const defaultFileExists: FileExists = (p) => existsSync(p);

/** Name of the file that marks a folder as the root of a CodeQL workspace. */
const CODEQL_WORKSPACE_FILE = 'codeql-workspace.yml';

/** Link to the CodeQL workspaces documentation, surfaced in warnings/logs. */
const CODEQL_WORKSPACES_DOC_URL =
  'https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-workspaces';

/**
 * True when `folderPath` contains a top-level `codeql-workspace.yml` file.
 *
 * `codeql-workspace.yml` is the marker the CodeQL CLI uses to define a workspace
 * of related query/library packs (see {@link CODEQL_WORKSPACES_DOC_URL}). It
 * decides, by default, which multi-root workspace folders are treated as CodeQL
 * query/pack resolution roots.
 */
export function hasTopLevelCodeqlWorkspaceFile(
  folderPath: string,
  fileExists: FileExists = defaultFileExists,
): boolean {
  return fileExists(join(folderPath, CODEQL_WORKSPACE_FILE));
}

/** True when `child` is the same path as, or nested inside, `parent`. */
function isWithin(child: string, parent: string): boolean {
  if (child === parent) {
    return true;
  }
  const rel = relative(parent, child);
  return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
}

/**
 * Resolve user-configured directory entries to absolute candidate paths.
 *
 * Absolute entries are used verbatim; relative entries are resolved against
 * every workspace folder so that, in a multi-root workspace, a relative entry
 * like `queries` expands to one candidate per root. Blank entries are skipped.
 */
function resolveConfiguredDirs(
  entries: string[],
  workspaceFolderPaths: string[],
): string[] {
  const out: string[] = [];
  for (const entry of entries) {
    const trimmed = entry.trim();
    if (!trimmed) {
      continue;
    }
    if (isAbsolute(trimmed)) {
      out.push(normalize(trimmed));
    } else {
      for (const folder of workspaceFolderPaths) {
        out.push(normalize(join(folder, trimmed)));
      }
    }
  }
  return out;
}

/** Result of computing the CodeQL resolution roots. */
export interface ResolutionRootsResult {
  /** Ordered, de-duplicated resolution roots. */
  roots: string[];
  /**
   * True when the CodeQL-workspace requirement was active but no open folder
   * qualified (and no include dirs were configured), so the builder fell back
   * to using every workspace folder. The caller should surface a warning.
   */
  fellBackToAllFolders: boolean;
}

/**
 * Compute the ordered, de-duplicated set of directories used to resolve
 * CodeQL query/database/pack paths.
 *
 * By default (`codeql-mcp.requireCodeqlWorkspace` = true) only workspace folders
 * that contain a top-level `codeql-workspace.yml` are treated as automatic
 * resolution roots — matching the CodeQL CLI's own workspace model (see
 * {@link CODEQL_WORKSPACES_DOC_URL}). `queryPackIncludeDirs` entries are always
 * added (the explicit opt-in), and any root matching (or nested inside) a
 * `queryPackExcludeDirs` entry is removed. This gives users deterministic,
 * ordering-independent control over which roots the MCP server scans.
 *
 * When the requirement is active but no open folder qualifies and no include
 * dirs are configured, the function falls back to using every workspace folder
 * (and sets `fellBackToAllFolders`) so users without a `codeql-workspace.yml`
 * are not left with an empty resolution set. Set `requireCodeqlWorkspace` to
 * false to always use every folder.
 */
export function computeResolutionRoots(
  workspaceFolderPaths: string[],
  config: vscode.WorkspaceConfiguration,
  fileExists: FileExists = defaultFileExists,
): ResolutionRootsResult {
  const includeResolved = resolveConfiguredDirs(
    config.get<string[]>('queryPackIncludeDirs', []),
    workspaceFolderPaths,
  );
  const excludeResolved = resolveConfiguredDirs(
    config.get<string[]>('queryPackExcludeDirs', []),
    workspaceFolderPaths,
  );

  const requireCodeqlWorkspace = config.get<boolean>('requireCodeqlWorkspace', true);
  const normalizedFolders = workspaceFolderPaths.map((p) => normalize(p));

  let autoFolders: string[];
  let fellBackToAllFolders = false;
  if (requireCodeqlWorkspace) {
    autoFolders = normalizedFolders.filter((folder) =>
      hasTopLevelCodeqlWorkspaceFile(folder, fileExists),
    );
    // Graceful fallback: when the requirement is active but nothing qualifies
    // and the user has not pointed us at any include dirs, use every folder so
    // we never produce an empty/unusable resolution set for existing users.
    if (
      autoFolders.length === 0 &&
      includeResolved.length === 0 &&
      normalizedFolders.length > 0
    ) {
      autoFolders = normalizedFolders;
      fellBackToAllFolders = true;
    }
  } else {
    autoFolders = normalizedFolders;
  }

  const roots: string[] = [];
  const seen = new Set<string>();
  for (const candidate of [...autoFolders, ...includeResolved]) {
    if (!seen.has(candidate)) {
      seen.add(candidate);
      roots.push(candidate);
    }
  }

  const filtered =
    excludeResolved.length === 0
      ? roots
      : roots.filter(
          (root) => !excludeResolved.some((excluded) => isWithin(root, excluded)),
        );

  return { roots: filtered, fellBackToAllFolders };
}

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

    // Resolution roots for CodeQL query/database/pack paths; selection rules
    // live in computeResolutionRoots.
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const workspaceFolderPaths =
      workspaceFolders?.map((f) => f.uri.fsPath) ?? [];
    const { roots: resolutionRoots, fellBackToAllFolders } =
      computeResolutionRoots(workspaceFolderPaths, config);
    if (fellBackToAllFolders) {
      this.logger.warn(
        'codeql-mcp.requireCodeqlWorkspace is enabled but no open workspace ' +
        'folder contains a top-level codeql-workspace.yml and no ' +
        'codeql-mcp.queryPackIncludeDirs are configured. Falling back to using ' +
        'every workspace folder as a CodeQL resolution root. Add a ' +
        'codeql-workspace.yml to the relevant folder(s), set ' +
        'codeql-mcp.queryPackIncludeDirs, or set codeql-mcp.requireCodeqlWorkspace ' +
        `to false to silence this warning. See ${CODEQL_WORKSPACES_DOC_URL}`,
      );
    }
    // Anchor relative-path resolution (getUserWorkspaceDir) and the default
    // scratch/tmp directory to the first computed resolution root so tools do
    // not anchor to a folder that was intentionally excluded (e.g.
    // requireCodeqlWorkspace=true and the first open folder lacks a top-level
    // codeql-workspace.yml). Resolution roots can also be produced from
    // queryPackIncludeDirs even when no workspace is open, so prefer them
    // before falling back to the first open folder.
    const workspaceAnchor =
      resolutionRoots.length > 0
        ? resolutionRoots[0]
        : workspaceFolders && workspaceFolders.length > 0
          ? workspaceFolders[0].uri.fsPath
          : undefined;
    if (workspaceAnchor) {
      env.CODEQL_MCP_WORKSPACE = workspaceAnchor;
    }
    if (resolutionRoots.length > 0) {
      env.CODEQL_MCP_WORKSPACE_FOLDERS = resolutionRoots.join(delimiter);
    }

    // Workspace-local scratch directory for tool output (query logs, etc.)
    // Defaults to `.codeql/ql-mcp` within the resolution-root anchor.
    // This is also used as CODEQL_MCP_TMP_DIR so that the server writes
    // all temporary output (query logs, external predicate CSVs) inside
    // the workspace, avoiding out-of-workspace file access prompts.
    const scratchRelative = config.get<string>('scratchDir', '.codeql/ql-mcp');
    if (workspaceAnchor) {
      const scratchDir = isAbsolute(scratchRelative)
        ? scratchRelative
        : join(workspaceAnchor, scratchRelative);
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

    // Also include the effective resolution roots (workspace folders plus any
    // explicitly included query/pack directories, minus excluded ones).
    additionalPaths.push(...resolutionRoots);

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

    // Annotation, audit, cache, and SARIF tools are enabled by default on
    // the server. The MONITORING_STORAGE_LOCATION env var tells the server
    // where to place its SQLite store; default to the scratch directory so
    // tools work out-of-the-box without manual env var configuration.
    // Respect values inherited from the extension host process environment;
    // the additionalEnv block below still overrides everything for advanced users.
    if (typeof process.env.MONITORING_STORAGE_LOCATION === 'string') {
      env.MONITORING_STORAGE_LOCATION = process.env.MONITORING_STORAGE_LOCATION;
    } else if (env.CODEQL_MCP_SCRATCH_DIR) {
      env.MONITORING_STORAGE_LOCATION = env.CODEQL_MCP_SCRATCH_DIR;
    }

    // Scan exclusion directories for prompt completions and QL code search.
    // The server reads CODEQL_MCP_SCAN_EXCLUDE_DIRS to merge with built-in
    // defaults. The setting accepts additions and `!`-prefixed negations.
    const scanExcludeDirs = config.get<string[]>('scanExcludeDirs', []);
    if (scanExcludeDirs.length > 0) {
      env.CODEQL_MCP_SCAN_EXCLUDE_DIRS = scanExcludeDirs.join(',');
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
