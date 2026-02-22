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

    // When a workspace is open, there should be at least 2 paths
    // (global + workspace). When no workspace is open (e.g. Extension
    // Development Host without --folder-uri), only the global path is present.
    const hasWorkspaceStorage = parts.some((p: string) => p.includes('workspaceStorage'));
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
      assert.ok(
        hasWorkspaceStorage,
        `CODEQL_DATABASES_BASE_DIRS should include a workspaceStorage path when a workspace is open: ${dirs}`,
      );
    }
    // Always should have at least the global storage path
    const hasGlobalStorage = parts.some((p: string) => p.includes('globalStorage'));
    assert.ok(
      hasGlobalStorage,
      `CODEQL_DATABASES_BASE_DIRS should include a globalStorage path: ${dirs}`,
    );
  });

  test('CODEQL_QUERY_RUN_RESULTS_DIRS parent should exist', async () => {
    const envBuilder = api.environmentBuilder;
    if (!envBuilder) return;

    const env = await envBuilder.build();
    const dirs = env.CODEQL_QUERY_RUN_RESULTS_DIRS;
    assert.ok(dirs, 'CODEQL_QUERY_RUN_RESULTS_DIRS not set');

    for (const dir of dirs.split(':')) {
      if (dir.length === 0) continue;
      const parent = path.dirname(dir);
      assert.ok(
        fs.existsSync(parent),
        `Parent of CODEQL_QUERY_RUN_RESULTS_DIRS entry does not exist: ${parent}`,
      );
    }
  });

  test('CODEQL_MRVA_RUN_RESULTS_DIRS parent should exist', async () => {
    const envBuilder = api.environmentBuilder;
    if (!envBuilder) return;

    const env = await envBuilder.build();
    const dirs = env.CODEQL_MRVA_RUN_RESULTS_DIRS;
    assert.ok(dirs, 'CODEQL_MRVA_RUN_RESULTS_DIRS not set');

    for (const dir of dirs.split(':')) {
      if (dir.length === 0) continue;
      const parent = path.dirname(dir);
      assert.ok(
        fs.existsSync(parent),
        `Parent of CODEQL_MRVA_RUN_RESULTS_DIRS entry does not exist: ${parent}`,
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
});
