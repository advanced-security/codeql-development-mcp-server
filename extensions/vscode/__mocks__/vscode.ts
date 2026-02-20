/**
 * Mock for the `vscode` module.
 *
 * Used via resolve.alias in vitest.config.ts so that all imports of
 * 'vscode' resolve to this file during tests.
 *
 * Does NOT use vi.fn() — uses plain functions/objects so it can be
 * loaded as a regular module without vitest bootstrapping.
 */

const noop = () => {};
const noopReturn = (val: any) => () => val;

function createEventEmitter() {
  const listeners: Function[] = [];
  return {
    event: (listener: Function) => {
      listeners.push(listener);
      return { dispose: noop };
    },
    fire: (...args: unknown[]) => {
      for (const l of listeners) l(...args);
    },
    dispose: () => { listeners.length = 0; },
  };
}

function createOutputChannelMock() {
  return {
    appendLine: noop, append: noop, clear: noop, show: noop,
    hide: noop, dispose: noop, info: noop, warn: noop,
    error: noop, debug: noop, trace: noop, logLevel: 3,
    name: 'CodeQL MCP', onDidChangeLogLevel: noop,
    replace: noop,
  };
}

function createFileSystemWatcherMock() {
  return {
    onDidCreate: noopReturn({ dispose: noop }),
    onDidChange: noopReturn({ dispose: noop }),
    onDidDelete: noopReturn({ dispose: noop }),
    ignoreCreateEvents: false,
    ignoreChangeEvents: false,
    ignoreDeleteEvents: false,
    dispose: noop,
  };
}

function createConfigMock() {
  return {
    get: (_key: string, defaultVal?: any) => defaultVal,
    has: () => false,
    inspect: () => undefined,
    update: () => Promise.resolve(),
  };
}

export class EventEmitter {
  private _emitter = createEventEmitter();
  get event() { return this._emitter.event; }
  fire(...args: unknown[]) { this._emitter.fire(...args); }
  dispose() { this._emitter.dispose(); }
}

export const Uri = {
  file: (p: string) => ({ fsPath: p, scheme: 'file', path: p }),
  joinPath: (b: any, ...s: string[]) => ({
    fsPath: [b.fsPath, ...s].join('/'),
    scheme: 'file',
    path: [b.path, ...s].join('/'),
  }),
  parse: (v: string) => ({ fsPath: v, scheme: 'file', path: v }),
};

export const workspace = {
  getConfiguration: () => createConfigMock(),
  createFileSystemWatcher: () => createFileSystemWatcherMock(),
  workspaceFolders: [] as any[],
  onDidChangeConfiguration: noopReturn({ dispose: noop }),
  onDidChangeWorkspaceFolders: noopReturn({ dispose: noop }),
  onDidCreateFiles: noopReturn({ dispose: noop }),
  onDidSaveTextDocument: noopReturn({ dispose: noop }),
  fs: { stat: noop, readFile: noop, readDirectory: noop },
};

export const window = {
  createOutputChannel: () => createOutputChannelMock(),
  showInformationMessage: noop,
  showWarningMessage: noop,
  showErrorMessage: noop,
  createStatusBarItem: () => ({
    show: noop, hide: noop, dispose: noop,
    text: '', tooltip: '', command: undefined,
  }),
  onDidChangeActiveTextEditor: noopReturn({ dispose: noop }),
};

export const commands = {
  registerCommand: () => ({ dispose: noop }),
  executeCommand: noop,
};

export const extensions = {
  getExtension: () => undefined,
  all: [],
  onDidChange: noopReturn({ dispose: noop }),
};

export const tasks = {
  onDidEndTask: noopReturn({ dispose: noop }),
  onDidEndTaskProcess: noopReturn({ dispose: noop }),
};

export const languages = {
  onDidChangeDiagnostics: noopReturn({ dispose: noop }),
};

export const lm = {
  registerMcpServerDefinitionProvider: () => ({ dispose: noop }),
};

export class Disposable {
  private _callOnDispose: () => void;
  constructor(callOnDispose: () => void) { this._callOnDispose = callOnDispose; }
  static from(...disposableLikes: Array<{ dispose: () => any }>) {
    return new Disposable(() => { for (const d of disposableLikes) d.dispose(); });
  }
  dispose() { this._callOnDispose(); }
}

export const StatusBarAlignment = { Left: 1, Right: 2 };
export const ConfigurationTarget = { Global: 1, Workspace: 2, WorkspaceFolder: 3 };

export class McpStdioServerDefinition {
  label: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  version?: string;
  constructor(label: string, command: string, args?: string[], env?: Record<string, string>, version?: string) {
    this.label = label;
    this.command = command;
    this.args = args ?? [];
    this.env = env ?? {};
    this.version = version;
  }
}
