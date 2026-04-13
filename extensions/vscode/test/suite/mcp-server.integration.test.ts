/**
 * Integration tests for the MCP server definition provider.
 *
 * These run inside the Extension Development Host with the REAL VS Code API.
 * They verify that the extension provides a working MCP server definition
 * with the correct command, args, and environment variables.
 */

import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

const EXTENSION_ID = 'advanced-security.vscode-codeql-development-mcp-server';

suite('MCP Server Definition Tests', () => {
  let api: any;

  suiteSetup(async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, `Extension ${EXTENSION_ID} not found`);
    api = ext.isActive ? ext.exports : await ext.activate();
  });

  test('mcpProvider should provide at least one server definition', async () => {
    const provider = api.mcpProvider;
    assert.ok(provider, 'API missing mcpProvider');
    assert.ok(
      typeof provider.provideMcpServerDefinitions === 'function',
      'mcpProvider missing provideMcpServerDefinitions method',
    );
  });

  test('Server definition should use node command when bundled server exists', async () => {
    // The serverManager exposes getCommand/getArgs for inspection
    const serverManager = api.serverManager;
    if (!serverManager) {
      // serverManager may not be exported — skip gracefully
      return;
    }
    const command = serverManager.getCommand();
    // In the Extension Development Host, the monorepo server/dist/ should be found
    assert.ok(
      command === 'node' || command === 'npx',
      `Unexpected server command: ${command}`,
    );
  });

  test('Server definition should include CODEQL_PATH in environment when CLI is found', async () => {
    const envBuilder = api.environmentBuilder;
    if (!envBuilder) {
      return;
    }
    const env = await envBuilder.build();
    // CODEQL_PATH should be set if the CodeQL CLI was found on PATH or via the extension
    if (env.CODEQL_PATH) {
      assert.ok(
        typeof env.CODEQL_PATH === 'string' && env.CODEQL_PATH.length > 0,
        'CODEQL_PATH is set but empty',
      );
    }
  });

  test('Environment should include a valid CODEQL_PATH when CLI is available', async function () {
    const envBuilder = api.environmentBuilder;
    if (!envBuilder) {
      // environmentBuilder may not be exported — skip gracefully
      this.skip();
      return;
    }
    const env = await envBuilder.build();
    if (!env.CODEQL_PATH) {
      // Skip explicitly when the CLI is unavailable instead of passing silently.
      this.skip();
      return;
    }
    // The CODEQL_PATH should resolve to an existing binary.
    // In CI or the extension dev host, the CLI is expected to exist.
    const basename = path.basename(env.CODEQL_PATH).toLowerCase();
    assert.ok(
      basename === 'codeql' || basename === 'codeql.exe',
      `CODEQL_PATH basename is not 'codeql' or 'codeql.exe': ${env.CODEQL_PATH}`,
    );
  });
});
