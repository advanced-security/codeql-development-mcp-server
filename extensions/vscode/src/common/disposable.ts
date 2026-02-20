import * as vscode from 'vscode';

/**
 * Base class for objects that manage a set of VS Code Disposable resources.
 * Subclasses call `this.push(disposable)` to register resources; calling
 * `dispose()` tears them all down.
 */
export class DisposableObject implements vscode.Disposable {
  private readonly _disposables: vscode.Disposable[] = [];

  protected push<T extends vscode.Disposable>(disposable: T): T {
    this._disposables.push(disposable);
    return disposable;
  }

  dispose(): void {
    for (const d of this._disposables.reverse()) {
      d.dispose();
    }
    this._disposables.length = 0;
  }
}
