import { describe, it, expect, vi, beforeEach } from 'vitest';


import { EnvironmentBuilder } from '../../src/bridge/environment-builder';

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

describe('EnvironmentBuilder', () => {
  let builder: EnvironmentBuilder;
  let cliResolver: any;

  beforeEach(() => {
    vi.resetAllMocks();
    cliResolver = createMockCliResolver();
    builder = new EnvironmentBuilder(
      createMockContext(),
      cliResolver,
      createMockStoragePaths(),
      createMockLogger(),
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

  it('should include CODEQL_MCP_TMP_DIR under global storage', async () => {
    const env = await builder.build();
    expect(env.CODEQL_MCP_TMP_DIR).toBe('/mock/global-storage/codeql-mcp/tmp');
  });

  it('should include CODEQL_ADDITIONAL_PACKS with database storage path', async () => {
    const env = await builder.build();
    expect(env.CODEQL_ADDITIONAL_PACKS).toBeDefined();
    expect(env.CODEQL_ADDITIONAL_PACKS).toContain('GitHub.vscode-codeql');
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

  it('should be disposable', () => {
    expect(() => builder.dispose()).not.toThrow();
  });
});
