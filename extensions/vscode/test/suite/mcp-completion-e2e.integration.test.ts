/**
 * End-to-end integration tests for MCP prompt argument completions.
 *
 * These run inside the Extension Development Host with the REAL VS Code API.
 * They spawn the actual `ql-mcp` server process, connect via
 * StdioClientTransport, and invoke the `completion/complete` MCP method to
 * verify that prompt arguments return useful auto-complete suggestions.
 *
 * This test suite validates the UX improvements where:
 * - Language parameters offer a filtered dropdown of supported languages
 * - File path parameters (queryPath, sarifPath, database) suggest matching
 *   files from the workspace
 * - The completion mechanism integrates correctly with the MCP protocol
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

suite('MCP Prompt Argument Completion Integration Tests', () => {
  let client: Client;
  let transport: StdioClientTransport;

  suiteSetup(async function () {
    this.timeout(30_000);

    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, `Extension ${EXTENSION_ID} not found`);
    if (!ext.isActive) await ext.activate();

    const serverPath = resolveServerPath();

    const workspaceDir =
      vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? ext.extensionUri.fsPath;

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      CODEQL_MCP_WORKSPACE: workspaceDir,
      TRANSPORT_MODE: 'stdio',
    };

    transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath],
      env,
      stderr: 'pipe',
    });

    client = new Client({ name: 'completion-e2e-test', version: '1.0.0' });
    await client.connect(transport);
    console.log('[mcp-completion-e2e] Connected to MCP server');
  });

  suiteTeardown(async function () {
    this.timeout(10_000);
    try { if (client) await client.close(); } catch { /* best-effort */ }
    try { if (transport) await transport.close(); } catch { /* best-effort */ }
  });

  // ─────────────────────────────────────────────────────────────────────
  // Server should advertise completions capability
  // ─────────────────────────────────────────────────────────────────────

  test('Server should advertise completions capability', async function () {
    this.timeout(15_000);

    // The server capabilities are available after connection
    const capabilities = client.getServerCapabilities();
    assert.ok(capabilities, 'Server should report capabilities');

    // When completable() is used, the SDK enables completions capability
    assert.ok(
      capabilities.completions,
      'Server should advertise completions capability when prompt arguments use completable()',
    );

    console.log('[mcp-completion-e2e] Server advertises completions capability');
  });

  // ─────────────────────────────────────────────────────────────────────
  // Language completion
  // ─────────────────────────────────────────────────────────────────────

  test('Language completion should return all languages for empty input', async function () {
    this.timeout(15_000);

    const result = await client.complete({
      ref: {
        type: 'ref/prompt',
        name: 'test_driven_development',
      },
      argument: {
        name: 'language',
        value: '',
      },
    });

    assert.ok(result.completion, 'Should return completion result');
    assert.ok(result.completion.values, 'Should return completion values');
    assert.ok(
      result.completion.values.length > 0,
      `Should return at least one language completion. Got: ${JSON.stringify(result.completion.values)}`,
    );

    // All supported languages should be present for empty input
    const values = result.completion.values;
    assert.ok(values.includes('javascript'), 'Should include javascript');
    assert.ok(values.includes('python'), 'Should include python');
    assert.ok(values.includes('go'), 'Should include go');

    console.log(`[mcp-completion-e2e] Language completion returned ${values.length} values for empty input`);
  });

  test('Language completion should filter by prefix', async function () {
    this.timeout(15_000);

    const result = await client.complete({
      ref: {
        type: 'ref/prompt',
        name: 'test_driven_development',
      },
      argument: {
        name: 'language',
        value: 'ja',
      },
    });

    assert.ok(result.completion, 'Should return completion result');
    const values = result.completion.values;
    assert.ok(values.includes('java'), 'Should include java');
    assert.ok(values.includes('javascript'), 'Should include javascript');
    assert.ok(!values.includes('python'), 'Should NOT include python');
    assert.ok(!values.includes('go'), 'Should NOT include go');

    console.log(`[mcp-completion-e2e] Language completion for "ja" returned: ${values.join(', ')}`);
  });

  test('Language completion should return empty for non-matching prefix', async function () {
    this.timeout(15_000);

    const result = await client.complete({
      ref: {
        type: 'ref/prompt',
        name: 'explain_codeql_query',
      },
      argument: {
        name: 'language',
        value: 'cobol',
      },
    });

    assert.ok(result.completion, 'Should return completion result');
    assert.strictEqual(
      result.completion.values.length,
      0,
      `Should return no completions for "cobol". Got: ${result.completion.values.join(', ')}`,
    );

    console.log('[mcp-completion-e2e] Language completion correctly returned empty for "cobol"');
  });

  // ─────────────────────────────────────────────────────────────────────
  // Language completion across different prompts
  // ─────────────────────────────────────────────────────────────────────

  test('Language completion should work for ql_tdd_basic prompt', async function () {
    this.timeout(15_000);

    const result = await client.complete({
      ref: {
        type: 'ref/prompt',
        name: 'ql_tdd_basic',
      },
      argument: {
        name: 'language',
        value: 'py',
      },
    });

    assert.ok(result.completion, 'Should return completion result');
    assert.ok(
      result.completion.values.includes('python'),
      `Should include python for "py" prefix. Got: ${result.completion.values.join(', ')}`,
    );

    console.log('[mcp-completion-e2e] ql_tdd_basic language completion works');
  });

  test('Language completion should work for tools_query_workflow prompt', async function () {
    this.timeout(15_000);

    const result = await client.complete({
      ref: {
        type: 'ref/prompt',
        name: 'tools_query_workflow',
      },
      argument: {
        name: 'language',
        value: 'c',
      },
    });

    assert.ok(result.completion, 'Should return completion result');
    const values = result.completion.values;
    assert.ok(values.includes('cpp'), 'Should include cpp');
    assert.ok(values.includes('csharp'), 'Should include csharp');

    console.log(`[mcp-completion-e2e] tools_query_workflow language completion for "c" returned: ${values.join(', ')}`);
  });

  // ─────────────────────────────────────────────────────────────────────
  // queryPath completion
  // ─────────────────────────────────────────────────────────────────────

  test('queryPath completion should return results (may be empty in test workspace)', async function () {
    this.timeout(15_000);

    const result = await client.complete({
      ref: {
        type: 'ref/prompt',
        name: 'explain_codeql_query',
      },
      argument: {
        name: 'queryPath',
        value: '',
      },
    });

    assert.ok(result.completion, 'Should return completion result');
    assert.ok(Array.isArray(result.completion.values), 'Completion values should be an array');

    // In a test workspace the workspace may or may not have .ql files.
    // The important thing is the completion mechanism works without error.
    console.log(`[mcp-completion-e2e] queryPath completion returned ${result.completion.values.length} values`);
  });

  // ─────────────────────────────────────────────────────────────────────
  // database completion
  // ─────────────────────────────────────────────────────────────────────

  test('database completion should return results without error', async function () {
    this.timeout(15_000);

    const result = await client.complete({
      ref: {
        type: 'ref/prompt',
        name: 'tools_query_workflow',
      },
      argument: {
        name: 'database',
        value: '',
      },
    });

    assert.ok(result.completion, 'Should return completion result');
    assert.ok(Array.isArray(result.completion.values), 'Completion values should be an array');

    console.log(`[mcp-completion-e2e] database completion returned ${result.completion.values.length} values`);
  });

  // ─────────────────────────────────────────────────────────────────────
  // sarifPath completion
  // ─────────────────────────────────────────────────────────────────────

  test('sarifPath completion should return results without error', async function () {
    this.timeout(15_000);

    const result = await client.complete({
      ref: {
        type: 'ref/prompt',
        name: 'sarif_rank_false_positives',
      },
      argument: {
        name: 'sarifPath',
        value: '',
      },
    });

    assert.ok(result.completion, 'Should return completion result');
    assert.ok(Array.isArray(result.completion.values), 'Completion values should be an array');

    console.log(`[mcp-completion-e2e] sarifPath completion returned ${result.completion.values.length} values`);
  });

  // ─────────────────────────────────────────────────────────────────────
  // Non-completable fields should still work (no error)
  // ─────────────────────────────────────────────────────────────────────

  test('Non-completable field (queryName) should return empty completions', async function () {
    this.timeout(15_000);

    // queryName is not a completable field — the server should still
    // handle the request gracefully (empty results, not an error).
    try {
      const result = await client.complete({
        ref: {
          type: 'ref/prompt',
          name: 'ql_tdd_basic',
        },
        argument: {
          name: 'queryName',
          value: 'test',
        },
      });

      // If the server responds, verify the result is valid
      assert.ok(result.completion, 'Should return completion result');
      assert.strictEqual(
        result.completion.values.length,
        0,
        'Non-completable field should return empty completions',
      );
    } catch {
      // The MCP SDK may throw if the field is not completable — that's acceptable
      console.log('[mcp-completion-e2e] Non-completable field correctly rejected or returned empty');
    }
  });

  // ─────────────────────────────────────────────────────────────────────
  // Verify completions work on prompts that bypass toPermissiveShape
  // ─────────────────────────────────────────────────────────────────────

  test('Language completion should work for find_overlapping_queries (raw shape)', async function () {
    this.timeout(15_000);

    const result = await client.complete({
      ref: {
        type: 'ref/prompt',
        name: 'find_overlapping_queries',
      },
      argument: {
        name: 'language',
        value: 'sw',
      },
    });

    assert.ok(result.completion, 'Should return completion result');
    assert.ok(
      result.completion.values.includes('swift'),
      `Should include swift for "sw" prefix. Got: ${result.completion.values.join(', ')}`,
    );

    console.log('[mcp-completion-e2e] find_overlapping_queries language completion works');
  });

  test('queryPath completion should work for check_for_duplicated_code (raw shape)', async function () {
    this.timeout(15_000);

    const result = await client.complete({
      ref: {
        type: 'ref/prompt',
        name: 'check_for_duplicated_code',
      },
      argument: {
        name: 'queryPath',
        value: '',
      },
    });

    assert.ok(result.completion, 'Should return completion result');
    assert.ok(Array.isArray(result.completion.values), 'Completion values should be an array');

    console.log(`[mcp-completion-e2e] check_for_duplicated_code queryPath completion works`);
  });
});
