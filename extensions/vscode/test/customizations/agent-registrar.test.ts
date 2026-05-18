/**
 * Tests for AgentRegistrar.
 *
 * Uses the existing __mocks__/vscode.ts via vitest.config.ts resolve.alias.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

// We need a stateful config mock so we can verify updates
function createStatefulConfigMock(initialValues: Record<string, unknown> = {}) {
  const store: Record<string, unknown> = { ...initialValues };
  return {
    get: vi.fn((key: string, defaultVal?: unknown) => {
      return key in store ? store[key] : defaultVal;
    }),
    has: vi.fn(() => false),
    inspect: vi.fn(() => undefined),
    update: vi.fn((key: string, value: unknown) => {
      store[key] = value;
      return Promise.resolve();
    }),
    _store: store,
  };
}

// Module-level config stores so we can inspect/update them in tests
let codeqlMcpCfg = createStatefulConfigMock({ 'agents.enabled': true, 'additionalAgentDirs': [] });
let chatCfg = createStatefulConfigMock({ 'agentFilesLocations': {} });

vi.spyOn(vscode.workspace, 'getConfiguration').mockImplementation((section?: string) => {
  if (section === 'codeql-mcp') return codeqlMcpCfg as any;
  if (section === 'chat') return chatCfg as any;
  return createStatefulConfigMock() as any;
});

// Set workspaceFolders to a non-empty array for Workspace target tests
vi.spyOn(vscode.workspace, 'workspaceFolders', 'get').mockReturnValue([{ uri: { fsPath: '/ws' } }] as any);

import { AgentRegistrar } from '../../src/customizations/agent-registrar';

function createMockContext(extensionPath = '/mock/extension'): vscode.ExtensionContext {
  return {
    extensionUri: { fsPath: extensionPath },
    extensionPath,
    subscriptions: [],
  } as unknown as vscode.ExtensionContext;
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

describe('AgentRegistrar', () => {
  beforeEach(() => {
    codeqlMcpCfg = createStatefulConfigMock({ 'agents.enabled': true, 'additionalAgentDirs': [] });
    chatCfg = createStatefulConfigMock({ 'agentFilesLocations': {} });
    vi.spyOn(vscode.workspace, 'getConfiguration').mockImplementation((section?: string) => {
      if (section === 'codeql-mcp') return codeqlMcpCfg as any;
      if (section === 'chat') return chatCfg as any;
      return createStatefulConfigMock() as any;
    });
  });

  it('adds bundled agents/ dir to chat.agentFilesLocations when enabled', async () => {
    const ctx = createMockContext('/mock/extension');
    const logger = createMockLogger();
    const registrar = new AgentRegistrar(ctx, logger);
    registrar.register();
    // Wait for the async update to resolve
    await Promise.resolve();

    const updated = chatCfg._store['agentFilesLocations'] as Record<string, boolean>;
    const bundledDir = '/mock/extension/agents';
    expect(Object.keys(updated)).toContain(bundledDir);
  });

  it('does not add bundled dir when agents.enabled = false', async () => {
    codeqlMcpCfg = createStatefulConfigMock({ 'agents.enabled': false, 'additionalAgentDirs': [] });
    vi.spyOn(vscode.workspace, 'getConfiguration').mockImplementation((section?: string) => {
      if (section === 'codeql-mcp') return codeqlMcpCfg as any;
      if (section === 'chat') return chatCfg as any;
      return createStatefulConfigMock() as any;
    });

    const ctx = createMockContext('/mock/extension');
    const logger = createMockLogger();
    const registrar = new AgentRegistrar(ctx, logger);
    registrar.register();
    await Promise.resolve();

    const updated = chatCfg._store['agentFilesLocations'] as Record<string, boolean> | undefined;
    expect(updated ? Object.keys(updated) : []).not.toContain('/mock/extension/agents');
  });

  it('appends additionalAgentDirs alongside bundled dir', async () => {
    codeqlMcpCfg = createStatefulConfigMock({
      'agents.enabled': true,
      'additionalAgentDirs': ['/custom/agents'],
    });
    vi.spyOn(vscode.workspace, 'getConfiguration').mockImplementation((section?: string) => {
      if (section === 'codeql-mcp') return codeqlMcpCfg as any;
      if (section === 'chat') return chatCfg as any;
      return createStatefulConfigMock() as any;
    });

    const ctx = createMockContext('/mock/extension');
    const logger = createMockLogger();
    const registrar = new AgentRegistrar(ctx, logger);
    registrar.register();
    await Promise.resolve();

    const updated = chatCfg._store['agentFilesLocations'] as Record<string, boolean>;
    expect(Object.keys(updated)).toContain('/mock/extension/agents');
    expect(Object.keys(updated)).toContain('/custom/agents');
  });

  it('does not add duplicate entries on repeated register() calls', async () => {
    const ctx = createMockContext('/mock/extension');
    const logger = createMockLogger();
    const registrar = new AgentRegistrar(ctx, logger);
    registrar.register();
    await Promise.resolve();
    registrar.register();
    await Promise.resolve();

    const updated = chatCfg._store['agentFilesLocations'] as Record<string, boolean>;
    const bundledDir = '/mock/extension/agents';
    const count = Object.keys(updated).filter((k) => k === bundledDir).length;
    expect(count).toBe(1);
  });

  it('uses ConfigurationTarget.Workspace when workspaceFolders is non-empty', async () => {
    const ctx = createMockContext('/mock/extension');
    const logger = createMockLogger();
    const registrar = new AgentRegistrar(ctx, logger);
    registrar.register();
    await Promise.resolve();

    expect(chatCfg.update).toHaveBeenCalledWith(
      'agentFilesLocations',
      expect.any(Object),
      vscode.ConfigurationTarget.Workspace,
    );
  });

  it('uses ConfigurationTarget.Global when workspaceFolders is empty', async () => {
    vi.spyOn(vscode.workspace, 'workspaceFolders', 'get').mockReturnValueOnce([] as any);

    const ctx = createMockContext('/mock/extension');
    const logger = createMockLogger();
    const registrar = new AgentRegistrar(ctx, logger);
    registrar.register();
    await Promise.resolve();

    expect(chatCfg.update).toHaveBeenCalledWith(
      'agentFilesLocations',
      expect.any(Object),
      vscode.ConfigurationTarget.Global,
    );
  });

  it('dispose() removes only the entries this instance added', async () => {
    // Pre-populate with an existing entry
    chatCfg = createStatefulConfigMock({
      'agentFilesLocations': { '/pre-existing/agents': true },
    });
    vi.spyOn(vscode.workspace, 'getConfiguration').mockImplementation((section?: string) => {
      if (section === 'codeql-mcp') return codeqlMcpCfg as any;
      if (section === 'chat') return chatCfg as any;
      return createStatefulConfigMock() as any;
    });

    const ctx = createMockContext('/mock/extension');
    const logger = createMockLogger();
    const registrar = new AgentRegistrar(ctx, logger);
    registrar.register();
    await Promise.resolve();

    // Both entries should be present
    let locs = chatCfg._store['agentFilesLocations'] as Record<string, boolean>;
    expect(Object.keys(locs)).toContain('/pre-existing/agents');
    expect(Object.keys(locs)).toContain('/mock/extension/agents');

    registrar.dispose();
    await Promise.resolve();

    locs = chatCfg._store['agentFilesLocations'] as Record<string, boolean>;
    expect(Object.keys(locs)).toContain('/pre-existing/agents');
    expect(Object.keys(locs)).not.toContain('/mock/extension/agents');
  });

  it('dispose() is idempotent — safe to call twice', async () => {
    const ctx = createMockContext('/mock/extension');
    const logger = createMockLogger();
    const registrar = new AgentRegistrar(ctx, logger);
    registrar.register();
    await Promise.resolve();

    expect(() => {
      registrar.dispose();
      registrar.dispose();
    }).not.toThrow();
  });

  it('getStatus() returns correct shape', () => {
    const ctx = createMockContext('/mock/extension');
    const logger = createMockLogger();
    const registrar = new AgentRegistrar(ctx, logger);
    const status = registrar.getStatus();

    expect(status).toHaveProperty('enabled');
    expect(status).toHaveProperty('bundledDir');
    expect(status).toHaveProperty('additionalDirs');
    expect(status).toHaveProperty('effectiveLocations');
    expect(status.bundledDir).toBe('/mock/extension/agents');
  });
});
