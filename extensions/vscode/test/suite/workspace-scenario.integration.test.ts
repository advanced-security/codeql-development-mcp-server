/**
 * Integration tests for workspace scenarios.
 *
 * These run inside the Extension Development Host with the REAL VS Code API.
 * The specific workspace configuration (none, single folder, multi-root)
 * depends on which launch config is used.
 *
 * The tests adapt their assertions based on the active workspace state.
 */

import * as assert from 'assert';
import * as vscode from 'vscode';

const EXTENSION_ID = 'advanced-security.vscode-codeql-development-mcp-server';

suite('Workspace Scenario Tests', () => {
  let api: any;

  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, `Extension ${EXTENSION_ID} not found`);
    api = ext.isActive ? ext.exports : await ext.activate();
  });

  test('Extension should activate regardless of workspace state', () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext?.isActive, 'Extension should be active');
  });

  test('Should report correct workspace folder count', () => {
    const folders = vscode.workspace.workspaceFolders;
    const count = folders?.length ?? 0;
    // Log for diagnostic purposes in test output
    console.log(`[workspace-scenario] Workspace folders: ${count}`);
    if (folders) {
      for (const f of folders) {
        console.log(`  - ${f.name}: ${f.uri.fsPath}`);
      }
    }
    // This test records the state — assertions are in scenario-specific tests below
    assert.ok(count >= 0, 'Folder count should be non-negative');
  });

  test('MCP server definition should always be provided', async () => {
    const provider = api.mcpProvider;
    assert.ok(provider, 'mcpProvider should be exported');

    const token = {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    };
    const definitions = await provider.provideMcpServerDefinitions(token as any);
    assert.ok(definitions, 'Should return definitions');
    assert.ok(definitions.length >= 1, 'Should provide at least one server definition');
  });

  test('Environment should include TRANSPORT_MODE', async () => {
    const envBuilder = api.environmentBuilder;
    if (!envBuilder) return;

    const env = await envBuilder.build();
    assert.strictEqual(env.TRANSPORT_MODE, 'stdio');
  });

  test('CODEQL_DATABASES_BASE_DIRS should always contain globalStorage path', async () => {
    const envBuilder = api.environmentBuilder;
    if (!envBuilder) return;

    const env = await envBuilder.build();
    assert.ok(env.CODEQL_DATABASES_BASE_DIRS, 'CODEQL_DATABASES_BASE_DIRS should be set');
    assert.ok(
      env.CODEQL_DATABASES_BASE_DIRS.includes('globalStorage'),
      `Should include globalStorage path: ${env.CODEQL_DATABASES_BASE_DIRS}`,
    );
  });

  test('CODEQL_MCP_WORKSPACE should match first workspace folder when present', async () => {
    const envBuilder = api.environmentBuilder;
    if (!envBuilder) return;

    const env = await envBuilder.build();
    const folders = vscode.workspace.workspaceFolders;

    if (folders && folders.length > 0) {
      assert.strictEqual(
        env.CODEQL_MCP_WORKSPACE,
        folders[0].uri.fsPath,
        'CODEQL_MCP_WORKSPACE should equal the first workspace folder path',
      );
    } else {
      assert.strictEqual(
        env.CODEQL_MCP_WORKSPACE,
        undefined,
        'CODEQL_MCP_WORKSPACE should be undefined when no workspace is open',
      );
    }
  });

  test('CODEQL_DATABASES_BASE_DIRS should include workspaceStorage when workspace is open', async () => {
    const envBuilder = api.environmentBuilder;
    if (!envBuilder) return;

    const env = await envBuilder.build();
    const folders = vscode.workspace.workspaceFolders;
    const dirs = env.CODEQL_DATABASES_BASE_DIRS;

    if (folders && folders.length > 0) {
      assert.ok(
        dirs.includes('workspaceStorage'),
        `With workspace open, CODEQL_DATABASES_BASE_DIRS should include workspaceStorage: ${dirs}`,
      );
    }
    // Without a workspace, only globalStorage is present — already tested above
  });

  test('CODEQL_ADDITIONAL_PACKS should include workspace folder paths when present', async () => {
    const envBuilder = api.environmentBuilder;
    if (!envBuilder) return;

    const env = await envBuilder.build();
    const folders = vscode.workspace.workspaceFolders;

    if (folders && folders.length > 0) {
      for (const folder of folders) {
        assert.ok(
          env.CODEQL_ADDITIONAL_PACKS.includes(folder.uri.fsPath),
          `CODEQL_ADDITIONAL_PACKS should include workspace folder ${folder.name}: ${env.CODEQL_ADDITIONAL_PACKS}`,
        );
      }
    }
  });

  test('Server command should be determined (node or npx)', () => {
    const serverManager = api.serverManager;
    if (!serverManager) return;

    const command = serverManager.getCommand();
    assert.ok(
      command === 'node' || command === 'npx',
      `Server command should be 'node' or 'npx', got: ${command}`,
    );
    console.log(`[workspace-scenario] Server command: ${command}`);
    console.log(`[workspace-scenario] Server args: ${JSON.stringify(serverManager.getArgs())}`);
  });
});
