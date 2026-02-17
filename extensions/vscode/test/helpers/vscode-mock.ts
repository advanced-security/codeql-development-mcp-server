/**
 * Shared vscode mock factory for test files.
 *
 * Usage in test files:
 *   import { vi } from 'vitest';
 *   import { createVscodeMock } from '../helpers/vscode-mock';
 *   vi.mock('vscode', () => createVscodeMock());
 *
 * This MUST be called via vi.mock() in each test file that imports
 * code which depends on the 'vscode' module.
 */

import { vi } from 'vitest';

export function createVscodeMock() {
  const createEventEmitter = () => {
    const listeners: Array<Function> = [];
    return {
      event: (listener: Function) => { listeners.push(listener); return { dispose: () => {} }; },
      fire: (...args: unknown[]) => { for (const l of listeners) l(...args); },
      dispose: () => { listeners.length = 0; },
    };
  };

  return {
    EventEmitter: vi.fn().mockImplementation(() => createEventEmitter()),
    Uri: {
      file: (p: string) => ({ fsPath: p, scheme: 'file', path: p }),
      joinPath: (b: any, ...s: string[]) => ({ fsPath: [b.fsPath, ...s].join('/'), scheme: 'file', path: [b.path, ...s].join('/') }),
      parse: (v: string) => ({ fsPath: v, scheme: 'file', path: v }),
    },
    workspace: {
      getConfiguration: vi.fn().mockImplementation(() => ({
        get: vi.fn().mockImplementation((_k: string, d?: any) => d),
        has: vi.fn().mockReturnValue(false), inspect: vi.fn(), update: vi.fn(),
      })),
      createFileSystemWatcher: vi.fn().mockImplementation(() => ({
        onDidCreate: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        onDidChange: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        onDidDelete: vi.fn().mockReturnValue({ dispose: vi.fn() }),
        ignoreCreateEvents: false, ignoreChangeEvents: false,
        ignoreDeleteEvents: false, dispose: vi.fn(),
      })),
      workspaceFolders: [],
      onDidChangeConfiguration: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      onDidChangeWorkspaceFolders: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      onDidCreateFiles: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      onDidSaveTextDocument: vi.fn().mockReturnValue({ dispose: vi.fn() }),
      fs: { stat: vi.fn(), readFile: vi.fn(), readDirectory: vi.fn() },
    },
    window: {
      createOutputChannel: vi.fn().mockImplementation(() => ({
        appendLine: vi.fn(), append: vi.fn(), clear: vi.fn(), show: vi.fn(),
        hide: vi.fn(), dispose: vi.fn(), info: vi.fn(), warn: vi.fn(),
        error: vi.fn(), debug: vi.fn(), trace: vi.fn(), logLevel: 3,
        name: 'CodeQL MCP', onDidChangeLogLevel: vi.fn(),
      })),
      showInformationMessage: vi.fn(), showWarningMessage: vi.fn(), showErrorMessage: vi.fn(),
      createStatusBarItem: vi.fn().mockReturnValue({ show: vi.fn(), hide: vi.fn(), dispose: vi.fn(), text: '', tooltip: '', command: undefined }),
      onDidChangeActiveTextEditor: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    },
    commands: { registerCommand: vi.fn().mockReturnValue({ dispose: vi.fn() }), executeCommand: vi.fn() },
    extensions: { getExtension: vi.fn(), all: [], onDidChange: vi.fn().mockReturnValue({ dispose: vi.fn() }) },
    tasks: { onDidEndTask: vi.fn().mockReturnValue({ dispose: vi.fn() }), onDidEndTaskProcess: vi.fn().mockReturnValue({ dispose: vi.fn() }) },
    languages: { onDidChangeDiagnostics: vi.fn().mockReturnValue({ dispose: vi.fn() }) },
    lm: { registerMcpServerDefinitionProvider: vi.fn().mockReturnValue({ dispose: vi.fn() }) },
    Disposable: { from: vi.fn() },
    StatusBarAlignment: { Left: 1, Right: 2 },
    ConfigurationTarget: { Global: 1, Workspace: 2, WorkspaceFolder: 3 },
    McpStdioServerDefinition: vi.fn().mockImplementation(
      (label: string, command: string, args?: string[], env?: Record<string, string>, version?: string) => ({
        label, command, args: args ?? [], env: env ?? {}, version,
      })
    ),
  };
}
