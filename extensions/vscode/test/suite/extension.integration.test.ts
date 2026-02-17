/**
 * Integration tests for the CodeQL MCP Server extension.
 *
 * These run inside the Extension Development Host with the REAL VS Code API.
 * They verify the extension activates correctly and registers the expected
 * contributions (commands, MCP server provider, etc.).
 */

import * as assert from 'assert';
import * as vscode from 'vscode';

const EXTENSION_ID = 'advanced-security.codeql-development-mcp-server-vscode';

suite('Extension Integration Tests', () => {
  test('Extension should be present', () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, `Extension ${EXTENSION_ID} not found`);
  });

  test('Extension should activate', async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, `Extension ${EXTENSION_ID} not found`);

    if (!ext.isActive) {
      await ext.activate();
    }
    assert.ok(ext.isActive, 'Extension did not activate');
  });

  test('Extension should return API with mcpProvider', async () => {
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext);

    const api = ext.isActive ? ext.exports : await ext.activate();
    assert.ok(api, 'Extension did not return an API');
    assert.ok(api.mcpProvider, 'API missing mcpProvider');
  });

  test('Commands should be registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    const expected = [
      'codeql-mcp.reinstallServer',
      'codeql-mcp.reinstallPacks',
      'codeql-mcp.showStatus',
      'codeql-mcp.showLogs',
    ];
    for (const cmd of expected) {
      assert.ok(
        commands.includes(cmd),
        `Command ${cmd} not registered`,
      );
    }
  });

  test('CodeQL MCP output channel should exist', async () => {
    // The extension creates a LogOutputChannel named "CodeQL MCP".
    // We can verify this indirectly by running the showLogs command.
    await vscode.commands.executeCommand('codeql-mcp.showLogs');
    // If the command doesn't throw, the channel exists.
  });
});
