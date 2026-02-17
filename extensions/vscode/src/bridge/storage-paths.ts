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

  constructor(private readonly context: vscode.ExtensionContext) {
    super();
    // Our extension's globalStorageUri is something like:
    //   .../<vscode-global-storage>/advanced-security.codeql-development-mcp-server-vscode/
    // The parent directory is the vscode global storage root.
    this.vsCodeGlobalStorageRoot = dirname(context.globalStorageUri.fsPath);
  }

  /** Global storage directory for the vscode-codeql extension. */
  getCodeqlGlobalStoragePath(): string {
    return join(this.vsCodeGlobalStorageRoot, VSCODE_CODEQL_EXTENSION_ID);
  }

  /**
   * Directory where vscode-codeql stores downloaded/managed databases.
   * Databases are stored directly under the global storage path.
   */
  getDatabaseStoragePath(): string {
    return this.getCodeqlGlobalStoragePath();
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
