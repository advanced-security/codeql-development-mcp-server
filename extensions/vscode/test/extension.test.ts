import { describe, it, expect, vi, beforeEach } from 'vitest';


// Mock all modules imported by extension.ts
// Note: Logger is NOT mocked here — it uses the real class which relies
// on the vscode mock from setup.ts for createOutputChannel.

vi.mock('../src/codeql/cli-resolver', () => ({
  CliResolver: vi.fn().mockImplementation(function () {
    return {
      resolve: vi.fn().mockResolvedValue('/mock/codeql'),
      invalidateCache: vi.fn(),
      dispose: vi.fn(),
    };
  }),
}));

vi.mock('../src/server/server-manager', () => ({
  ServerManager: vi.fn().mockImplementation(function () {
    return {
      ensureInstalled: vi.fn().mockResolvedValue(false),
      install: vi.fn().mockResolvedValue(undefined),
      isInstalled: vi.fn().mockResolvedValue(true),
      getCommand: vi.fn().mockReturnValue('npx'),
      getArgs: vi.fn().mockReturnValue(['-y', 'codeql-development-mcp-server']),
      getVersion: vi.fn().mockReturnValue(undefined),
      getDescription: vi.fn().mockReturnValue('npx -y codeql-development-mcp-server'),
      getInstallDir: vi.fn().mockReturnValue('/mock/install'),
      getPackageRoot: vi.fn().mockReturnValue('/mock/install/node_modules/codeql-development-mcp-server'),
      getInstalledVersion: vi.fn().mockResolvedValue('2.24.1'),
      dispose: vi.fn(),
    };
  }),
}));

vi.mock('../src/server/pack-installer', () => ({
  PackInstaller: vi.fn().mockImplementation(function () {
    return {
      installAll: vi.fn().mockResolvedValue(undefined),
      getQlpackPaths: vi.fn().mockReturnValue([]),
      dispose: vi.fn(),
    };
  }),
}));

vi.mock('../src/server/mcp-provider', () => ({
  McpProvider: vi.fn().mockImplementation(function () {
    return {
      provideMcpServerDefinitions: vi.fn().mockResolvedValue([]),
      resolveMcpServerDefinition: vi.fn().mockResolvedValue(undefined),
      onDidChangeMcpServerDefinitions: vi.fn(),
      fireDidChange: vi.fn(),
      dispose: vi.fn(),
    };
  }),
}));

vi.mock('../src/bridge/storage-paths', () => ({
  StoragePaths: vi.fn().mockImplementation(function () {
    return {
      getCodeqlGlobalStoragePath: vi.fn().mockReturnValue('/mock/codeql-storage'),
      getDatabaseStoragePath: vi.fn().mockReturnValue('/mock/codeql-storage'),
      getAllDatabaseStoragePaths: vi.fn().mockReturnValue(['/mock/codeql-storage']),
      getQueryStoragePath: vi.fn().mockReturnValue('/mock/codeql-storage/queries'),
      getVariantAnalysisStoragePath: vi.fn().mockReturnValue('/mock/codeql-storage/variant-analyses'),
      getGlobalStorageRoot: vi.fn().mockReturnValue('/mock/global-storage'),
      dispose: vi.fn(),
    };
  }),
}));

vi.mock('../src/bridge/database-watcher', () => ({
  DatabaseWatcher: vi.fn().mockImplementation(function () {
    const listeners: Function[] = [];
    return {
      onDidChange: (listener: Function) => { listeners.push(listener); return { dispose: () => {} }; },
      getKnownDatabases: vi.fn().mockReturnValue(new Set()),
      dispose: vi.fn(),
    };
  }),
}));

vi.mock('../src/bridge/query-results-watcher', () => ({
  QueryResultsWatcher: vi.fn().mockImplementation(function () {
    const listeners: Function[] = [];
    return {
      onDidChange: (listener: Function) => { listeners.push(listener); return { dispose: () => {} }; },
      dispose: vi.fn(),
    };
  }),
}));

vi.mock('../src/bridge/environment-builder', () => ({
  EnvironmentBuilder: vi.fn().mockImplementation(function () {
    return {
      build: vi.fn().mockResolvedValue({ CODEQL_PATH: '/mock/codeql' }),
      invalidate: vi.fn(),
      dispose: vi.fn(),
    };
  }),
}));

import { activate, deactivate } from '../src/extension';
import * as vscode from 'vscode';

function createMockContext(): vscode.ExtensionContext {
  return {
    globalStorageUri: { fsPath: '/mock/global-storage' },
    storageUri: { fsPath: '/mock/workspace-storage' },
    globalState: {
      get: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
      keys: vi.fn().mockReturnValue([]),
      setKeysForSync: vi.fn(),
    },
    workspaceState: {
      get: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
      keys: vi.fn().mockReturnValue([]),
    },
    subscriptions: [],
    extensionPath: '/mock/extension',
    extensionUri: { fsPath: '/mock/extension' } as any,
    extensionMode: 1,
    extension: {} as any,
    environmentVariableCollection: {} as any,
    secrets: {} as any,
    logUri: { fsPath: '/mock/log' } as any,
    logPath: '/mock/log',
    globalStoragePath: '/mock/global-storage',
    storagePath: '/mock/workspace-storage',
    asAbsolutePath: (p: string) => `/mock/extension/${p}`,
    languageModelAccessInformation: {} as any,
  } as unknown as vscode.ExtensionContext;
}

describe('Extension', () => {
  let ctx: vscode.ExtensionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    ctx = createMockContext();
  });

  it('should activate and return an API object with mcpProvider', async () => {
    const api = await activate(ctx);
    expect(api).toBeDefined();
    expect(api.mcpProvider).toBeDefined();
  });

  it('should register commands during activation', async () => {
    await activate(ctx);
    // Commands are registered via context.subscriptions
    expect(ctx.subscriptions.length).toBeGreaterThan(0);
  });

  it('should register the MCP server definition provider', async () => {
    await activate(ctx);
    // The MCP provider registration adds to context.subscriptions
    expect(ctx.subscriptions.length).toBeGreaterThan(0);
  });

  it('should deactivate without errors', async () => {
    await activate(ctx);
    expect(() => deactivate()).not.toThrow();
  });

  it('should deactivate even if activate was never called', () => {
    expect(() => deactivate()).not.toThrow();
  });
});
