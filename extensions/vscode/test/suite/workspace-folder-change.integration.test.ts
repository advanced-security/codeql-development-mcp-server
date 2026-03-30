/**
 * Integration tests for workspace folder change handling.
 *
 * These run inside the Extension Development Host with the REAL VS Code API
 * under the `multiRoot` profile (4 workspace folders: folder-a … folder-d).
 *
 * They verify that:
 * 1. The cached environment is rebuilt to include newly added folders.
 * 2. The cached environment is rebuilt to exclude removed folders.
 * 3. Original fixture folders survive after workspace mutations.
 *
 * Note: VS Code itself manages the MCP server lifecycle (stop/start) when
 * workspace roots change.  Our extension invalidates its env cache so the
 * next server start picks up the updated workspace folder list.
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

const EXTENSION_ID = 'advanced-security.vscode-codeql-development-mcp-server';

/**
 * Create a temporary directory and resolve its real path (macOS `/tmp` is a
 * symlink to `/private/tmp`; VS Code resolves symlinks in `uri.fsPath`).
 */
function createTempDir(prefix: string): string {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
}

/** Wait for `onDidChangeWorkspaceFolders` to fire once. */
function waitForWorkspaceFolderChange(): Promise<void> {
  return new Promise<void>((resolve) => {
    const d = vscode.workspace.onDidChangeWorkspaceFolders(() => {
      d.dispose();
      resolve();
    });
  });
}

/**
 * Add a folder to the workspace and wait for the change event to settle.
 * Throws if `updateWorkspaceFolders` returns `false`.
 */
async function addWorkspaceFolder(uri: vscode.Uri): Promise<void> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  const changePromise = waitForWorkspaceFolderChange();
  const ok = vscode.workspace.updateWorkspaceFolders(folders.length, 0, { uri });
  assert.ok(ok, 'updateWorkspaceFolders (add) returned false');
  await changePromise;
}

/**
 * Remove a workspace folder by its `fsPath` and wait for the change event.
 * No-op if the folder is not currently in the workspace.
 */
async function removeWorkspaceFolder(fsPath: string): Promise<void> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  const idx = folders.findIndex((f) => f.uri.fsPath === fsPath);
  if (idx < 0) return;
  const changePromise = waitForWorkspaceFolderChange();
  vscode.workspace.updateWorkspaceFolders(idx, 1);
  await changePromise;
}

suite('Workspace Folder Change Tests', () => {
  let api: any;

  suiteSetup(async function () {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, `Extension ${EXTENSION_ID} not found`);
    api = ext.isActive ? ext.exports : await ext.activate();
    assert.ok(api.environmentBuilder, 'API missing environmentBuilder');

    const folders = vscode.workspace.workspaceFolders;
    console.log(
      `[workspace-folder-change] Starting with ${folders?.length ?? 0} workspace folders`,
    );
    if (!folders || folders.length < 2) {
      console.log('[workspace-folder-change] Skipping — requires multiRoot workspace (>= 2 folders)');
      this.skip();
    }
  });

  // ---------------------------------------------------------------
  // Test 1: Environment includes the newly added folder
  // ---------------------------------------------------------------
  test('CODEQL_MCP_WORKSPACE_FOLDERS should include newly added folder', async () => {
    const envBuilder = api.environmentBuilder;
    const tempDir = createTempDir('ql-mcp-env-');

    await addWorkspaceFolder(vscode.Uri.file(tempDir));

    try {
      const env = await envBuilder.build();
      assert.ok(
        env.CODEQL_MCP_WORKSPACE_FOLDERS,
        'CODEQL_MCP_WORKSPACE_FOLDERS should be set',
      );
      const workspaceFoldersEnv = env.CODEQL_MCP_WORKSPACE_FOLDERS.split(path.delimiter);
      assert.ok(
        workspaceFoldersEnv.includes(tempDir),
        `CODEQL_MCP_WORKSPACE_FOLDERS should include ${tempDir}: ${env.CODEQL_MCP_WORKSPACE_FOLDERS}`,
      );
    } finally {
      await removeWorkspaceFolder(tempDir);
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* best-effort */ }
    }
  });

  // ---------------------------------------------------------------
  // Test 2: Environment excludes a removed folder
  // ---------------------------------------------------------------
  test('CODEQL_MCP_WORKSPACE_FOLDERS should exclude removed folder', async () => {
    const envBuilder = api.environmentBuilder;
    const tempDir = createTempDir('ql-mcp-env-rm-');

    await addWorkspaceFolder(vscode.Uri.file(tempDir));

    // Verify it's there
    let env = await envBuilder.build();
    assert.ok(
      env.CODEQL_MCP_WORKSPACE_FOLDERS.split(path.delimiter).includes(tempDir),
      'Folder should be present after adding',
    );

    // Now remove it
    await removeWorkspaceFolder(tempDir);

    try {
      env = await envBuilder.build();
      assert.ok(
        !env.CODEQL_MCP_WORKSPACE_FOLDERS.split(path.delimiter).includes(tempDir),
        `Folder should be absent after removal: ${env.CODEQL_MCP_WORKSPACE_FOLDERS}`,
      );
    } finally {
      await removeWorkspaceFolder(tempDir);
      try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* best-effort */ }
    }
  });

  // ---------------------------------------------------------------
  // Test 3: Original fixture folders survive after add + remove
  // ---------------------------------------------------------------
  test('Fixture workspace folders should remain after add and remove cycle', async () => {
    const foldersBefore = (vscode.workspace.workspaceFolders ?? []).map(
      (f) => f.uri.fsPath,
    );

    const tempDir = createTempDir('ql-mcp-preserve-');
    await addWorkspaceFolder(vscode.Uri.file(tempDir));
    await removeWorkspaceFolder(tempDir);

    const foldersAfter = (vscode.workspace.workspaceFolders ?? []).map(
      (f) => f.uri.fsPath,
    );

    assert.deepStrictEqual(
      foldersAfter,
      foldersBefore,
      'Original workspace folders must be preserved after an add+remove cycle',
    );

    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch { /* best-effort */ }
  });
});
