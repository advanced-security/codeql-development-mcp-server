/**
 * Integration tests for workspace folder change handling.
 *
 * These run inside the Extension Development Host with the REAL VS Code API.
 * They verify that the MCP server definition version changes when workspace
 * folders are added or removed, which signals VS Code to restart the server
 * with the updated environment rather than simply stopping it.
 *
 * Bug: Prior to the fix, fireDidChange() notified VS Code that the MCP server
 * definitions changed, causing it to stop the running server. However, because
 * the returned McpStdioServerDefinition had the same version as before, VS Code
 * did not restart the server — it only stopped it.
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

const EXTENSION_ID = 'advanced-security.vscode-codeql-development-mcp-server';

suite('Workspace Folder Change Tests', () => {
  let api: any;

  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, `Extension ${EXTENSION_ID} not found`);
    api = ext.isActive ? ext.exports : await ext.activate();
  });

  test('MCP definition version should change after workspace folder is added', async function () {
    const provider = api.mcpProvider;
    if (!provider) {
      this.skip();
      return;
    }

    const token: vscode.CancellationToken = {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    };

    // Get initial definitions
    const beforeDefs = await provider.provideMcpServerDefinitions(token);
    assert.ok(beforeDefs && beforeDefs.length >= 1, 'Should provide at least one definition');
    const versionBefore = beforeDefs[0].version;

    // Create a real temporary directory to add as a workspace folder
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ql-mcp-test-'));

    // Listen for the onDidChangeMcpServerDefinitions event.
    // Mocha's test timeout (60 s) handles the failure case.
    const changePromise = new Promise<void>((resolve) => {
      const disposable = provider.onDidChangeMcpServerDefinitions(() => {
        disposable.dispose();
        resolve();
      });
    });

    // Add the temporary folder to the workspace
    const folders = vscode.workspace.workspaceFolders ?? [];
    const added = vscode.workspace.updateWorkspaceFolders(
      folders.length,
      0,
      { uri: vscode.Uri.file(tempDir) },
    );

    if (!added) {
      // Clean up and skip if updateWorkspaceFolders is not supported in this profile
      fs.rmdirSync(tempDir);
      this.skip();
      return;
    }

    try {
      // Wait for the MCP definition change event
      await changePromise;

      // Get definitions after the workspace folder change
      const afterDefs = await provider.provideMcpServerDefinitions(token);
      assert.ok(afterDefs && afterDefs.length >= 1, 'Should still provide definitions after folder change');
      const versionAfter = afterDefs[0].version;

      // The version MUST be different so VS Code knows to restart the server
      assert.notStrictEqual(
        versionAfter,
        versionBefore,
        'MCP server definition version must change after workspace folder update ' +
        'to signal VS Code to restart the server instead of only stopping it',
      );
    } finally {
      // Cleanup: remove the added folder and temp directory
      const updatedFolders = vscode.workspace.workspaceFolders ?? [];
      const idx = updatedFolders.findIndex((f) => f.uri.fsPath === tempDir);
      if (idx >= 0) {
        vscode.workspace.updateWorkspaceFolders(idx, 1);
      }
      try {
        fs.rmdirSync(tempDir);
      } catch {
        // Best-effort cleanup
      }
    }
  });

  test('MCP definition version should change after workspace folder is removed', async function () {
    const provider = api.mcpProvider;
    const folders = vscode.workspace.workspaceFolders;
    if (!provider || !folders || folders.length < 2) {
      // Need at least 2 folders to remove one without closing the workspace
      this.skip();
      return;
    }

    const token: vscode.CancellationToken = {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    };

    // Get initial definitions
    const beforeDefs = await provider.provideMcpServerDefinitions(token);
    assert.ok(beforeDefs && beforeDefs.length >= 1, 'Should provide at least one definition');
    const versionBefore = beforeDefs[0].version;

    // Remember the last folder so we can re-add it after removal
    const lastFolder = folders[folders.length - 1];
    const removedUri = lastFolder.uri;

    // Listen for the onDidChangeMcpServerDefinitions event.
    // Mocha's test timeout (60 s) handles the failure case.
    const changePromise = new Promise<void>((resolve) => {
      const disposable = provider.onDidChangeMcpServerDefinitions(() => {
        disposable.dispose();
        resolve();
      });
    });

    // Remove the last workspace folder
    const removed = vscode.workspace.updateWorkspaceFolders(folders.length - 1, 1);
    if (!removed) {
      this.skip();
      return;
    }

    try {
      // Wait for the MCP definition change event
      await changePromise;

      // Get definitions after the workspace folder change
      const afterDefs = await provider.provideMcpServerDefinitions(token);
      assert.ok(afterDefs && afterDefs.length >= 1, 'Should still provide definitions after folder removal');
      const versionAfter = afterDefs[0].version;

      // The version MUST be different so VS Code knows to restart the server
      assert.notStrictEqual(
        versionAfter,
        versionBefore,
        'MCP server definition version must change after workspace folder removal ' +
        'to signal VS Code to restart the server instead of only stopping it',
      );
    } finally {
      // Cleanup: re-add the removed folder
      const currentFolders = vscode.workspace.workspaceFolders ?? [];
      vscode.workspace.updateWorkspaceFolders(
        currentFolders.length,
        0,
        { uri: removedUri },
      );
    }
  });

  test('Environment should reflect updated workspace folders after change', async function () {
    const envBuilder = api.environmentBuilder;
    const folders = vscode.workspace.workspaceFolders;
    if (!envBuilder || !folders || folders.length === 0) {
      this.skip();
      return;
    }

    // Create a real temporary directory
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ql-mcp-env-test-'));

    // Listen for workspace folder changes through the VS Code API
    const changePromise = new Promise<void>((resolve) => {
      const disposable = vscode.workspace.onDidChangeWorkspaceFolders(() => {
        disposable.dispose();
        resolve();
      });
    });

    // Add the temporary folder
    const added = vscode.workspace.updateWorkspaceFolders(
      folders.length,
      0,
      { uri: vscode.Uri.file(tempDir) },
    );

    if (!added) {
      fs.rmdirSync(tempDir);
      this.skip();
      return;
    }

    try {
      await changePromise;

      // invalidate() was called by the event handler, so build() returns fresh env
      const env = await envBuilder.build();
      assert.ok(env.CODEQL_MCP_WORKSPACE_FOLDERS, 'CODEQL_MCP_WORKSPACE_FOLDERS should be set');
      assert.ok(
        env.CODEQL_MCP_WORKSPACE_FOLDERS.includes(tempDir),
        `CODEQL_MCP_WORKSPACE_FOLDERS should include the newly added folder: ${env.CODEQL_MCP_WORKSPACE_FOLDERS}`,
      );
    } finally {
      // Cleanup
      const updatedFolders = vscode.workspace.workspaceFolders ?? [];
      const idx = updatedFolders.findIndex((f) => f.uri.fsPath === tempDir);
      if (idx >= 0) {
        vscode.workspace.updateWorkspaceFolders(idx, 1);
      }
      try {
        fs.rmdirSync(tempDir);
      } catch {
        // Best-effort cleanup
      }
    }
  });
});
