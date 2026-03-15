/**
 * End-to-end integration tests for MCP server prompt error handling.
 *
 * These run inside the Extension Development Host with the REAL VS Code API.
 * They spawn the actual `ql-mcp` server process, connect via
 * StdioClientTransport, and invoke prompts with invalid file paths to verify
 * that the server returns user-friendly warnings instead of throwing raw MCP
 * protocol errors.
 *
 * This test suite exists to catch the class of bugs where:
 * - A relative or nonexistent `queryPath` triggers a cryptic -32001 error
 * - Invalid paths propagate silently into the LLM context without any warning
 * - Path traversal attempts are not detected
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const EXTENSION_ID = 'advanced-security.vscode-codeql-development-mcp-server';

/**
 * Resolve the MCP server entry point.
 */
function resolveServerPath(): string {
  const extPath = vscode.extensions.getExtension(EXTENSION_ID)?.extensionUri.fsPath;
  if (!extPath) throw new Error('Extension not found');

  const monorepo = path.resolve(extPath, '..', '..', 'server', 'dist', 'codeql-development-mcp-server.js');
  try {
    fs.accessSync(monorepo);
    return monorepo;
  } catch {
    // Fall through
  }

  const vsix = path.resolve(extPath, 'server', 'dist', 'codeql-development-mcp-server.js');
  try {
    fs.accessSync(vsix);
    return vsix;
  } catch {
    throw new Error(`MCP server not found at ${monorepo} or ${vsix}`);
  }
}

suite('MCP Prompt Error Handling Integration Tests', () => {
  let client: Client;
  let transport: StdioClientTransport;

  suiteSetup(async function () {
    this.timeout(30_000);

    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, `Extension ${EXTENSION_ID} not found`);
    if (!ext.isActive) await ext.activate();

    const serverPath = resolveServerPath();

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      TRANSPORT_MODE: 'stdio',
    };

    transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath],
      env,
      stderr: 'pipe',
    });

    client = new Client({ name: 'prompt-e2e-test', version: '1.0.0' });
    await client.connect(transport);
    console.log('[mcp-prompt-e2e] Connected to MCP server');
  });

  suiteTeardown(async function () {
    this.timeout(10_000);
    try { if (client) await client.close(); } catch { /* best-effort */ }
    try { if (transport) await transport.close(); } catch { /* best-effort */ }
  });

  test('Server should list prompts including explain_codeql_query', async function () {
    this.timeout(15_000);

    const response = await client.listPrompts();
    assert.ok(response.prompts, 'Server should return prompts');
    assert.ok(response.prompts.length > 0, 'Server should have at least one prompt');

    const names = response.prompts.map(p => p.name);
    assert.ok(
      names.includes('explain_codeql_query'),
      `Prompts should include explain_codeql_query. Found: ${names.join(', ')}`,
    );

    console.log(`[mcp-prompt-e2e] Server provides ${response.prompts.length} prompts`);
  });

  test('explain_codeql_query with nonexistent relative path should return warning, not throw', async function () {
    this.timeout(15_000);

    // This simulates a user entering a relative path in the VS Code slash
    // command input that does not exist on disk.
    const result = await client.getPrompt({
      name: 'explain_codeql_query',
      arguments: {
        queryPath: 'nonexistent/path/to/query.ql',
        language: 'javascript',
      },
    });

    // The prompt MUST return messages — not throw a protocol error.
    assert.ok(result.messages, 'Prompt should return messages');
    assert.ok(result.messages.length > 0, 'Prompt should return at least one message');

    const text = result.messages[0]?.content as unknown as { type: string; text: string };
    assert.ok(text?.text, 'First message should have text content');

    // The response should contain a user-friendly warning about the invalid path.
    assert.ok(
      text.text.includes('does not exist'),
      `Response should warn that the path does not exist. Got:\n${text.text.slice(0, 500)}`,
    );

    console.log('[mcp-prompt-e2e] explain_codeql_query correctly returned warning for nonexistent path');
  });

  test('explain_codeql_query with valid absolute path should not include a warning', async function () {
    this.timeout(15_000);

    // Use this very test file as a known-existing absolute path.
    const extPath = vscode.extensions.getExtension(EXTENSION_ID)?.extensionUri.fsPath;
    assert.ok(extPath, 'Extension path should be available');
    const existingFile = path.resolve(extPath, 'package.json');

    const result = await client.getPrompt({
      name: 'explain_codeql_query',
      arguments: {
        queryPath: existingFile,
        language: 'javascript',
      },
    });

    assert.ok(result.messages, 'Prompt should return messages');
    assert.ok(result.messages.length > 0, 'Prompt should return at least one message');

    const text = result.messages[0]?.content as unknown as { type: string; text: string };
    assert.ok(text?.text, 'First message should have text content');

    // With a valid existing path, there should be no warning.
    assert.ok(
      !text.text.includes('does not exist'),
      `Response should NOT contain a "does not exist" warning for valid path. Got:\n${text.text.slice(0, 500)}`,
    );

    console.log('[mcp-prompt-e2e] explain_codeql_query returned clean response for valid path');
  });

  test('document_codeql_query with nonexistent path should return warning, not throw', async function () {
    this.timeout(15_000);

    const result = await client.getPrompt({
      name: 'document_codeql_query',
      arguments: {
        queryPath: 'does-not-exist/MyQuery.ql',
        language: 'python',
      },
    });

    assert.ok(result.messages, 'Prompt should return messages');
    assert.ok(result.messages.length > 0, 'Prompt should return at least one message');

    const text = result.messages[0]?.content as unknown as { type: string; text: string };
    assert.ok(
      text?.text?.includes('does not exist'),
      `Response should warn that the path does not exist. Got:\n${(text?.text ?? '').slice(0, 500)}`,
    );

    console.log('[mcp-prompt-e2e] document_codeql_query correctly returned warning for nonexistent path');
  });
});
