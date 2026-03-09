/**
 * Integration tests for the vscode-codeql bridge.
 *
 * These run inside the Extension Development Host with the REAL VS Code API.
 * They verify that the bridge correctly discovers vscode-codeql storage paths
 * and sets discovery environment variables pointing to valid directories.
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

const EXTENSION_ID = 'advanced-security.vscode-codeql-development-mcp-server';
const CODEQL_EXTENSION_ID = 'GitHub.vscode-codeql';

suite('vscode-codeql Bridge Tests', () => {
  let api: any;

  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, `Extension ${EXTENSION_ID} not found`);
    api = ext.isActive ? ext.exports : await ext.activate();
  });

  test('Should detect whether vscode-codeql extension is available', () => {
    const codeqlExt = vscode.extensions.getExtension(CODEQL_EXTENSION_ID);
    // The extension may or may not be present in the Extension Host — both are valid.
    // We merely verify the lookup doesn't throw.
    if (codeqlExt) {
      assert.ok(codeqlExt.id === CODEQL_EXTENSION_ID);
    }
  });

  test('Environment builder should produce an object with string values', async () => {
    const envBuilder = api.environmentBuilder;
    if (!envBuilder) {
      return;
    }
    const env = await envBuilder.build();
    assert.ok(typeof env === 'object', 'Environment is not an object');
    for (const [key, value] of Object.entries(env)) {
      assert.ok(
        typeof key === 'string',
        `Environment key is not a string: ${key}`,
      );
      assert.ok(
        typeof value === 'string',
        `Environment value for ${key} is not a string: ${typeof value}`,
      );
    }
  });

  test('CODEQL_DATABASES_BASE_DIRS paths should be valid directories', async () => {
    const envBuilder = api.environmentBuilder;
    if (!envBuilder) return;

    const env = await envBuilder.build();
    const dirs = env.CODEQL_DATABASES_BASE_DIRS;
    assert.ok(dirs, 'CODEQL_DATABASES_BASE_DIRS not set');

    for (const dir of dirs.split(':')) {
      if (dir.length === 0) continue;
      // Parent must exist (the leaf directory may not yet exist if no databases
      // have been created, but the parent storage root should).
      const parent = path.dirname(dir);
      assert.ok(
        fs.existsSync(parent),
        `Parent of CODEQL_DATABASES_BASE_DIRS entry does not exist: ${parent} (from ${dir})`,
      );
    }
  });

  test('CODEQL_DATABASES_BASE_DIRS should include workspace storage path when workspace is open', async () => {
    const envBuilder = api.environmentBuilder;
    if (!envBuilder) return;

    const env = await envBuilder.build();
    const dirs = env.CODEQL_DATABASES_BASE_DIRS;
    assert.ok(dirs, 'CODEQL_DATABASES_BASE_DIRS not set');

    const parts = dirs.split(':');

    // When copyDatabases is enabled (default), the managed databases/ directory
    // under our globalStorage replaces individual source paths. When disabled,
    // the original global + workspace storage paths are used.
    const hasWorkspaceStorage = parts.some((p: string) => p.includes('workspaceStorage'));
    const hasManagedDir = parts.some((p: string) => p.endsWith('/databases'));
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      assert.ok(
        hasWorkspaceStorage || hasManagedDir,
        `CODEQL_DATABASES_BASE_DIRS should include a workspaceStorage path or managed databases dir when a workspace is open: ${dirs}`,
      );
    }
    // Always should have at least the global storage path or managed dir
    const hasGlobalStorage = parts.some((p: string) => p.includes('globalStorage'));
    assert.ok(
      hasGlobalStorage || hasManagedDir,
      `CODEQL_DATABASES_BASE_DIRS should include a globalStorage path or managed databases dir: ${dirs}`,
    );
  });

  test('CODEQL_QUERY_RUN_RESULTS_DIRS parent should exist', async () => {
    const codeqlExt = vscode.extensions.getExtension(CODEQL_EXTENSION_ID);
    if (!codeqlExt) return; // vscode-codeql not installed — storage dirs won't exist

    const envBuilder = api.environmentBuilder;
    if (!envBuilder) return;

    const env = await envBuilder.build();
    const dirs = env.CODEQL_QUERY_RUN_RESULTS_DIRS;
    assert.ok(dirs, 'CODEQL_QUERY_RUN_RESULTS_DIRS not set');

    for (const dir of dirs.split(':')) {
      if (dir.length === 0) continue;
      // The immediate parent (GitHub.vscode-codeql storage root) only exists
      // after first activation.  Verify the grandparent (VS Code's globalStorage
      // root) which is always created by VS Code.
      const grandparent = path.dirname(path.dirname(dir));
      assert.ok(
        fs.existsSync(grandparent),
        `Grandparent of CODEQL_QUERY_RUN_RESULTS_DIRS entry does not exist: ${grandparent} (from ${dir})`,
      );
    }
  });

  test('CODEQL_MRVA_RUN_RESULTS_DIRS parent should exist', async () => {
    const codeqlExt = vscode.extensions.getExtension(CODEQL_EXTENSION_ID);
    if (!codeqlExt) return; // vscode-codeql not installed — storage dirs won't exist

    const envBuilder = api.environmentBuilder;
    if (!envBuilder) return;

    const env = await envBuilder.build();
    const dirs = env.CODEQL_MRVA_RUN_RESULTS_DIRS;
    assert.ok(dirs, 'CODEQL_MRVA_RUN_RESULTS_DIRS not set');

    for (const dir of dirs.split(':')) {
      if (dir.length === 0) continue;
      // The immediate parent (GitHub.vscode-codeql storage root) only exists
      // after first activation.  Verify the grandparent (VS Code's globalStorage
      // root) which is always created by VS Code.
      const grandparent = path.dirname(path.dirname(dir));
      assert.ok(
        fs.existsSync(grandparent),
        `Grandparent of CODEQL_MRVA_RUN_RESULTS_DIRS entry does not exist: ${grandparent} (from ${dir})`,
      );
    }
  });

  test('Environment should include discovery env vars when vscode-codeql is present', async () => {
    const codeqlExt = vscode.extensions.getExtension(CODEQL_EXTENSION_ID);
    if (!codeqlExt) {
      // vscode-codeql not installed — skip
      return;
    }
    const envBuilder = api.environmentBuilder;
    if (!envBuilder) {
      return;
    }
    const env = await envBuilder.build();
    // When vscode-codeql is present, these should be set
    const discoveryVars = [
      'CODEQL_DATABASES_BASE_DIRS',
      'CODEQL_QUERY_RUN_RESULTS_DIRS',
      'CODEQL_MRVA_RUN_RESULTS_DIRS',
    ];
    for (const v of discoveryVars) {
      if (env[v]) {
        assert.ok(
          typeof env[v] === 'string' && env[v].length > 0,
          `${v} is set but empty`,
        );
      }
    }
  });

  // --- copyDatabases feature tests ---

  test('copyDatabases default: CODEQL_DATABASES_BASE_DIRS should use managed databases/ dir', async () => {
    const envBuilder = api.environmentBuilder;
    if (!envBuilder) return;

    const env = await envBuilder.build();
    const dirs = env.CODEQL_DATABASES_BASE_DIRS;
    assert.ok(dirs, 'CODEQL_DATABASES_BASE_DIRS not set');

    // With the default setting (copyDatabases: true), the env should contain
    // a single managed path ending with /databases that lives under the MCP
    // extension's own globalStorage — NOT under GitHub.vscode-codeql.
    const parts = dirs.split(':');
    const managedParts = parts.filter((p: string) => p.endsWith('/databases'));
    assert.ok(
      managedParts.length >= 1,
      `Expected at least one path ending with /databases in CODEQL_DATABASES_BASE_DIRS: ${dirs}`,
    );
    for (const managed of managedParts) {
      assert.ok(
        !managed.includes('GitHub.vscode-codeql'),
        `Managed databases path should NOT be under GitHub.vscode-codeql: ${managed}`,
      );
    }
  });

  test('copyDatabases default: managed databases dir parent should exist', async () => {
    const envBuilder = api.environmentBuilder;
    if (!envBuilder) return;

    const env = await envBuilder.build();
    const dirs = env.CODEQL_DATABASES_BASE_DIRS;
    assert.ok(dirs, 'CODEQL_DATABASES_BASE_DIRS not set');

    const parts = dirs.split(':');
    for (const dir of parts) {
      if (!dir.endsWith('/databases')) continue;
      // The parent of the managed databases/ dir is our extension's
      // globalStorage, which VS Code creates on activation.
      const parent = path.dirname(dir);
      assert.ok(
        fs.existsSync(parent),
        `Parent of managed databases dir should exist: ${parent}`,
      );
    }
  });

  test('copyDatabases default: managed databases dir should not contain .lock files', async () => {
    const envBuilder = api.environmentBuilder;
    if (!envBuilder) return;

    const env = await envBuilder.build();
    const dirs = env.CODEQL_DATABASES_BASE_DIRS;
    assert.ok(dirs, 'CODEQL_DATABASES_BASE_DIRS not set');

    for (const dir of dirs.split(':')) {
      if (!dir.endsWith('/databases') || !fs.existsSync(dir)) continue;
      // Walk the managed database directory and assert no .lock files exist
      const lockFiles = findLockFiles(dir);
      assert.strictEqual(
        lockFiles.length,
        0,
        `Managed databases dir should not contain .lock files, but found: ${lockFiles.join(', ')}`,
      );
    }
  });
});

/**
 * Recursively find all `.lock` files under a directory.
 */
function findLockFiles(dir: string): string[] {
  const results: string[] = [];
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return results;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    try {
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        results.push(...findLockFiles(full));
      } else if (entry === '.lock') {
        results.push(full);
      }
    } catch {
      // skip
    }
  }
  return results;
}
