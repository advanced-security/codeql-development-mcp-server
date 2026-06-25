import { describe, it, expect, vi, beforeEach } from 'vitest';
import { delimiter, join, normalize } from 'path';

import {
  EnvironmentBuilder,
  computeResolutionRoots,
  hasTopLevelCodeqlWorkspaceFile,
} from '../../src/bridge/environment-builder';
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
  let logger: any;
  let mockCopier: ReturnType<typeof createMockCopierFactory>;

  beforeEach(() => {
    vi.resetAllMocks();
    cliResolver = createMockCliResolver();
    logger = createMockLogger();
    mockCopier = createMockCopierFactory();
    builder = new EnvironmentBuilder(
      createMockContext(),
      cliResolver,
      createMockStoragePaths(),
      logger,
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

  it('should anchor CODEQL_MCP_WORKSPACE to the first resolution root, not the first open folder', async () => {
    const vscode = await import('vscode');
    const { join } = await import('path');
    const { mkdtempSync, mkdirSync, rmSync, writeFileSync } = await import('fs');
    const { tmpdir } = await import('os');
    const origFolders = vscode.workspace.workspaceFolders;

    // First open folder lacks codeql-workspace.yml and is therefore excluded
    // from the resolution roots under the default requireCodeqlWorkspace=true;
    // the second folder qualifies.
    const base = mkdtempSync(join(tmpdir(), 'ql-mcp-envb-anchor-'));
    const withoutFile = join(base, 'without-cqlws');
    const withFile = join(base, 'with-cqlws');
    mkdirSync(withoutFile, { recursive: true });
    mkdirSync(withFile, { recursive: true });
    writeFileSync(join(withFile, 'codeql-workspace.yml'), 'provide:\n  - "**/qlpack.yml"\n');

    try {
      (vscode.workspace.workspaceFolders as any) = [
        { uri: { fsPath: withoutFile }, name: 'without', index: 0 },
        { uri: { fsPath: withFile }, name: 'with', index: 1 },
      ];

      builder.invalidate();
      const env = await builder.build();
      // CODEQL_MCP_WORKSPACE must point at the qualifying folder, not the
      // intentionally excluded first open folder.
      expect(env.CODEQL_MCP_WORKSPACE).toBe(withFile);
    } finally {
      (vscode.workspace.workspaceFolders as any) = origFolders;
      rmSync(base, { recursive: true, force: true });
    }
  });

  it('should fall back CODEQL_MCP_WORKSPACE to the first open folder when there are no resolution roots', async () => {
    const vscode = await import('vscode');
    const origFolders = vscode.workspace.workspaceFolders;
    const originalGetConfig = vscode.workspace.getConfiguration;

    try {
      // No folder qualifies (no codeql-workspace.yml on disk) and excludes
      // strip every folder, leaving no resolution roots. CODEQL_MCP_WORKSPACE
      // should still anchor to the first open folder so relative-path tools
      // keep working.
      (vscode.workspace.workspaceFolders as any) = [
        { uri: { fsPath: '/mock/ws-a' }, name: 'a', index: 0 },
      ];
      vscode.workspace.getConfiguration = () => ({
        get: (_key: string, defaultVal?: any) => {
          if (_key === 'queryPackExcludeDirs') return ['/mock/ws-a'];
          return defaultVal;
        },
        has: () => false,
        inspect: () => undefined as any,
        update: () => Promise.resolve(),
      }) as any;

      builder.invalidate();
      const env = await builder.build();
      expect(env.CODEQL_MCP_WORKSPACE).toBe('/mock/ws-a');
    } finally {
      (vscode.workspace.workspaceFolders as any) = origFolders;
      vscode.workspace.getConfiguration = originalGetConfig;
    }
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

  it('should not set ENABLE_ANNOTATION_TOOLS (server defaults to true)', async () => {
    const env = await builder.build();
    expect(env.ENABLE_ANNOTATION_TOOLS).toBeUndefined();
  });

  it('should not overwrite MONITORING_STORAGE_LOCATION if already set in parent env', async () => {
    const vscode = await import('vscode');
    const origFolders = vscode.workspace.workspaceFolders;
    const origMonLoc = process.env.MONITORING_STORAGE_LOCATION;

    try {
      (vscode.workspace.workspaceFolders as any) = [
        { uri: { fsPath: '/mock/workspace' }, name: 'ws', index: 0 },
      ];
      // Simulate parent process env with MONITORING_STORAGE_LOCATION already set
      process.env.MONITORING_STORAGE_LOCATION = '/custom/storage/path';

      builder.invalidate();
      const env = await builder.build();
      // process.env value should be preserved
      expect(env.MONITORING_STORAGE_LOCATION).toBe('/custom/storage/path');
    } finally {
      (vscode.workspace.workspaceFolders as any) = origFolders;
      if (origMonLoc === undefined) {
        delete process.env.MONITORING_STORAGE_LOCATION;
      } else {
        process.env.MONITORING_STORAGE_LOCATION = origMonLoc;
      }
    }
  });

  it('should set MONITORING_STORAGE_LOCATION to scratch dir when workspace is open', async () => {
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

  it('should allow additionalEnv to set custom environment variables', async () => {
    const vscode = await import('vscode');
    const originalGetConfig = vscode.workspace.getConfiguration;

    try {
      vscode.workspace.getConfiguration = () => ({
        get: (_key: string, defaultVal?: any) => {
          if (_key === 'additionalEnv') return { MY_CUSTOM_VAR: 'custom-value' };
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
      expect(env.MY_CUSTOM_VAR).toBe('custom-value');
    } finally {
      vscode.workspace.getConfiguration = originalGetConfig;
    }
  });

  it('should set CODEQL_MCP_SCAN_EXCLUDE_DIRS when scanExcludeDirs setting is non-empty', async () => {
    const vscode = await import('vscode');
    const originalGetConfig = vscode.workspace.getConfiguration;

    try {
      vscode.workspace.getConfiguration = () => ({
        get: (_key: string, defaultVal?: any) => {
          if (_key === 'scanExcludeDirs') return ['custom-build', '!dist'];
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
      expect(env.CODEQL_MCP_SCAN_EXCLUDE_DIRS).toBe('custom-build,!dist');
    } finally {
      vscode.workspace.getConfiguration = originalGetConfig;
    }
  });

  it('should not set CODEQL_MCP_SCAN_EXCLUDE_DIRS when scanExcludeDirs is empty', async () => {
    const env = await builder.build();
    expect(env.CODEQL_MCP_SCAN_EXCLUDE_DIRS).toBeUndefined();
  });

  it('should append absolute queryPackIncludeDirs to resolution roots when requireCodeqlWorkspace=false', async () => {
    const vscode = await import('vscode');
    const { delimiter } = await import('path');
    const origFolders = vscode.workspace.workspaceFolders;
    const originalGetConfig = vscode.workspace.getConfiguration;

    try {
      (vscode.workspace.workspaceFolders as any) = [
        { uri: { fsPath: '/mock/ws-a' }, name: 'a', index: 0 },
      ];
      // requireCodeqlWorkspace=false uses every open folder as a resolution
      // root regardless of codeql-workspace.yml.
      vscode.workspace.getConfiguration = () => ({
        get: (_key: string, defaultVal?: any) => {
          if (_key === 'requireCodeqlWorkspace') return false;
          if (_key === 'queryPackIncludeDirs') return ['/extra/query-repo'];
          return defaultVal;
        },
        has: () => false,
        inspect: () => undefined as any,
        update: () => Promise.resolve(),
      }) as any;

      builder.invalidate();
      const env = await builder.build();
      const roots = env.CODEQL_MCP_WORKSPACE_FOLDERS.split(delimiter);
      expect(roots).toContain('/mock/ws-a');
      expect(roots).toContain('/extra/query-repo');
      // Additional packs should also include the explicit include dir.
      expect(env.CODEQL_ADDITIONAL_PACKS).toContain('/extra/query-repo');
    } finally {
      (vscode.workspace.workspaceFolders as any) = origFolders;
      vscode.workspace.getConfiguration = originalGetConfig;
    }
  });

  it('should resolve relative queryPackIncludeDirs against each workspace folder', async () => {
    const vscode = await import('vscode');
    const { delimiter, join } = await import('path');
    const origFolders = vscode.workspace.workspaceFolders;
    const originalGetConfig = vscode.workspace.getConfiguration;

    try {
      (vscode.workspace.workspaceFolders as any) = [
        { uri: { fsPath: '/mock/ws-a' }, name: 'a', index: 0 },
        { uri: { fsPath: '/mock/ws-b' }, name: 'b', index: 1 },
      ];
      vscode.workspace.getConfiguration = () => ({
        get: (_key: string, defaultVal?: any) => {
          if (_key === 'queryPackIncludeDirs') return ['queries'];
          return defaultVal;
        },
        has: () => false,
        inspect: () => undefined as any,
        update: () => Promise.resolve(),
      }) as any;

      builder.invalidate();
      const env = await builder.build();
      const roots = env.CODEQL_MCP_WORKSPACE_FOLDERS.split(delimiter);
      expect(roots).toContain(join('/mock/ws-a', 'queries'));
      expect(roots).toContain(join('/mock/ws-b', 'queries'));
    } finally {
      (vscode.workspace.workspaceFolders as any) = origFolders;
      vscode.workspace.getConfiguration = originalGetConfig;
    }
  });

  it('should remove excluded workspace folders from resolution roots and additional packs', async () => {
    const vscode = await import('vscode');
    const { delimiter } = await import('path');
    const origFolders = vscode.workspace.workspaceFolders;
    const originalGetConfig = vscode.workspace.getConfiguration;

    try {
      (vscode.workspace.workspaceFolders as any) = [
        { uri: { fsPath: '/mock/ws-a' }, name: 'a', index: 0 },
        { uri: { fsPath: '/mock/ws-b' }, name: 'b', index: 1 },
      ];
      vscode.workspace.getConfiguration = () => ({
        get: (_key: string, defaultVal?: any) => {
          if (_key === 'queryPackExcludeDirs') return ['/mock/ws-b'];
          return defaultVal;
        },
        has: () => false,
        inspect: () => undefined as any,
        update: () => Promise.resolve(),
      }) as any;

      builder.invalidate();
      const env = await builder.build();
      const roots = env.CODEQL_MCP_WORKSPACE_FOLDERS.split(delimiter);
      expect(roots).toContain('/mock/ws-a');
      expect(roots).not.toContain('/mock/ws-b');
      expect(env.CODEQL_ADDITIONAL_PACKS).not.toContain('/mock/ws-b');
    } finally {
      (vscode.workspace.workspaceFolders as any) = origFolders;
      vscode.workspace.getConfiguration = originalGetConfig;
    }
  });

  it('should support absolute queryPackIncludeDirs even when no workspace is open', async () => {
    const vscode = await import('vscode');
    const { delimiter } = await import('path');
    const origFolders = vscode.workspace.workspaceFolders;
    const originalGetConfig = vscode.workspace.getConfiguration;

    try {
      (vscode.workspace.workspaceFolders as any) = undefined;
      vscode.workspace.getConfiguration = () => ({
        get: (_key: string, defaultVal?: any) => {
          if (_key === 'queryPackIncludeDirs') return ['/extra/query-repo'];
          return defaultVal;
        },
        has: () => false,
        inspect: () => undefined as any,
        update: () => Promise.resolve(),
      }) as any;

      builder.invalidate();
      const env = await builder.build();
      const roots = (env.CODEQL_MCP_WORKSPACE_FOLDERS ?? '').split(delimiter).filter(Boolean);
      expect(roots).toContain('/extra/query-repo');
    } finally {
      (vscode.workspace.workspaceFolders as any) = origFolders;
      vscode.workspace.getConfiguration = originalGetConfig;
    }
  });

  it('should warn and fall back to all folders when no folder has codeql-workspace.yml', async () => {
    const vscode = await import('vscode');
    const { delimiter } = await import('path');
    const origFolders = vscode.workspace.workspaceFolders;

    try {
      // /mock paths do not exist on disk, so none contain a codeql-workspace.yml.
      // With the default requireCodeqlWorkspace=true and no include dirs, the
      // builder should gracefully fall back to every folder and warn once.
      (vscode.workspace.workspaceFolders as any) = [
        { uri: { fsPath: '/mock/ws-a' }, name: 'a', index: 0 },
        { uri: { fsPath: '/mock/ws-b' }, name: 'b', index: 1 },
      ];

      builder.invalidate();
      const env = await builder.build();
      const roots = env.CODEQL_MCP_WORKSPACE_FOLDERS.split(delimiter);
      expect(roots).toContain('/mock/ws-a');
      expect(roots).toContain('/mock/ws-b');
      expect(logger.warn).toHaveBeenCalled();
      const warnMsg = (logger.warn as any).mock.calls
        .map((c: any[]) => String(c[0]))
        .join('\n');
      expect(warnMsg).toContain('codeql-workspace.yml');
    } finally {
      (vscode.workspace.workspaceFolders as any) = origFolders;
    }
  });

  it('should include only folders that contain a top-level codeql-workspace.yml (real fs)', async () => {
    const vscode = await import('vscode');
    const { delimiter, join } = await import('path');
    const { mkdtempSync, mkdirSync, rmSync, writeFileSync } = await import('fs');
    const { tmpdir } = await import('os');
    const origFolders = vscode.workspace.workspaceFolders;

    const base = mkdtempSync(join(tmpdir(), 'ql-mcp-envb-'));
    const withFile = join(base, 'with-cqlws');
    const withoutFile = join(base, 'without-cqlws');
    mkdirSync(withFile, { recursive: true });
    mkdirSync(withoutFile, { recursive: true });
    writeFileSync(join(withFile, 'codeql-workspace.yml'), 'provide:\n  - "**/qlpack.yml"\n');

    try {
      (vscode.workspace.workspaceFolders as any) = [
        { uri: { fsPath: withFile }, name: 'with', index: 0 },
        { uri: { fsPath: withoutFile }, name: 'without', index: 1 },
      ];

      builder.invalidate();
      const env = await builder.build();
      const roots = env.CODEQL_MCP_WORKSPACE_FOLDERS.split(delimiter);
      expect(roots).toContain(withFile);
      expect(roots).not.toContain(withoutFile);
      // A folder qualified, so no fallback warning should fire.
      expect(logger.warn).not.toHaveBeenCalled();
    } finally {
      (vscode.workspace.workspaceFolders as any) = origFolders;
      rmSync(base, { recursive: true, force: true });
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// computeResolutionRoots — pure logic
// ────────────────────────────────────────────────────────────────────────────

describe('computeResolutionRoots', () => {
  function makeConfig(overrides: Record<string, unknown> = {}) {
    return {
      get: (key: string, defaultVal?: any) =>
        Object.prototype.hasOwnProperty.call(overrides, key) ? overrides[key] : defaultVal,
      has: () => false,
      inspect: () => undefined as any,
      update: () => Promise.resolve(),
    } as any;
  }

  /** A fake fileExists that reports a codeql-workspace.yml in the given folders. */
  const hasFileFor =
    (...folders: string[]) =>
    (p: string) =>
      folders.some((f) => p === join(f, 'codeql-workspace.yml'));

  it('requires codeql-workspace.yml by default: only qualifying folders are roots', () => {
    const result = computeResolutionRoots(
      ['/ws/a', '/ws/b'],
      makeConfig(),
      hasFileFor('/ws/a'),
    );
    expect(result.roots).toEqual([normalize('/ws/a')]);
    expect(result.fellBackToAllFolders).toBe(false);
  });

  it('falls back to all folders (with flag) when none qualify and no includes', () => {
    const result = computeResolutionRoots(['/ws/a', '/ws/b'], makeConfig(), () => false);
    expect(result.roots).toEqual([normalize('/ws/a'), normalize('/ws/b')]);
    expect(result.fellBackToAllFolders).toBe(true);
  });

  it('does not fall back when include dirs are present', () => {
    const result = computeResolutionRoots(
      ['/ws/a'],
      makeConfig({ queryPackIncludeDirs: ['/inc'] }),
      () => false,
    );
    expect(result.roots).toEqual([normalize('/inc')]);
    expect(result.fellBackToAllFolders).toBe(false);
  });

  it('requireCodeqlWorkspace=false includes every folder', () => {
    const result = computeResolutionRoots(
      ['/ws/a', '/ws/b'],
      makeConfig({ requireCodeqlWorkspace: false }),
      () => false,
    );
    expect(result.roots).toEqual([normalize('/ws/a'), normalize('/ws/b')]);
    expect(result.fellBackToAllFolders).toBe(false);
  });

  it('always includes queryPackIncludeDirs alongside qualifying folders', () => {
    const result = computeResolutionRoots(
      ['/ws/a', '/ws/b'],
      makeConfig({ queryPackIncludeDirs: ['/inc'] }),
      hasFileFor('/ws/a'),
    );
    expect(result.roots).toContain(normalize('/ws/a'));
    expect(result.roots).toContain(normalize('/inc'));
    expect(result.roots).not.toContain(normalize('/ws/b'));
  });

  it('drops excluded folders even when they qualify', () => {
    const result = computeResolutionRoots(
      ['/ws/a', '/ws/b'],
      makeConfig({ queryPackExcludeDirs: ['/ws/b'] }),
      hasFileFor('/ws/a', '/ws/b'),
    );
    expect(result.roots).toEqual([normalize('/ws/a')]);
  });

  it('uses absolute include dirs when no workspace folders are open', () => {
    const result = computeResolutionRoots(
      [],
      makeConfig({ queryPackIncludeDirs: ['/inc'] }),
      () => false,
    );
    expect(result.roots).toEqual([normalize('/inc')]);
    expect(result.fellBackToAllFolders).toBe(false);
  });
});

describe('hasTopLevelCodeqlWorkspaceFile', () => {
  it('returns true when codeql-workspace.yml exists at the folder top level', () => {
    expect(
      hasTopLevelCodeqlWorkspaceFile(
        '/ws/a',
        (p) => p === join('/ws/a', 'codeql-workspace.yml'),
      ),
    ).toBe(true);
  });

  it('returns false when the file is absent', () => {
    expect(hasTopLevelCodeqlWorkspaceFile('/ws/a', () => false)).toBe(false);
  });
});
