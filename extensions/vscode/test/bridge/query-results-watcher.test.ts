import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { QueryResultsWatcher } from '../../src/bridge/query-results-watcher';
import { workspace, tasks } from 'vscode';

function installCapturingWatchers() {
  const captured: Record<string, Function> = {};
  const origFsw = workspace.createFileSystemWatcher;
  let watcherIndex = 0;
  workspace.createFileSystemWatcher = ((_pattern: string) => {
    const prefix = watcherIndex === 0 ? 'bqrs' : 'sarif';
    watcherIndex++;
    return {
      onDidCreate: (cb: Function) => { captured[`${prefix}_create`] = cb; return { dispose: () => {} }; },
      onDidChange: (cb: Function) => { captured[`${prefix}_change`] = cb; return { dispose: () => {} }; },
      onDidDelete: (cb: Function) => { captured[`${prefix}_delete`] = cb; return { dispose: () => {} }; },
      dispose: () => {},
    };
  }) as any;

  let taskCallback: Function | undefined;
  const origTask = tasks.onDidEndTask;
  tasks.onDidEndTask = ((cb: Function) => { taskCallback = cb; return { dispose: () => {} }; }) as any;

  return {
    captured,
    fireTask: (name: string) => taskCallback?.({ execution: { task: { name } } }),
    restore: () => { workspace.createFileSystemWatcher = origFsw; tasks.onDidEndTask = origTask; },
  };
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

describe('QueryResultsWatcher', () => {
  let watcher: QueryResultsWatcher;
  let captured: Record<string, Function>;
  let fireTask: (name: string) => void;
  let restore: () => void;
  let logger: any;

  beforeEach(() => {
    logger = createMockLogger();
    const cap = installCapturingWatchers();
    captured = cap.captured;
    fireTask = cap.fireTask;
    restore = cap.restore;
    watcher = new QueryResultsWatcher(createMockStoragePaths(), logger);
  });

  afterEach(() => {
    watcher.dispose();
    restore();
  });

  it('should be instantiable', () => {
    expect(watcher).toBeDefined();
  });

  it('should expose onDidChange event', () => {
    expect(watcher.onDidChange).toBeDefined();
  });

  it('should fire change event when BQRS file is created', () => {
    const listener = vi.fn();
    watcher.onDidChange(listener);

    captured.bqrs_create?.({ fsPath: '/results/query.bqrs' });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('BQRS'));
  });

  it('should fire change event when SARIF file is created', () => {
    const listener = vi.fn();
    watcher.onDidChange(listener);

    captured.sarif_create?.({ fsPath: '/results/query-interpreted.sarif' });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('SARIF'));
  });

  it('should fire change event when a CodeQL-related task ends', () => {
    const listener = vi.fn();
    watcher.onDidChange(listener);

    fireTask('Run CodeQL Query');

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should NOT fire for unrelated tasks', () => {
    const listener = vi.fn();
    watcher.onDidChange(listener);

    fireTask('npm build');

    expect(listener).not.toHaveBeenCalled();
  });

  it('should fire for tasks containing "test"', () => {
    const listener = vi.fn();
    watcher.onDidChange(listener);

    fireTask('CodeQL Test Run');

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should be disposable', () => {
    expect(() => watcher.dispose()).not.toThrow();
  });
});
