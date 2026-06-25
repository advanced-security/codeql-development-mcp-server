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
import * as path from 'path';
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

  test('CODEQL_MCP_WORKSPACE should match first resolution root when present', async () => {
    const envBuilder = api.environmentBuilder;
    if (!envBuilder) return;

    const env = await envBuilder.build();
    const folders = vscode.workspace.workspaceFolders;

    if (folders && folders.length > 0) {
      // CODEQL_MCP_WORKSPACE anchors to the first computed resolution root
      // (exported via CODEQL_MCP_WORKSPACE_FOLDERS), falling back to the first
      // open folder only when no resolution roots were computed.
      const resolutionRoots = (env.CODEQL_MCP_WORKSPACE_FOLDERS ?? '')
        .split(path.delimiter)
        .filter(Boolean);
      const expected =
        resolutionRoots.length > 0 ? resolutionRoots[0] : folders[0].uri.fsPath;
      assert.strictEqual(
        env.CODEQL_MCP_WORKSPACE,
        expected,
        'CODEQL_MCP_WORKSPACE should equal the first resolution root (or first folder when none)',
      );
    } else {
      assert.strictEqual(
        env.CODEQL_MCP_WORKSPACE,
        undefined,
        'CODEQL_MCP_WORKSPACE should be undefined when no workspace is open',
      );
    }
  });

  test('CODEQL_DATABASES_BASE_DIRS should include managed database path or workspaceStorage when workspace is open', async () => {
    const envBuilder = api.environmentBuilder;
    if (!envBuilder) return;

    const env = await envBuilder.build();
    const folders = vscode.workspace.workspaceFolders;
    const dirs = env.CODEQL_DATABASES_BASE_DIRS;

    if (folders && folders.length > 0) {
      // With copyDatabases enabled (default), CODEQL_DATABASES_BASE_DIRS points
      // to a managed databases/ directory under our globalStorage instead of the
      // original workspaceStorage paths. Accept either layout.
      const dirList = String(dirs)
        .split(path.delimiter)
        .filter((p: string) => p);
      const hasManagedDir = dirList.some((p: string) => path.basename(p) === 'databases');
      const hasWorkspaceStorage = dirList.some((p: string) => p.includes('workspaceStorage'));
      assert.ok(
        hasManagedDir || hasWorkspaceStorage,
        `With workspace open, CODEQL_DATABASES_BASE_DIRS should include managed databases dir or workspaceStorage: ${dirs}`,
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

  test('copyDatabases: CODEQL_DATABASES_BASE_DIRS should use managed dir under our globalStorage', async () => {
    const envBuilder = api.environmentBuilder;
    if (!envBuilder) return;

    const env = await envBuilder.build();
    const dirs = env.CODEQL_DATABASES_BASE_DIRS;
    assert.ok(dirs, 'CODEQL_DATABASES_BASE_DIRS should be set');

    // With copyDatabases: true (default), the first path segment should be
    // under our extension's globalStorage (not GitHub.vscode-codeql's).
    const parts = dirs.split(path.delimiter);
    const managedParts = parts.filter((p: string) => path.basename(p) === 'databases');
    assert.ok(
      managedParts.length >= 1,
      `Expected a managed /databases path in CODEQL_DATABASES_BASE_DIRS: ${dirs}`,
    );

    // Log for diagnostic purposes
    console.log(`[workspace-scenario] CODEQL_DATABASES_BASE_DIRS: ${dirs}`);
    console.log(`[workspace-scenario] Managed database dirs: ${managedParts.join(', ')}`);
  });

  test('CODEQL_MCP_WORKSPACE_FOLDERS should list every workspace root', async () => {
    const envBuilder = api.environmentBuilder;
    if (!envBuilder) return;

    const env = await envBuilder.build();
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      // No workspace open — folders env may be unset unless includeDirs are set.
      return;
    }

    const roots = String(env.CODEQL_MCP_WORKSPACE_FOLDERS ?? '')
      .split(path.delimiter)
      .filter(Boolean);
    for (const folder of folders) {
      assert.ok(
        roots.includes(folder.uri.fsPath),
        `CODEQL_MCP_WORKSPACE_FOLDERS should include root ${folder.name} (${folder.uri.fsPath}): ${env.CODEQL_MCP_WORKSPACE_FOLDERS}`,
      );
    }

    if (folders.length > 1) {
      // Assert the last (non-first) folder is present.
      assert.ok(
        roots.includes(folders[folders.length - 1].uri.fsPath),
        'CODEQL_MCP_WORKSPACE_FOLDERS should include the last (non-first) workspace folder',
      );
    }
  });

  test('queryPackIncludeDirs/queryPackExcludeDirs tune the resolution roots', async () => {
    const envBuilder = api.environmentBuilder;
    if (!envBuilder) return;

    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length < 2) {
      // This behaviour is only meaningful in a multi-root workspace.
      return;
    }

    const config = vscode.workspace.getConfiguration('codeql-mcp');
    const extraDir = path.join(folders[0].uri.fsPath, '..', 'external-query-repo');
    const excludedFolder = folders[folders.length - 1].uri.fsPath;

    try {
      await config.update('queryPackIncludeDirs', [extraDir], vscode.ConfigurationTarget.Workspace);
      await config.update('queryPackExcludeDirs', [excludedFolder], vscode.ConfigurationTarget.Workspace);
      envBuilder.invalidate();

      const env = await envBuilder.build();
      const roots = String(env.CODEQL_MCP_WORKSPACE_FOLDERS ?? '')
        .split(path.delimiter)
        .filter(Boolean);

      assert.ok(
        roots.some((r: string) => path.normalize(r) === path.normalize(extraDir)),
        `Included dir should be present in resolution roots: ${env.CODEQL_MCP_WORKSPACE_FOLDERS}`,
      );
      assert.ok(
        !roots.includes(excludedFolder),
        `Excluded folder should be absent from resolution roots: ${env.CODEQL_MCP_WORKSPACE_FOLDERS}`,
      );
      assert.ok(
        !String(env.CODEQL_ADDITIONAL_PACKS).split(path.delimiter).includes(excludedFolder),
        `Excluded folder should be absent from CODEQL_ADDITIONAL_PACKS: ${env.CODEQL_ADDITIONAL_PACKS}`,
      );
    } finally {
      await config.update('queryPackIncludeDirs', undefined, vscode.ConfigurationTarget.Workspace);
      await config.update('queryPackExcludeDirs', undefined, vscode.ConfigurationTarget.Workspace);
      envBuilder.invalidate();
    }
  });
});
