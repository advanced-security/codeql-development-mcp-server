/**
 * Integration tests for CodeQL-workspace-aware multi-root resolution.
 *
 * These run inside the Extension Development Host with the REAL VS Code API
 * under the `multiRoot` profile (4 workspace folders, each containing a
 * top-level `codeql-workspace.yml`).
 *
 * They verify the default resolution behavior:
 *  - A folder that contains a top-level `codeql-workspace.yml` is automatically
 *    used as a CodeQL query/pack resolution root.
 *  - A folder WITHOUT a `codeql-workspace.yml` is excluded by default.
 *  - `codeql-mcp.requireCodeqlWorkspace = false` uses every folder.
 *  - `codeql-mcp.queryPackIncludeDirs` always opts a directory in, even without
 *    a `codeql-workspace.yml`.
 *  - `codeql-mcp.queryPackExcludeDirs` drops a qualifying folder.
 *
 * The extension exposes its `EnvironmentBuilder` via the activated API, and the
 * resolution roots are surfaced as `CODEQL_MCP_WORKSPACE_FOLDERS` (and folded
 * into `CODEQL_ADDITIONAL_PACKS`).
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

const EXTENSION_ID = 'advanced-security.vscode-codeql-development-mcp-server';

/** Create a temp dir and resolve its real path (macOS /tmp is symlinked). */
function createTempDir(prefix: string): string {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
}

/** Create a temp dir that qualifies as a CodeQL workspace. */
function createCodeqlWorkspaceTempDir(prefix: string): string {
  const dir = createTempDir(prefix);
  fs.writeFileSync(
    path.join(dir, 'codeql-workspace.yml'),
    'provide:\n  - "**/qlpack.yml"\n',
  );
  return dir;
}

function rmRf(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* best-effort */
  }
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

/** Append a folder to the workspace and wait for the change event to settle. */
async function addWorkspaceFolder(uri: vscode.Uri): Promise<void> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  const changePromise = waitForWorkspaceFolderChange();
  const ok = vscode.workspace.updateWorkspaceFolders(folders.length, 0, { uri });
  assert.ok(ok, 'updateWorkspaceFolders (add) returned false');
  await changePromise;
}

/** Remove a folder by fsPath and wait for the change event. No-op if absent. */
async function removeWorkspaceFolder(fsPath: string): Promise<void> {
  const folders = vscode.workspace.workspaceFolders ?? [];
  const idx = folders.findIndex((f) => f.uri.fsPath === fsPath);
  if (idx < 0) return;
  const changePromise = waitForWorkspaceFolderChange();
  const ok = vscode.workspace.updateWorkspaceFolders(idx, 1);
  assert.ok(ok, 'updateWorkspaceFolders (remove) returned false');
  await changePromise;
}

/** Read the current resolution roots from a freshly-built environment. */
async function buildRoots(envBuilder: any): Promise<string[]> {
  envBuilder.invalidate();
  const env = await envBuilder.build();
  return (env.CODEQL_MCP_WORKSPACE_FOLDERS ?? '')
    .split(path.delimiter)
    .filter(Boolean);
}

suite('CodeQL-workspace resolution (multi-root)', () => {
  let api: any;

  suiteSetup(async function () {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, `Extension ${EXTENSION_ID} not found`);
    api = ext.isActive ? ext.exports : await ext.activate();
    assert.ok(api.environmentBuilder, 'API missing environmentBuilder');

    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length < 2) {
      // Folder add/remove semantics are only reliable in a multi-root workspace.
      console.log(
        '[codeql-workspace-resolution] Skipping — requires multiRoot workspace (>= 2 folders)',
      );
      this.skip();
    }
  });

  // ---------------------------------------------------------------
  // Fixture folders all contain a codeql-workspace.yml → all qualify
  // ---------------------------------------------------------------
  test('fixture folders with codeql-workspace.yml are all resolution roots by default', async () => {
    const roots = await buildRoots(api.environmentBuilder);
    for (const folder of vscode.workspace.workspaceFolders ?? []) {
      assert.ok(
        roots.includes(folder.uri.fsPath),
        `Fixture folder ${folder.name} (has codeql-workspace.yml) should be a resolution root: ${roots.join(path.delimiter)}`,
      );
    }
  });

  // ---------------------------------------------------------------
  // A: added folder WITH codeql-workspace.yml → auto-included
  // ---------------------------------------------------------------
  test('auto-includes a dynamically added folder that has codeql-workspace.yml', async () => {
    const tempDir = createCodeqlWorkspaceTempDir('ql-mcp-cqlws-with-');
    await addWorkspaceFolder(vscode.Uri.file(tempDir));
    try {
      const env = (api.environmentBuilder.invalidate(), await api.environmentBuilder.build());
      const roots = (env.CODEQL_MCP_WORKSPACE_FOLDERS ?? '').split(path.delimiter).filter(Boolean);
      assert.ok(
        roots.includes(tempDir),
        `Added folder WITH codeql-workspace.yml should be a resolution root: ${env.CODEQL_MCP_WORKSPACE_FOLDERS}`,
      );
      assert.ok(
        (env.CODEQL_ADDITIONAL_PACKS ?? '').split(path.delimiter).includes(tempDir),
        `Added folder WITH codeql-workspace.yml should be in CODEQL_ADDITIONAL_PACKS: ${env.CODEQL_ADDITIONAL_PACKS}`,
      );
    } finally {
      await removeWorkspaceFolder(tempDir);
      rmRf(tempDir);
    }
  });

  // ---------------------------------------------------------------
  // B: added folder WITHOUT codeql-workspace.yml → excluded by default
  // ---------------------------------------------------------------
  test('excludes a dynamically added folder without codeql-workspace.yml by default', async () => {
    const tempDir = createTempDir('ql-mcp-cqlws-without-');
    await addWorkspaceFolder(vscode.Uri.file(tempDir));
    try {
      const roots = await buildRoots(api.environmentBuilder);
      assert.ok(
        !roots.includes(tempDir),
        `Added folder WITHOUT codeql-workspace.yml should NOT be a resolution root by default: ${roots.join(path.delimiter)}`,
      );
    } finally {
      await removeWorkspaceFolder(tempDir);
      rmRf(tempDir);
    }
  });

  // ---------------------------------------------------------------
  // C: requireCodeqlWorkspace=false re-includes the non-qualifying folder
  // ---------------------------------------------------------------
  test('requireCodeqlWorkspace=false includes a folder without codeql-workspace.yml', async () => {
    const tempDir = createTempDir('ql-mcp-cqlws-optout-');
    const config = vscode.workspace.getConfiguration('codeql-mcp');
    await addWorkspaceFolder(vscode.Uri.file(tempDir));
    try {
      // Default: excluded.
      let roots = await buildRoots(api.environmentBuilder);
      assert.ok(!roots.includes(tempDir), 'Precondition: excluded by default');

      // Opt out of the requirement so every folder is used.
      await config.update('requireCodeqlWorkspace', false, vscode.ConfigurationTarget.Workspace);
      roots = await buildRoots(api.environmentBuilder);
      assert.ok(
        roots.includes(tempDir),
        `With requireCodeqlWorkspace=false the folder should be a resolution root: ${roots.join(path.delimiter)}`,
      );
    } finally {
      await config.update('requireCodeqlWorkspace', undefined, vscode.ConfigurationTarget.Workspace);
      await removeWorkspaceFolder(tempDir);
      rmRf(tempDir);
    }
  });

  // ---------------------------------------------------------------
  // D: queryPackIncludeDirs always opts a directory in (no file, not a folder)
  // ---------------------------------------------------------------
  test('queryPackIncludeDirs always includes a directory even without codeql-workspace.yml', async () => {
    const tempDir = createTempDir('ql-mcp-cqlws-include-');
    const config = vscode.workspace.getConfiguration('codeql-mcp');
    try {
      await config.update('queryPackIncludeDirs', [tempDir], vscode.ConfigurationTarget.Workspace);
      const env = (api.environmentBuilder.invalidate(), await api.environmentBuilder.build());
      const roots = (env.CODEQL_MCP_WORKSPACE_FOLDERS ?? '').split(path.delimiter).filter(Boolean);
      assert.ok(
        roots.includes(tempDir),
        `queryPackIncludeDirs entry should always be a resolution root: ${env.CODEQL_MCP_WORKSPACE_FOLDERS}`,
      );
      assert.ok(
        (env.CODEQL_ADDITIONAL_PACKS ?? '').split(path.delimiter).includes(tempDir),
        `queryPackIncludeDirs entry should be in CODEQL_ADDITIONAL_PACKS: ${env.CODEQL_ADDITIONAL_PACKS}`,
      );
    } finally {
      await config.update('queryPackIncludeDirs', undefined, vscode.ConfigurationTarget.Workspace);
      rmRf(tempDir);
    }
  });

  // ---------------------------------------------------------------
  // E: queryPackExcludeDirs drops a qualifying folder
  // ---------------------------------------------------------------
  test('queryPackExcludeDirs drops a qualifying folder from resolution roots', async () => {
    const tempDir = createCodeqlWorkspaceTempDir('ql-mcp-cqlws-exclude-');
    const config = vscode.workspace.getConfiguration('codeql-mcp');
    await addWorkspaceFolder(vscode.Uri.file(tempDir));
    try {
      // Precondition: qualifying folder is a root.
      let roots = await buildRoots(api.environmentBuilder);
      assert.ok(roots.includes(tempDir), 'Precondition: qualifying folder is a root');

      await config.update('queryPackExcludeDirs', [tempDir], vscode.ConfigurationTarget.Workspace);
      const env = (api.environmentBuilder.invalidate(), await api.environmentBuilder.build());
      roots = (env.CODEQL_MCP_WORKSPACE_FOLDERS ?? '').split(path.delimiter).filter(Boolean);
      assert.ok(
        !roots.includes(tempDir),
        `Excluded folder should be dropped from resolution roots: ${env.CODEQL_MCP_WORKSPACE_FOLDERS}`,
      );
      assert.ok(
        !(env.CODEQL_ADDITIONAL_PACKS ?? '').split(path.delimiter).includes(tempDir),
        `Excluded folder should be absent from CODEQL_ADDITIONAL_PACKS: ${env.CODEQL_ADDITIONAL_PACKS}`,
      );
    } finally {
      await config.update('queryPackExcludeDirs', undefined, vscode.ConfigurationTarget.Workspace);
      await removeWorkspaceFolder(tempDir);
      rmRf(tempDir);
    }
  });
});
