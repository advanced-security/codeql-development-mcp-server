import { describe, it, expect, vi, beforeEach } from 'vitest';


import { McpProvider } from '../../src/server/mcp-provider';

function createMockServerManager() {
  return {
    getCommand: vi.fn().mockReturnValue('npx'),
    getArgs: vi.fn().mockReturnValue(['-y', 'codeql-development-mcp-server']),
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
    });
  });

  it('should always provide a definition (npx handles download)', async () => {
    serverManager.isInstalled.mockResolvedValue(false);

    const token = { isCancellationRequested: false, onCancellationRequested: vi.fn() };
    const definitions = await provider.provideMcpServerDefinitions(token as any);

    expect(definitions).toHaveLength(1);
  });

  it('should pass version from serverManager when pinned', async () => {
    serverManager.getVersion.mockReturnValue('2.20.0');

    const token = { isCancellationRequested: false, onCancellationRequested: vi.fn() };
    const definitions = await provider.provideMcpServerDefinitions(token as any);

    expect(definitions![0].version).toBe('2.20.0');
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
