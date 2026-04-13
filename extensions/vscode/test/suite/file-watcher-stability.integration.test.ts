/**
 * Integration tests for file watcher stability.
 *
 * Verifies that workspace file changes (database discovery, query result
 * creation) do NOT trigger redundant MCP server definition change events.
 *
 * The MCP server definition should only change when:
 *  - The extension itself changes (update / reinstall)
 *  - Workspace folder registration changes (folders added / removed)
 *  - Configuration changes that affect the server
 *
 * File content changes are NOT a reason to re-provide the definition:
 * the running server discovers files on its own through filesystem
 * scanning at tool invocation time.
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

const EXTENSION_ID = 'advanced-security.vscode-codeql-development-mcp-server';

/** Milliseconds to wait past the 1 s debounce to confirm no event fires. */
const SETTLE_MS = 2_500;

suite('File Watcher Stability Tests', () => {
  let api: any;
  const cleanupPaths: string[] = [];

  suiteSetup(async function () {
    this.timeout(10_000);
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, `Extension ${EXTENSION_ID} not found`);
    api = ext.isActive ? ext.exports : await ext.activate();

    if (!vscode.workspace.workspaceFolders?.length) {
      console.log(
        '[file-watcher-stability] Skipping — requires workspace with at least one folder',
      );
      this.skip();
    }

    // Let any startup-related events settle before running tests.
    await new Promise((r) => globalThis.setTimeout(r, SETTLE_MS));
  });

  suiteTeardown(() => {
    for (const p of cleanupPaths) {
      try {
        fs.rmSync(p, { recursive: true, force: true });
      } catch {
        /* best-effort */
      }
    }
  });

  // -----------------------------------------------------------------
  // Test 1: BQRS file creation must NOT fire definition change event
  // -----------------------------------------------------------------
  test('Creating a BQRS file should NOT trigger onDidChangeMcpServerDefinitions', async function () {
    this.timeout(10_000);

    const mcpProvider = api.mcpProvider;
    assert.ok(mcpProvider, 'API missing mcpProvider');
    assert.ok(
      typeof mcpProvider.onDidChangeMcpServerDefinitions === 'function',
      'mcpProvider missing onDidChangeMcpServerDefinitions',
    );

    let changeCount = 0;
    const disposable = mcpProvider.onDidChangeMcpServerDefinitions(() => {
      changeCount++;
    });

    try {
      const workspaceRoot =
        vscode.workspace.workspaceFolders![0].uri.fsPath;
      const bqrsPath = path.join(
        workspaceRoot,
        `stability-test-${Date.now()}.bqrs`,
      );
      cleanupPaths.push(bqrsPath);

      fs.writeFileSync(bqrsPath, Buffer.from([0x00]));

      // Wait past the debounce period (1 s) plus buffer
      await new Promise((r) => globalThis.setTimeout(r, SETTLE_MS));

      assert.strictEqual(
        changeCount,
        0,
        `onDidChangeMcpServerDefinitions fired ${changeCount} time(s) after BQRS file creation; ` +
          'file content changes should NOT trigger MCP server definition updates',
      );
    } finally {
      disposable.dispose();
    }
  });

  // -----------------------------------------------------------------
  // Test 2: codeql-database.yml creation must NOT fire change event
  // -----------------------------------------------------------------
  test('Creating a codeql-database.yml should NOT trigger onDidChangeMcpServerDefinitions', async function () {
    this.timeout(10_000);

    const mcpProvider = api.mcpProvider;
    assert.ok(mcpProvider, 'API missing mcpProvider');

    let changeCount = 0;
    const disposable = mcpProvider.onDidChangeMcpServerDefinitions(() => {
      changeCount++;
    });

    try {
      const workspaceRoot =
        vscode.workspace.workspaceFolders![0].uri.fsPath;
      const dbDir = path.join(
        workspaceRoot,
        `stability-test-db-${Date.now()}`,
      );
      fs.mkdirSync(dbDir, { recursive: true });
      cleanupPaths.push(dbDir);

      const ymlPath = path.join(dbDir, 'codeql-database.yml');
      fs.writeFileSync(ymlPath, 'primaryLanguage: javascript\n');

      await new Promise((r) => globalThis.setTimeout(r, SETTLE_MS));

      assert.strictEqual(
        changeCount,
        0,
        `onDidChangeMcpServerDefinitions fired ${changeCount} time(s) after codeql-database.yml creation; ` +
          'file content changes should NOT trigger MCP server definition updates',
      );
    } finally {
      disposable.dispose();
    }
  });
});
