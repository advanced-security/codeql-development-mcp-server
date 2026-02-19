/**
 * End-to-end integration tests for MCP server tools.
 *
 * These run inside the Extension Development Host with the REAL VS Code API.
 * They spawn the actual `ql-mcp` server process (using the extension's
 * configured command/args/env), connect via the MCP SDK's StdioClientTransport,
 * call tools like `list_codeql_databases` and `list_query_run_results`, and
 * verify the results match expected fixture data.
 *
 * The test fixtures under `test/fixtures/single-folder-workspace/codeql-storage/`
 * and `test/fixtures/multi-root-workspace/folder-a/codeql-storage/` contain
 * representative CodeQL database metadata and query run result directories
 * that these tests discover.
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const EXTENSION_ID = 'advanced-security.vscode-codeql-development-mcp-server';

/**
 * Resolve the MCP server entry point. Checks:
 * 1. Bundled inside extension (VSIX layout)
 * 2. Monorepo sibling (dev layout)
 */
function resolveServerPath(): string {
  const extPath = vscode.extensions.getExtension(EXTENSION_ID)?.extensionUri.fsPath;
  if (!extPath) throw new Error('Extension not found');

  // Monorepo dev layout: extensions/vscode/../../server/dist/...
  const monorepo = path.resolve(extPath, '..', '..', 'server', 'dist', 'codeql-development-mcp-server.js');
  try {
    fs.accessSync(monorepo);
    return monorepo;
  } catch {
    // Fall through
  }

  // VSIX layout: server/dist/...
  const vsix = path.resolve(extPath, 'server', 'dist', 'codeql-development-mcp-server.js');
  try {
    fs.accessSync(vsix);
    return vsix;
  } catch {
    throw new Error(`MCP server not found at ${monorepo} or ${vsix}`);
  }
}

/**
 * Resolve the fixture storage directory for the current test scenario.
 * The fixture `codeql-storage/` directory simulates vscode-codeql storage.
 */
function resolveFixtureStoragePath(): string | undefined {
  const extPath = vscode.extensions.getExtension(EXTENSION_ID)?.extensionUri.fsPath;
  if (!extPath) return undefined;

  // Check single-folder-workspace fixture
  const singleFolder = path.resolve(extPath, 'test', 'fixtures', 'single-folder-workspace', 'codeql-storage');
  try {
    fs.accessSync(singleFolder);
    return singleFolder;
  } catch {
    // Fall through
  }

  // Check multi-root folder-a fixture
  const multiRoot = path.resolve(extPath, 'test', 'fixtures', 'multi-root-workspace', 'folder-a', 'codeql-storage');
  try {
    fs.accessSync(multiRoot);
    return multiRoot;
  } catch {
    return undefined;
  }
}

suite('MCP Server Tool Integration Tests', () => {
  let client: Client;
  let transport: StdioClientTransport;
  let fixtureStorage: string | undefined;

  suiteSetup(async function () {
    this.timeout(30_000);

    // Ensure extension is activated
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, `Extension ${EXTENSION_ID} not found`);
    if (!ext.isActive) await ext.activate();

    // Resolve fixture storage path — must exist
    fixtureStorage = resolveFixtureStoragePath();
    assert.ok(fixtureStorage, 'Fixture codeql-storage directory not found. Test fixtures are missing.');

    // Resolve the MCP server entry point — must exist
    const serverPath = resolveServerPath();

    // Build environment: point discovery vars at fixture storage
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      TRANSPORT_MODE: 'stdio',
      CODEQL_DATABASES_BASE_DIRS: path.join(fixtureStorage, 'databases'),
      CODEQL_QUERY_RUN_RESULTS_DIRS: path.join(fixtureStorage, 'queries'),
      CODEQL_MRVA_RUN_RESULTS_DIRS: path.join(fixtureStorage, 'variant-analyses'),
    };

    // Spawn the server via StdioClientTransport
    transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath],
      env,
      stderr: 'pipe',
    });

    client = new Client({ name: 'extension-host-test', version: '1.0.0' });
    await client.connect(transport);
    console.log('[mcp-tool-e2e] Connected to MCP server');
  });

  suiteTeardown(async function () {
    this.timeout(10_000);
    try {
      if (client) await client.close();
    } catch {
      // Best-effort
    }
    try {
      if (transport) await transport.close();
    } catch {
      // Best-effort
    }
  });

  test('Server should list available tools', async function () {
    this.timeout(15_000);

    const response = await client.listTools();
    assert.ok(response.tools, 'Server should return tools');
    assert.ok(response.tools.length > 0, 'Server should have at least one tool');

    const toolNames = response.tools.map(t => t.name);
    assert.ok(toolNames.includes('list_codeql_databases'), 'Should include list_codeql_databases');
    assert.ok(toolNames.includes('list_query_run_results'), 'Should include list_query_run_results');
    assert.ok(toolNames.includes('list_mrva_run_results'), 'Should include list_mrva_run_results');

    console.log(`[mcp-tool-e2e] Server provides ${response.tools.length} tools`);
  });

  test('list_codeql_databases should find fixture databases', async function () {
    this.timeout(15_000);

    const result = await client.callTool({
      name: 'list_codeql_databases',
      arguments: {},
    });

    assert.ok(!result.isError, `Tool returned error: ${JSON.stringify(result.content)}`);
    const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? '';

    // Should find the test-javascript-db from the fixture
    assert.ok(
      text.includes('test-javascript-db'),
      `list_codeql_databases should find test-javascript-db in fixture storage. Got: ${text}`,
    );
    assert.ok(
      text.includes('javascript'),
      `Database should be identified as javascript language. Got: ${text}`,
    );

    console.log(`[mcp-tool-e2e] list_codeql_databases result:\n${text}`);
  });

  test('list_codeql_databases with language filter should work', async function () {
    this.timeout(15_000);

    const result = await client.callTool({
      name: 'list_codeql_databases',
      arguments: { language: 'javascript' },
    });

    assert.ok(!result.isError, `Tool returned error: ${JSON.stringify(result.content)}`);
    const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? '';

    assert.ok(
      text.includes('test-javascript-db'),
      `Filtered result should include test-javascript-db. Got: ${text}`,
    );
  });

  test('list_query_run_results should find fixture query runs', async function () {
    this.timeout(15_000);

    const result = await client.callTool({
      name: 'list_query_run_results',
      arguments: {},
    });

    assert.ok(!result.isError, `Tool returned error: ${JSON.stringify(result.content)}`);
    const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? '';

    // Should find ExampleQuery1.ql run from the fixture
    assert.ok(
      text.includes('ExampleQuery1.ql'),
      `list_query_run_results should find ExampleQuery1.ql run in fixture storage. Got: ${text}`,
    );
    assert.ok(
      text.includes('javascript'),
      `Query run should have javascript language extracted from query.log. Got: ${text}`,
    );

    console.log(`[mcp-tool-e2e] list_query_run_results result:\n${text}`);
  });

  test('list_query_run_results with queryName filter should work', async function () {
    this.timeout(15_000);

    const result = await client.callTool({
      name: 'list_query_run_results',
      arguments: { queryName: 'ExampleQuery1.ql' },
    });

    assert.ok(!result.isError, `Tool returned error: ${JSON.stringify(result.content)}`);
    const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? '';

    assert.ok(
      text.includes('ExampleQuery1.ql'),
      `Filtered result should include ExampleQuery1.ql. Got: ${text}`,
    );
    // Should NOT include other query names
    assert.ok(
      !text.includes('SqlInjection.ql'),
      `Filtered result should NOT include SqlInjection.ql. Got: ${text}`,
    );
  });

  test('list_mrva_run_results should find fixture MRVA runs', async function () {
    this.timeout(15_000);

    const result = await client.callTool({
      name: 'list_mrva_run_results',
      arguments: {},
    });

    assert.ok(!result.isError, `Tool returned error: ${JSON.stringify(result.content)}`);
    const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? '';

    assert.ok(
      text.includes('10001'),
      `list_mrva_run_results should find run 10001 from fixture. Got: ${text}`,
    );

    console.log(`[mcp-tool-e2e] list_mrva_run_results result:\n${text}`);
  });
});
