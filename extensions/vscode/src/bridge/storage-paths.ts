import * as vscode from 'vscode';
import { join, dirname } from 'path';
import { DisposableObject } from '../common/disposable';

const VSCODE_CODEQL_EXTENSION_ID = 'GitHub.vscode-codeql';

/**
 * Resolves the filesystem paths used by the `vscode-codeql` extension
 * for storing databases, query results, and other artifacts.
 *
 * These paths are computed deterministically from VS Code's global storage
 * root — no API calls to the `vscode-codeql` extension are made.
 *
 * VS Code stores extension global data at:
 *   `<vscode-global-storage>/<publisher>.<extension-name>/`
 *
 * For `vscode-codeql`, this becomes:
 *   `<vscode-global-storage>/GitHub.vscode-codeql/`
 */
export class StoragePaths extends DisposableObject {
  private readonly vsCodeGlobalStorageRoot: string;
  private readonly vsCodeWorkspaceStorageRoot: string | undefined;

  constructor(private readonly context: vscode.ExtensionContext) {
    super();
    // Our extension's globalStorageUri is something like:
    //   .../<vscode-global-storage>/advanced-security.vscode-codeql-development-mcp-server/
    // The parent directory is the vscode global storage root.
    this.vsCodeGlobalStorageRoot = dirname(context.globalStorageUri.fsPath);

    // Our extension's storageUri (workspace-scoped) is something like:
    //   .../<vscode-workspace-storage>/<workspace-id>/advanced-security.vscode-codeql-development-mcp-server/
    // The parent directory is this workspace's storage root.
    if (context.storageUri) {
      this.vsCodeWorkspaceStorageRoot = dirname(context.storageUri.fsPath);
    }
  }

  /** Global storage directory for the vscode-codeql extension. */
  getCodeqlGlobalStoragePath(): string {
    return join(this.vsCodeGlobalStorageRoot, VSCODE_CODEQL_EXTENSION_ID);
  }

  /**
   * Directory where vscode-codeql stores downloaded/managed databases
   * at the global level (e.g. databases added from GitHub).
   */
  getDatabaseStoragePath(): string {
    return this.getCodeqlGlobalStoragePath();
  }

  /**
   * Directory where vscode-codeql stores workspace-scoped databases
   * (e.g. databases created from repos in the current workspace).
   * Returns `undefined` if no workspace is open.
   */
  getWorkspaceDatabaseStoragePath(): string | undefined {
    if (!this.vsCodeWorkspaceStorageRoot) return undefined;
    return join(this.vsCodeWorkspaceStorageRoot, VSCODE_CODEQL_EXTENSION_ID);
  }

  /**
   * All database storage paths: global + workspace-scoped.
   * Suitable for colon-joining into `CODEQL_DATABASES_BASE_DIRS`.
   */
  getAllDatabaseStoragePaths(): string[] {
    const paths = [this.getDatabaseStoragePath()];
    const workspacePath = this.getWorkspaceDatabaseStoragePath();
    if (workspacePath) {
      paths.push(workspacePath);
    }
    return paths;
  }

  /**
   * Directory where vscode-codeql stores query results.
   * Path: `<globalStorageUri>/queries/<queryBasename>-<nanoid>/`
   */
  getQueryStoragePath(): string {
    return join(this.getCodeqlGlobalStoragePath(), 'queries');
  }

  /**
   * Directory where vscode-codeql stores variant analysis results.
   * Path: `<globalStorageUri>/variant-analyses/<id>/`
   */
  getVariantAnalysisStoragePath(): string {
    return join(this.getCodeqlGlobalStoragePath(), 'variant-analyses');
  }

  /** The VS Code global storage root (parent of all extension storage dirs). */
  getGlobalStorageRoot(): string {
    return this.vsCodeGlobalStorageRoot;
  }
}
