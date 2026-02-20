import * as vscode from 'vscode';
import { DisposableObject } from '../common/disposable';
import type { Logger } from '../common/logger';
import type { StoragePaths } from './storage-paths';

/**
 * Watches for query results (BQRS and SARIF files) created by the
 * `vscode-codeql` extension.
 *
 * Detection strategy:
 *  - `workspace.createFileSystemWatcher` for `*.bqrs` and `*-interpreted.sarif`
 *  - `tasks.onDidEndTask` as a signal that a query may have completed
 */
export class QueryResultsWatcher extends DisposableObject {
  private readonly _onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this._onDidChange.event;

  constructor(
    private readonly storagePaths: StoragePaths,
    private readonly logger: Logger,
  ) {
    super();
    this.push(this._onDidChange);

    // Watch for BQRS files
    const bqrsWatcher = vscode.workspace.createFileSystemWatcher('**/*.bqrs');
    this.push(bqrsWatcher);
    bqrsWatcher.onDidCreate((uri) => {
      this.logger.info(`Query result (BQRS) created: ${uri.fsPath}`);
      this._onDidChange.fire();
    });

    // Watch for interpreted SARIF files
    const sarifWatcher = vscode.workspace.createFileSystemWatcher(
      '**/*-interpreted.sarif',
    );
    this.push(sarifWatcher);
    sarifWatcher.onDidCreate((uri) => {
      this.logger.info(`Query result (SARIF) created: ${uri.fsPath}`);
      this._onDidChange.fire();
    });

    // Listen for task completions as a signal that queries may have finished
    const taskSub = vscode.tasks.onDidEndTask((e) => {
      const taskName = e.execution.task.name.toLowerCase();
      if (
        taskName.includes('codeql') ||
        taskName.includes('query') ||
        taskName.includes('test')
      ) {
        this.logger.debug(
          `CodeQL-related task ended: ${e.execution.task.name}`,
        );
        this._onDidChange.fire();
      }
    });
    if (taskSub && typeof taskSub.dispose === 'function') {
      this.push(taskSub as vscode.Disposable);
    }
  }
}
