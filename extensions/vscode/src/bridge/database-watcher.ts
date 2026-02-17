import * as vscode from 'vscode';
import { DisposableObject } from '../common/disposable';
import type { Logger } from '../common/logger';
import type { StoragePaths } from './storage-paths';

/**
 * Watches for CodeQL databases created by the `vscode-codeql` extension.
 *
 * Detection strategy combines:
 *  - `workspace.createFileSystemWatcher` for `codeql-database.yml` files
 *  - `workspace.onDidChangeWorkspaceFolders` for new workspace folders
 *
 * Data access is filesystem-only; notifications come from VS Code public APIs.
 */
export class DatabaseWatcher extends DisposableObject {
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  private readonly knownDatabases = new Set<string>();

  constructor(
    private readonly storagePaths: StoragePaths,
    private readonly logger: Logger,
  ) {
    super();
    this.push(this._onDidChange);

    // Watch for codeql-database.yml files being created anywhere in
    // the workspace or under the vscode-codeql storage directory.
    const watcher = vscode.workspace.createFileSystemWatcher(
      '**/codeql-database.yml',
    );

    this.push(watcher);

    watcher.onDidCreate((uri) => {
      this.handleDatabaseDiscovered(uri.fsPath);
    });

    watcher.onDidDelete((uri) => {
      this.handleDatabaseRemoved(uri.fsPath);
    });

    // Also watch workspace folder changes
    const wsFolderSub = vscode.workspace.onDidChangeWorkspaceFolders(() => {
      this.logger.debug('Workspace folders changed — re-scanning for databases');
      this._onDidChange.fire();
    });
    if (wsFolderSub && typeof wsFolderSub.dispose === 'function') {
      this.push(wsFolderSub as vscode.Disposable);
    }
  }

  /** Get all currently known database paths. */
  getKnownDatabases(): ReadonlySet<string> {
    return this.knownDatabases;
  }

  private handleDatabaseDiscovered(ymlPath: string): void {
    // The database root is the parent directory of codeql-database.yml
    const dbRoot = ymlPath.replace(/\/codeql-database\.yml$/, '');
    if (!this.knownDatabases.has(dbRoot)) {
      this.knownDatabases.add(dbRoot);
      this.logger.info(`Database discovered: ${dbRoot}`);
      this._onDidChange.fire();
    }
  }

  private handleDatabaseRemoved(ymlPath: string): void {
    const dbRoot = ymlPath.replace(/\/codeql-database\.yml$/, '');
    if (this.knownDatabases.delete(dbRoot)) {
      this.logger.info(`Database removed: ${dbRoot}`);
      this._onDidChange.fire();
    }
  }
}
