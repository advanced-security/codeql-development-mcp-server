import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DatabaseWatcher } from '../../src/bridge/database-watcher';
import { workspace } from 'vscode';

/** Captures callbacks registered on a mock FileSystemWatcher. */
function installCapturingWatcher() {
  const captured: Record<string, Function> = {};
  const original = workspace.createFileSystemWatcher;
  workspace.createFileSystemWatcher = (() => ({
    onDidCreate: (cb: Function) => { captured.create = cb; return { dispose: () => {} }; },
    onDidChange: (cb: Function) => { captured.change = cb; return { dispose: () => {} }; },
    onDidDelete: (cb: Function) => { captured.delete = cb; return { dispose: () => {} }; },
    dispose: () => {},
  })) as any;
  return { captured, restore: () => { workspace.createFileSystemWatcher = original; } };
}

function createMockStoragePaths() {
  return {
    getCodeqlGlobalStoragePath: () => '/mock/global-storage/GitHub.vscode-codeql',
    getDatabaseStoragePath: () => '/mock/global-storage/GitHub.vscode-codeql',
    getQueryStoragePath: () => '/mock/global-storage/GitHub.vscode-codeql/queries',
    getVariantAnalysisStoragePath: () => '/mock/global-storage/GitHub.vscode-codeql/variant-analyses',
    getGlobalStorageRoot: () => '/mock/global-storage',
    dispose: () => {},
    push: () => {},
  } as any;
}

function createMockLogger() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn(), show: () => {}, dispose: () => {} } as any;
}

describe('DatabaseWatcher', () => {
  let watcher: DatabaseWatcher;
  let captured: Record<string, Function>;
  let restoreWatcher: () => void;

  beforeEach(() => {
    const cap = installCapturingWatcher();
    captured = cap.captured;
    restoreWatcher = cap.restore;
    watcher = new DatabaseWatcher(createMockStoragePaths(), createMockLogger());
  });

  afterEach(() => {
    watcher.dispose();
    restoreWatcher();
  });

  it('should be instantiable', () => {
    expect(watcher).toBeDefined();
  });

  it('should expose onDidChange event', () => {
    expect(watcher.onDidChange).toBeDefined();
  });

  it('should track discovered databases', () => {
    expect(watcher.getKnownDatabases().size).toBe(0);
  });

  it('should add database when codeql-database.yml is created', () => {
    const listener = vi.fn();
    watcher.onDidChange(listener);

    // Simulate file watcher firing
    captured.create?.({ fsPath: '/workspace/my-db/codeql-database.yml' });

    expect(watcher.getKnownDatabases().has('/workspace/my-db')).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should not duplicate databases on repeated creation events', () => {
    const listener = vi.fn();
    watcher.onDidChange(listener);

    captured.create?.({ fsPath: '/workspace/my-db/codeql-database.yml' });
    captured.create?.({ fsPath: '/workspace/my-db/codeql-database.yml' });

    expect(watcher.getKnownDatabases().size).toBe(1);
    expect(listener).toHaveBeenCalledTimes(1); // Only fires once
  });

  it('should remove database when codeql-database.yml is deleted', () => {
    const listener = vi.fn();
    watcher.onDidChange(listener);

    captured.create?.({ fsPath: '/workspace/my-db/codeql-database.yml' });
    expect(watcher.getKnownDatabases().size).toBe(1);

    captured.delete?.({ fsPath: '/workspace/my-db/codeql-database.yml' });
    expect(watcher.getKnownDatabases().size).toBe(0);
    expect(listener).toHaveBeenCalledTimes(2); // once for add, once for remove
  });

  it('should ignore delete for unknown databases', () => {
    const listener = vi.fn();
    watcher.onDidChange(listener);

    captured.delete?.({ fsPath: '/workspace/unknown/codeql-database.yml' });

    expect(listener).not.toHaveBeenCalled();
  });

  it('should track multiple databases', () => {
    captured.create?.({ fsPath: '/workspace/db1/codeql-database.yml' });
    captured.create?.({ fsPath: '/workspace/db2/codeql-database.yml' });

    const known = watcher.getKnownDatabases();
    expect(known.size).toBe(2);
    expect(known.has('/workspace/db1')).toBe(true);
    expect(known.has('/workspace/db2')).toBe(true);
  });

  it('should be disposable', () => {
    expect(() => watcher.dispose()).not.toThrow();
  });
});
