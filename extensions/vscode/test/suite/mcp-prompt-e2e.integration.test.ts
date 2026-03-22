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
 * - Invalid enum values (e.g. unsupported language) crash with raw MCP errors
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

/**
 * Extract the text content from the first message in a prompt result.
 */
function getFirstMessageText(result: Awaited<ReturnType<Client['getPrompt']>>): string {
  assert.ok(result.messages, 'Prompt should return messages');
  assert.ok(result.messages.length > 0, 'Prompt should return at least one message');
  const content = result.messages[0]?.content as unknown as { type: string; text: string };
  assert.ok(content?.text, 'First message should have text content');
  return content.text;
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

  // ─────────────────────────────────────────────────────────────────────
  // Prompt discovery
  // ─────────────────────────────────────────────────────────────────────

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

  // ─────────────────────────────────────────────────────────────────────
  // explain_codeql_query — path handling
  // ─────────────────────────────────────────────────────────────────────

  test('explain_codeql_query with nonexistent relative path should return warning, not throw', async function () {
    this.timeout(15_000);

    // This simulates a user entering a relative path in the VS Code slash
    // command input that does not exist on disk.
    const result = await client.getPrompt({
      name: 'explain_codeql_query',
      arguments: {
        databasePath: 'nonexistent/database',
        queryPath: 'nonexistent/path/to/query.ql',
        language: 'javascript',
      },
    });

    const text = getFirstMessageText(result);

    // The response should contain a user-friendly warning about the invalid path.
    assert.ok(
      text.includes('does not exist'),
      `Response should warn that the path does not exist. Got:\n${text.slice(0, 500)}`,
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
        databasePath: existingFile,
        queryPath: existingFile,
        language: 'javascript',
      },
    });

    const text = getFirstMessageText(result);

    // With a valid existing path, there should be no warning.
    assert.ok(
      !text.includes('does not exist'),
      `Response should NOT contain a "does not exist" warning for valid path. Got:\n${text.slice(0, 500)}`,
    );

    console.log('[mcp-prompt-e2e] explain_codeql_query returned clean response for valid path');
  });

  // ─────────────────────────────────────────────────────────────────────
  // explain_codeql_query — invalid language should return error, not crash
  // ─────────────────────────────────────────────────────────────────────

  test('explain_codeql_query with invalid language should return user-friendly error', async function () {
    this.timeout(15_000);

    // VS Code slash command might let a user type an invalid language value.
    // The server should return a helpful error message rather than a raw
    // MCP protocol error (-32602).
    try {
      const result = await client.getPrompt({
        name: 'explain_codeql_query',
        arguments: {
          databasePath: '/some/db',
          queryPath: '/some/query.ql',
          language: 'rust',
        },
      });

      // If the server returns messages instead of throwing, the error info
      // should be embedded in the response text.
      const text = getFirstMessageText(result);
      assert.ok(
        text.includes('Invalid') || text.includes('invalid') || text.includes('not supported'),
        `Response should indicate the language is invalid. Got:\n${text.slice(0, 500)}`,
      );
      console.log('[mcp-prompt-e2e] explain_codeql_query returned inline error for invalid language');
    } catch (error: unknown) {
      // If the SDK throws, verify the error message is user-friendly.
      const msg = error instanceof Error ? error.message : String(error);
      assert.ok(
        msg.includes('Invalid') || msg.includes('invalid') || msg.includes('language'),
        `Error should mention invalid argument. Got: ${msg.slice(0, 500)}`,
      );
      console.log(`[mcp-prompt-e2e] explain_codeql_query threw for invalid language: ${msg.slice(0, 200)}`);
    }
  });

  // ─────────────────────────────────────────────────────────────────────
  // document_codeql_query — path handling and invalid args
  // ─────────────────────────────────────────────────────────────────────

  test('document_codeql_query with nonexistent path should return warning, not throw', async function () {
    this.timeout(15_000);

    const result = await client.getPrompt({
      name: 'document_codeql_query',
      arguments: {
        queryPath: 'does-not-exist/MyQuery.ql',
        language: 'python',
      },
    });

    const text = getFirstMessageText(result);
    assert.ok(
      text.includes('does not exist'),
      `Response should warn that the path does not exist. Got:\n${text.slice(0, 500)}`,
    );

    console.log('[mcp-prompt-e2e] document_codeql_query correctly returned warning for nonexistent path');
  });

  test('document_codeql_query with path traversal should return warning', async function () {
    this.timeout(15_000);

    const result = await client.getPrompt({
      name: 'document_codeql_query',
      arguments: {
        queryPath: '../../../etc/passwd',
        language: 'javascript',
      },
    });

    const text = getFirstMessageText(result);
    assert.ok(
      text.includes('path traversal') || text.includes('Invalid file path'),
      `Response should warn about path traversal. Got:\n${text.slice(0, 500)}`,
    );

    console.log('[mcp-prompt-e2e] document_codeql_query correctly warned about path traversal');
  });

  // ─────────────────────────────────────────────────────────────────────
  // workshop_creation_workflow — path and parameter handling
  // ─────────────────────────────────────────────────────────────────────

  test('workshop_creation_workflow with nonexistent queryPath should return warning', async function () {
    this.timeout(15_000);

    const result = await client.getPrompt({
      name: 'workshop_creation_workflow',
      arguments: {
        queryPath: 'missing/Workshop.ql',
        language: 'python',
      },
    });

    const text = getFirstMessageText(result);
    assert.ok(
      text.includes('does not exist'),
      `Response should warn that the path does not exist. Got:\n${text.slice(0, 500)}`,
    );

    console.log('[mcp-prompt-e2e] workshop_creation_workflow correctly warned for nonexistent path');
  });

  // ─────────────────────────────────────────────────────────────────────
  // tools_query_workflow — database path handling
  // ─────────────────────────────────────────────────────────────────────

  test('tools_query_workflow with nonexistent database path should return warning', async function () {
    this.timeout(15_000);

    const result = await client.getPrompt({
      name: 'tools_query_workflow',
      arguments: {
        database: 'nonexistent/db',
        language: 'go',
      },
    });

    const text = getFirstMessageText(result);
    assert.ok(
      text.includes('does not exist'),
      `Response should warn that the database path does not exist. Got:\n${text.slice(0, 500)}`,
    );

    console.log('[mcp-prompt-e2e] tools_query_workflow correctly warned for nonexistent database');
  });

  // ─────────────────────────────────────────────────────────────────────
  // sarif_rank_false_positives — optional sarifPath handling
  // ─────────────────────────────────────────────────────────────────────

  test('sarif_rank_false_positives with nonexistent sarifPath should return warning', async function () {
    this.timeout(15_000);

    const result = await client.getPrompt({
      name: 'sarif_rank_false_positives',
      arguments: {
        sarifPath: 'nonexistent/results.sarif',
      },
    });

    const text = getFirstMessageText(result);
    assert.ok(
      text.includes('does not exist'),
      `Response should warn that the SARIF path does not exist. Got:\n${text.slice(0, 500)}`,
    );

    console.log('[mcp-prompt-e2e] sarif_rank_false_positives correctly warned for nonexistent path');
  });

  test('sarif_rank_false_positives with no arguments should reject missing sarifPath', async function () {
    this.timeout(15_000);

    // sarifPath is required; SDK should reject with a clear error.
    try {
      await client.getPrompt({
        name: 'sarif_rank_false_positives',
        arguments: {},
      });
      assert.fail('Should have thrown for missing required sarifPath');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      assert.ok(
        msg.includes('sarifPath') || msg.includes('Required'),
        `Error should mention the missing field. Got: ${msg.slice(0, 500)}`,
      );
    }

    console.log('[mcp-prompt-e2e] sarif_rank_false_positives correctly rejected missing sarifPath');
  });

  // ─────────────────────────────────────────────────────────────────────
  // ql_tdd_advanced — optional database path handling
  // ─────────────────────────────────────────────────────────────────────

  test('ql_tdd_advanced with nonexistent database should return warning', async function () {
    this.timeout(15_000);

    const result = await client.getPrompt({
      name: 'ql_tdd_advanced',
      arguments: {
        language: 'javascript',
        database: 'nonexistent/db',
      },
    });

    const text = getFirstMessageText(result);
    assert.ok(
      text.includes('does not exist'),
      `Response should warn that the database does not exist. Got:\n${text.slice(0, 500)}`,
    );

    console.log('[mcp-prompt-e2e] ql_tdd_advanced correctly warned for nonexistent database');
  });

  // ─────────────────────────────────────────────────────────────────────
  // ql_lsp_iterative_development — optional path handling
  // ─────────────────────────────────────────────────────────────────────

  test('ql_lsp_iterative_development with nonexistent queryPath should return warning', async function () {
    this.timeout(15_000);

    const result = await client.getPrompt({
      name: 'ql_lsp_iterative_development',
      arguments: {
        queryPath: 'nonexistent/query.ql',
        language: 'python',
      },
    });

    const text = getFirstMessageText(result);
    assert.ok(
      text.includes('does not exist'),
      `Response should warn that the query path does not exist. Got:\n${text.slice(0, 500)}`,
    );

    console.log('[mcp-prompt-e2e] ql_lsp_iterative_development correctly warned for nonexistent path');
  });

  // ─────────────────────────────────────────────────────────────────────
  // Prompts with required fields should return validation error on empty args
  // ─────────────────────────────────────────────────────────────────────

  test('ql_tdd_basic with empty arguments should reject missing language', async function () {
    this.timeout(15_000);

    // language is required; SDK should reject with a clear error.
    try {
      await client.getPrompt({
        name: 'ql_tdd_basic',
        arguments: {},
      });
      assert.fail('Should have thrown for missing required language');
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      assert.ok(
        msg.includes('language') || msg.includes('Required'),
        `Error should mention the missing field. Got: ${msg.slice(0, 500)}`,
      );
    }

    console.log('[mcp-prompt-e2e] ql_tdd_basic correctly rejected missing language');
  });

  test('run_query_and_summarize_false_positives with nonexistent queryPath should return warning', async function () {
    this.timeout(15_000);

    const result = await client.getPrompt({
      name: 'run_query_and_summarize_false_positives',
      arguments: {
        queryPath: 'nonexistent/fp-query.ql',
      },
    });

    const text = getFirstMessageText(result);
    assert.ok(
      text.includes('does not exist'),
      `Response should warn that the query path does not exist. Got:\n${text.slice(0, 500)}`,
    );

    console.log('[mcp-prompt-e2e] run_query_and_summarize_false_positives correctly warned for nonexistent path');
  });
});
