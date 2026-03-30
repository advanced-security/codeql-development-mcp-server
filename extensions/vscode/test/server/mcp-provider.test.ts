import { describe, it, expect, vi, beforeEach } from 'vitest';


import { McpProvider } from '../../src/server/mcp-provider';

function createMockServerManager() {
  return {
    getCommand: vi.fn().mockReturnValue('npx'),
    getArgs: vi.fn().mockReturnValue(['-y', 'codeql-development-mcp-server']),
    getExtensionVersion: vi.fn().mockReturnValue('2.25.1'),
    getVersion: vi.fn().mockReturnValue(undefined),
    getDescription: vi.fn().mockReturnValue('npx -y codeql-development-mcp-server'),
    getInstallDir: vi.fn().mockReturnValue('/mock/install'),
    getPackageRoot: vi.fn().mockReturnValue('/mock/install/node_modules/codeql-development-mcp-server'),
    isInstalled: vi.fn().mockResolvedValue(true),
    getInstalledVersion: vi.fn().mockResolvedValue('2.24.1'),
    ensureInstalled: vi.fn().mockResolvedValue(false),
    install: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn(),
    push: vi.fn(),
  } as any;
}

function createMockEnvBuilder() {
  return {
    build: vi.fn().mockResolvedValue({
      CODEQL_PATH: '/usr/local/bin/codeql',
      CODEQL_MCP_WORKSPACE: '/mock/workspace',
      CODEQL_DATABASES_BASE_DIRS: '/mock/databases',
      CODEQL_QUERY_RUN_RESULTS_DIRS: '/mock/queries',
      CODEQL_MRVA_RUN_RESULTS_DIRS: '/mock/variant-analyses',
      TRANSPORT_MODE: 'stdio',
    }),
    invalidate: vi.fn(),
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

describe('McpProvider', () => {
  let provider: McpProvider;
  let serverManager: any;
  let envBuilder: any;
  let logger: any;

  beforeEach(() => {
    vi.resetAllMocks();
    serverManager = createMockServerManager();
    envBuilder = createMockEnvBuilder();
    logger = createMockLogger();
    provider = new McpProvider(serverManager, envBuilder, logger);
  });

  it('should be instantiable', () => {
    expect(provider).toBeDefined();
  });

  it('should provide server definitions with npx command', async () => {
    const token = { isCancellationRequested: false, onCancellationRequested: vi.fn() };
    const definitions = await provider.provideMcpServerDefinitions(token as any);

    expect(definitions).toBeDefined();
    expect(definitions).toHaveLength(1);
    expect(definitions![0]).toMatchObject({
      label: 'ql-mcp',
      command: 'npx',
      args: ['-y', 'codeql-development-mcp-server'],
    });
  });

  it('should include environment from envBuilder in the definition', async () => {
    const token = { isCancellationRequested: false, onCancellationRequested: vi.fn() };
    const definitions = await provider.provideMcpServerDefinitions(token as any);

    expect(definitions![0].env).toEqual({
      CODEQL_PATH: '/usr/local/bin/codeql',
      CODEQL_MCP_WORKSPACE: '/mock/workspace',
      CODEQL_DATABASES_BASE_DIRS: '/mock/databases',
      CODEQL_QUERY_RUN_RESULTS_DIRS: '/mock/queries',
      CODEQL_MRVA_RUN_RESULTS_DIRS: '/mock/variant-analyses',
      TRANSPORT_MODE: 'stdio',
    });
  });

  it('should pass discovery env vars through to the MCP server definition', async () => {
    const token = { isCancellationRequested: false, onCancellationRequested: vi.fn() };
    const definitions = await provider.provideMcpServerDefinitions(token as any);
    const env = definitions![0].env;

    expect(env.CODEQL_DATABASES_BASE_DIRS).toBe('/mock/databases');
    expect(env.CODEQL_QUERY_RUN_RESULTS_DIRS).toBe('/mock/queries');
    expect(env.CODEQL_MRVA_RUN_RESULTS_DIRS).toBe('/mock/variant-analyses');
  });

  it('should always provide a definition (npx handles download)', async () => {
    serverManager.isInstalled.mockResolvedValue(false);

    const token = { isCancellationRequested: false, onCancellationRequested: vi.fn() };
    const definitions = await provider.provideMcpServerDefinitions(token as any);

    expect(definitions).toHaveLength(1);
  });

  it('should always provide a defined version string even when serverVersion is latest', async () => {
    // When serverManager.getVersion() returns undefined ("latest" mode),
    // the definition must still carry a concrete version string so that
    // VS Code has a baseline for version comparison. An undefined initial
    // version prevents VS Code from detecting changes after requestRestart().
    //
    // NOTE: McpProvider caches getExtensionVersion() in its constructor, so the
    // mock must be configured before constructing the provider.
    serverManager.getVersion.mockReturnValue(undefined);
    serverManager.getExtensionVersion.mockReturnValue('2.25.1');
    provider = new McpProvider(serverManager, envBuilder, logger);

    const token = { isCancellationRequested: false, onCancellationRequested: vi.fn() };
    const definitions = await provider.provideMcpServerDefinitions(token as any);

    expect(definitions![0].version).toBeDefined();
    expect(typeof definitions![0].version).toBe('string');
    expect(definitions![0].version!.length).toBeGreaterThan(0);
  });

  it('should pass version from serverManager when pinned', async () => {
    serverManager.getVersion.mockReturnValue('2.20.0');

    const token = { isCancellationRequested: false, onCancellationRequested: vi.fn() };
    const definitions = await provider.provideMcpServerDefinitions(token as any);

    expect(definitions![0].version).toBe('2.20.0');
  });

  it('should not change version on fireDidChange (soft signal)', async () => {
    const token = { isCancellationRequested: false, onCancellationRequested: vi.fn() };
    const before = await provider.provideMcpServerDefinitions(token as any);
    const versionBefore = before![0].version;

    provider.fireDidChange();
    const after = await provider.provideMcpServerDefinitions(token as any);

    expect(after![0].version).toBe(versionBefore);
  });

  it('should produce a different version after requestRestart', async () => {
    const token = { isCancellationRequested: false, onCancellationRequested: vi.fn() };
    const before = await provider.provideMcpServerDefinitions(token as any);
    const versionBefore = before![0].version;

    provider.requestRestart();
    const after = await provider.provideMcpServerDefinitions(token as any);
    const versionAfter = after![0].version;

    expect(versionAfter).toBeDefined();
    expect(versionAfter).not.toBe(versionBefore);
  });

  it('should produce distinct versions after successive requestRestart calls', async () => {
    const token = { isCancellationRequested: false, onCancellationRequested: vi.fn() };

    provider.requestRestart();
    const defs1 = await provider.provideMcpServerDefinitions(token as any);

    provider.requestRestart();
    const defs2 = await provider.provideMcpServerDefinitions(token as any);

    expect(defs1![0].version).not.toBe(defs2![0].version);
  });

  it('should append revision to pinned version after requestRestart', async () => {
    serverManager.getVersion.mockReturnValue('2.20.0');
    const token = { isCancellationRequested: false, onCancellationRequested: vi.fn() };

    provider.requestRestart();
    const definitions = await provider.provideMcpServerDefinitions(token as any);

    expect(definitions![0].version).toMatch(/^2\.20\.0\+r\d+$/);
  });

  it('should append revision to extension version after requestRestart when version is latest', async () => {
    serverManager.getVersion.mockReturnValue(undefined);
    serverManager.getExtensionVersion.mockReturnValue('2.25.1');
    const token = { isCancellationRequested: false, onCancellationRequested: vi.fn() };

    provider.requestRestart();
    const definitions = await provider.provideMcpServerDefinitions(token as any);

    expect(definitions![0].version).toMatch(/^2\.25\.1\+r\d+$/);
  });

  it('should fire change event when requestRestart is called', () => {
    const listener = vi.fn();
    provider.onDidChangeMcpServerDefinitions(listener);

    provider.requestRestart();

    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should invalidate env cache when requestRestart is called', () => {
    provider.requestRestart();

    expect(envBuilder.invalidate).toHaveBeenCalledTimes(1);
  });

  it('should resolve definition by refreshing environment', async () => {
    const updatedEnv = { CODEQL_PATH: '/new/path', TRANSPORT_MODE: 'stdio' };
    envBuilder.build.mockResolvedValue(updatedEnv);

    const serverDef = { label: 'ql-mcp', command: 'npx', args: [], env: {} } as any;
    const token = { isCancellationRequested: false, onCancellationRequested: vi.fn() };
    const resolved = await provider.resolveMcpServerDefinition(serverDef, token as any);

    expect(resolved).toBeDefined();
    expect(resolved!.env).toEqual(updatedEnv);
  });

  it('should expose onDidChangeMcpServerDefinitions event', () => {
    expect(provider.onDidChangeMcpServerDefinitions).toBeDefined();
  });

  it('should fire change event when fireDidChange is called', () => {
    expect(() => provider.fireDidChange()).not.toThrow();
  });

  it('should be disposable', () => {
    expect(() => provider.dispose()).not.toThrow();
  });
});
