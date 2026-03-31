import { describe, it, expect, vi, beforeEach } from 'vitest';
import { delimiter } from 'path';

import { EnvironmentBuilder } from '../../src/bridge/environment-builder';
import type { DatabaseCopierFactory } from '../../src/bridge/environment-builder';

function createMockContext() {
  return {
    globalStorageUri: { fsPath: '/mock/global-storage/codeql-mcp' },
    storageUri: { fsPath: '/mock/workspace-storage/codeql-mcp' },
  } as any;
}

function createMockCliResolver() {
  return {
    resolve: vi.fn().mockResolvedValue('/usr/local/bin/codeql'),
    invalidateCache: vi.fn(),
    dispose: vi.fn(),
    push: vi.fn(),
  } as any;
}

function createMockStoragePaths() {
  return {
    getCodeqlGlobalStoragePath: vi.fn().mockReturnValue('/mock/global-storage/GitHub.vscode-codeql'),
    getDatabaseStoragePath: vi.fn().mockReturnValue('/mock/global-storage/GitHub.vscode-codeql'),
    getManagedDatabaseStoragePath: vi.fn().mockReturnValue('/mock/global-storage/codeql-mcp/databases'),
    getWorkspaceDatabaseStoragePath: vi.fn().mockReturnValue('/mock/workspace-storage/ws-123/GitHub.vscode-codeql'),
    getAllDatabaseStoragePaths: vi.fn().mockReturnValue([
      '/mock/global-storage/GitHub.vscode-codeql',
      '/mock/workspace-storage/ws-123/GitHub.vscode-codeql',
    ]),
    getQueryStoragePath: vi.fn().mockReturnValue('/mock/global-storage/GitHub.vscode-codeql/queries'),
    getVariantAnalysisStoragePath: vi.fn().mockReturnValue('/mock/global-storage/GitHub.vscode-codeql/variant-analyses'),
    getGlobalStorageRoot: vi.fn().mockReturnValue('/mock/global-storage'),
    dispose: vi.fn(),
    push: vi.fn(),
  } as any;
}

function createMockLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    show: vi.fn(),
    dispose: vi.fn(),
  } as any;
}

function createMockCopierFactory(): { factory: DatabaseCopierFactory; syncAll: ReturnType<typeof vi.fn> } {
  const syncAll = vi.fn().mockResolvedValue([]);
  const factory: DatabaseCopierFactory = () => ({ syncAll } as any);
  return { factory, syncAll };
}

describe('EnvironmentBuilder', () => {
  let builder: EnvironmentBuilder;
  let cliResolver: any;
  let mockCopier: ReturnType<typeof createMockCopierFactory>;

  beforeEach(() => {
    vi.resetAllMocks();
    cliResolver = createMockCliResolver();
    mockCopier = createMockCopierFactory();
    builder = new EnvironmentBuilder(
      createMockContext(),
      cliResolver,
      createMockStoragePaths(),
      createMockLogger(),
      mockCopier.factory,
    );
  });

  it('should be instantiable', () => {
    expect(builder).toBeDefined();
  });

  it('should build environment with CODEQL_PATH', async () => {
    const env = await builder.build();
    expect(env.CODEQL_PATH).toBe('/usr/local/bin/codeql');
  });

  it('should build environment with TRANSPORT_MODE=stdio', async () => {
    const env = await builder.build();
    expect(env.TRANSPORT_MODE).toBe('stdio');
  });

  it('should include CODEQL_MCP_TMP_DIR under global storage when no workspace', async () => {
    const env = await builder.build();
    expect(env.CODEQL_MCP_TMP_DIR).toBe('/mock/global-storage/codeql-mcp/tmp');
  });

  it('should set CODEQL_MCP_TMP_DIR to workspace scratch dir when workspace folders exist', async () => {
    const vscode = await import('vscode');
    const origFolders = vscode.workspace.workspaceFolders;
    (vscode.workspace.workspaceFolders as any) = [
      { uri: { fsPath: '/mock/workspace' }, name: 'ws', index: 0 },
    ];

    builder.invalidate();
    const env = await builder.build();
    expect(env.CODEQL_MCP_TMP_DIR).toBe('/mock/workspace/.codeql/ql-mcp');
    expect(env.CODEQL_MCP_SCRATCH_DIR).toBe('/mock/workspace/.codeql/ql-mcp');

    (vscode.workspace.workspaceFolders as any) = origFolders;
  });

  it('should set CODEQL_MCP_WORKSPACE_FOLDERS with all workspace folder paths', async () => {
    const vscode = await import('vscode');
    const { delimiter } = await import('path');
    const origFolders = vscode.workspace.workspaceFolders;
    (vscode.workspace.workspaceFolders as any) = [
      { uri: { fsPath: '/mock/ws-a' }, name: 'a', index: 0 },
      { uri: { fsPath: '/mock/ws-b' }, name: 'b', index: 1 },
    ];

    builder.invalidate();
    const env = await builder.build();
    expect(env.CODEQL_MCP_WORKSPACE_FOLDERS).toBe(['/mock/ws-a', '/mock/ws-b'].join(delimiter));

    (vscode.workspace.workspaceFolders as any) = origFolders;
  });

  it('should include CODEQL_ADDITIONAL_PACKS with database storage path', async () => {
    const env = await builder.build();
    expect(env.CODEQL_ADDITIONAL_PACKS).toBeDefined();
    expect(env.CODEQL_ADDITIONAL_PACKS).toContain('GitHub.vscode-codeql');
  });

  it('should include CODEQL_DATABASES_BASE_DIRS pointing to managed copy directory by default', async () => {
    const env = await builder.build();
    // With copyDatabases enabled (default), CODEQL_DATABASES_BASE_DIRS
    // should point to the managed directory, not the source directories.
    expect(env.CODEQL_DATABASES_BASE_DIRS).toBe('/mock/global-storage/codeql-mcp/databases');
    expect(mockCopier.syncAll).toHaveBeenCalledWith([
      '/mock/global-storage/GitHub.vscode-codeql',
      '/mock/workspace-storage/ws-123/GitHub.vscode-codeql',
    ]);
  });

  it('should include CODEQL_QUERY_RUN_RESULTS_DIRS from storage paths', async () => {
    const env = await builder.build();
    expect(env.CODEQL_QUERY_RUN_RESULTS_DIRS).toBe('/mock/global-storage/GitHub.vscode-codeql/queries');
  });

  it('should include CODEQL_MRVA_RUN_RESULTS_DIRS from storage paths', async () => {
    const env = await builder.build();
    expect(env.CODEQL_MRVA_RUN_RESULTS_DIRS).toBe('/mock/global-storage/GitHub.vscode-codeql/variant-analyses');
  });

  it('should omit CODEQL_PATH when CLI is not found', async () => {
    cliResolver.resolve.mockResolvedValue(undefined);
    builder.invalidate();
    const env = await builder.build();
    expect(env.CODEQL_PATH).toBeUndefined();
  });

  it('should include additional env from user settings', async () => {
    const vscode = await import('vscode');
    const originalGetConfig = vscode.workspace.getConfiguration;
    vscode.workspace.getConfiguration = () => ({
      get: (_key: string, defaultVal?: any) => {
        if (_key === 'additionalEnv') return { CUSTOM_VAR: 'custom_value' };
        return defaultVal;
      },
      has: () => false,
      inspect: () => undefined as any,
      update: () => Promise.resolve(),
    }) as any;

    builder.invalidate(); // Clear cache so it re-reads config
    const env = await builder.build();
    expect(env.CUSTOM_VAR).toBe('custom_value');

    // Restore
    vscode.workspace.getConfiguration = originalGetConfig;
  });

  it('should cache environment and honor invalidation', async () => {
    const _env1 = await builder.build();
    const _env2 = await builder.build();
    // Should use cached result (resolve only called once)
    expect(cliResolver.resolve).toHaveBeenCalledTimes(1);

    builder.invalidate();
    await builder.build();
    expect(cliResolver.resolve).toHaveBeenCalledTimes(2);
  });

  it('should append user-configured dirs to CODEQL_DATABASES_BASE_DIRS alongside managed dir', async () => {
    const vscode = await import('vscode');
    const originalGetConfig = vscode.workspace.getConfiguration;
    vscode.workspace.getConfiguration = () => ({
      get: (_key: string, defaultVal?: any) => {
        if (_key === 'additionalDatabaseDirs') return ['/custom/databases'];
        if (_key === 'additionalQueryRunResultsDirs') return [];
        if (_key === 'additionalMrvaRunResultsDirs') return [];
        return defaultVal;
      },
      has: () => false,
      inspect: () => undefined as any,
      update: () => Promise.resolve(),
    }) as any;

    builder.invalidate();
    const env = await builder.build();
    expect(env.CODEQL_DATABASES_BASE_DIRS).toContain('/custom/databases');
    expect(env.CODEQL_DATABASES_BASE_DIRS).toContain('/mock/global-storage/codeql-mcp/databases');

    vscode.workspace.getConfiguration = originalGetConfig;
  });

  it('should use source paths directly when copyDatabases is disabled', async () => {
    const vscode = await import('vscode');
    const originalGetConfig = vscode.workspace.getConfiguration;
    vscode.workspace.getConfiguration = () => ({
      get: (_key: string, defaultVal?: any) => {
        if (_key === 'copyDatabases') return false;
        if (_key === 'additionalDatabaseDirs') return [];
        if (_key === 'additionalQueryRunResultsDirs') return [];
        if (_key === 'additionalMrvaRunResultsDirs') return [];
        return defaultVal;
      },
      has: () => false,
      inspect: () => undefined as any,
      update: () => Promise.resolve(),
    }) as any;

    builder.invalidate();
    const env = await builder.build();
    expect(env.CODEQL_DATABASES_BASE_DIRS).toBe(
      ['/mock/global-storage/GitHub.vscode-codeql', '/mock/workspace-storage/ws-123/GitHub.vscode-codeql'].join(delimiter),
    );

    vscode.workspace.getConfiguration = originalGetConfig;
  });

  it('should fall back to source dirs when syncAll throws', async () => {
    mockCopier.syncAll.mockRejectedValue(new Error('Failed to create managed database directory'));
    builder.invalidate();
    const env = await builder.build();
    expect(env.CODEQL_DATABASES_BASE_DIRS).toBe(
      ['/mock/global-storage/GitHub.vscode-codeql', '/mock/workspace-storage/ws-123/GitHub.vscode-codeql'].join(delimiter),
    );
  });

  it('should append user-configured dirs to CODEQL_QUERY_RUN_RESULTS_DIRS', async () => {
    const vscode = await import('vscode');
    const originalGetConfig = vscode.workspace.getConfiguration;
    vscode.workspace.getConfiguration = () => ({
      get: (_key: string, defaultVal?: any) => {
        if (_key === 'additionalQueryRunResultsDirs') return ['/custom/query-results'];
        if (_key === 'additionalDatabaseDirs') return [];
        if (_key === 'additionalMrvaRunResultsDirs') return [];
        return defaultVal;
      },
      has: () => false,
      inspect: () => undefined as any,
      update: () => Promise.resolve(),
    }) as any;

    builder.invalidate();
    const env = await builder.build();
    expect(env.CODEQL_QUERY_RUN_RESULTS_DIRS).toContain('/custom/query-results');
    expect(env.CODEQL_QUERY_RUN_RESULTS_DIRS).toContain('/mock/global-storage/GitHub.vscode-codeql/queries');

    vscode.workspace.getConfiguration = originalGetConfig;
  });

  it('should be disposable', () => {
    expect(() => builder.dispose()).not.toThrow();
  });

  it('should set ENABLE_ANNOTATION_TOOLS=true by default', async () => {
    const env = await builder.build();
    expect(env.ENABLE_ANNOTATION_TOOLS).toBe('true');
  });

  it('should not overwrite MONITORING_STORAGE_LOCATION if already set in parent env', async () => {
    const vscode = await import('vscode');
    const origFolders = vscode.workspace.workspaceFolders;
    const originalGetConfig = vscode.workspace.getConfiguration;

    try {
      (vscode.workspace.workspaceFolders as any) = [
        { uri: { fsPath: '/mock/workspace' }, name: 'ws', index: 0 },
      ];
      // Simulate parent process env with MONITORING_STORAGE_LOCATION already set
      vscode.workspace.getConfiguration = () => ({
        get: (_key: string, defaultVal?: any) => {
          if (_key === 'additionalEnv') return { MONITORING_STORAGE_LOCATION: '/custom/storage/path' };
          if (_key === 'additionalDatabaseDirs') return [];
          if (_key === 'additionalQueryRunResultsDirs') return [];
          if (_key === 'additionalMrvaRunResultsDirs') return [];
          return defaultVal;
        },
        has: () => false,
        inspect: () => undefined as any,
        update: () => Promise.resolve(),
      }) as any;

      builder.invalidate();
      const env = await builder.build();
      // additionalEnv should override the default MONITORING_STORAGE_LOCATION
      expect(env.MONITORING_STORAGE_LOCATION).toBe('/custom/storage/path');
    } finally {
      (vscode.workspace.workspaceFolders as any) = origFolders;
      vscode.workspace.getConfiguration = originalGetConfig;
    }
  });

  it('should set ENABLE_ANNOTATION_TOOLS=false when setting is disabled', async () => {
    const vscode = await import('vscode');
    const originalGetConfig = vscode.workspace.getConfiguration;

    try {
      vscode.workspace.getConfiguration = () => ({
        get: (_key: string, defaultVal?: any) => {
          if (_key === 'enableAnnotationTools') return false;
          if (_key === 'additionalDatabaseDirs') return [];
          if (_key === 'additionalQueryRunResultsDirs') return [];
          if (_key === 'additionalMrvaRunResultsDirs') return [];
          return defaultVal;
        },
        has: () => false,
        inspect: () => undefined as any,
        update: () => Promise.resolve(),
      }) as any;

      builder.invalidate();
      const env = await builder.build();
      expect(env.ENABLE_ANNOTATION_TOOLS).toBe('false');
    } finally {
      vscode.workspace.getConfiguration = originalGetConfig;
    }
  });

  it('should set MONITORING_STORAGE_LOCATION to scratch dir when annotations enabled with workspace', async () => {
    const vscode = await import('vscode');
    const origFolders = vscode.workspace.workspaceFolders;

    try {
      (vscode.workspace.workspaceFolders as any) = [
        { uri: { fsPath: '/mock/workspace' }, name: 'ws', index: 0 },
      ];

      builder.invalidate();
      const env = await builder.build();
      expect(env.MONITORING_STORAGE_LOCATION).toBe('/mock/workspace/.codeql/ql-mcp');
    } finally {
      (vscode.workspace.workspaceFolders as any) = origFolders;
    }
  });

  it('should allow additionalEnv to override ENABLE_ANNOTATION_TOOLS', async () => {
    const vscode = await import('vscode');
    const originalGetConfig = vscode.workspace.getConfiguration;

    try {
      vscode.workspace.getConfiguration = () => ({
        get: (_key: string, defaultVal?: any) => {
          if (_key === 'additionalEnv') return { ENABLE_ANNOTATION_TOOLS: 'false' };
          if (_key === 'additionalDatabaseDirs') return [];
          if (_key === 'additionalQueryRunResultsDirs') return [];
          if (_key === 'additionalMrvaRunResultsDirs') return [];
          return defaultVal;
        },
        has: () => false,
        inspect: () => undefined as any,
        update: () => Promise.resolve(),
      }) as any;

      builder.invalidate();
      const env = await builder.build();
      // additionalEnv comes after the default, so it should override
      expect(env.ENABLE_ANNOTATION_TOOLS).toBe('false');
    } finally {
      vscode.workspace.getConfiguration = originalGetConfig;
    }
  });
});
