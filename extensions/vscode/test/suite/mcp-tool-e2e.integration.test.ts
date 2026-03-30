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
    assert.ok(toolNames.includes('search_ql_code'), 'Should include search_ql_code');
    assert.ok(toolNames.includes('codeql_resolve_files'), 'Should include codeql_resolve_files');

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

  test('Annotation and audit tools should NOT appear by default', async function () {
    this.timeout(15_000);

    const response = await client.listTools();
    const toolNames = response.tools.map(t => t.name);

    assert.ok(!toolNames.includes('annotation_create'), 'annotation_create should NOT be registered by default');
    assert.ok(!toolNames.includes('audit_store_findings'), 'audit_store_findings should NOT be registered by default');
    assert.ok(!toolNames.includes('query_results_cache_lookup'), 'query_results_cache_lookup should NOT be registered by default');

    console.log('[mcp-tool-e2e] Confirmed annotation/audit/cache tools are not registered by default');
  });
});

/**
 * Integration tests for annotation and audit tools.
 * These tests spawn a separate server instance with ENABLE_ANNOTATION_TOOLS=true
 * to validate opt-in annotation and MRVA audit tool functionality.
 */
suite('MCP Annotation & Audit Tool Integration Tests', () => {
  let client: Client;
  let transport: StdioClientTransport;
  let fixtureStorage: string | undefined;

  suiteSetup(async function () {
    this.timeout(30_000);

    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, `Extension ${EXTENSION_ID} not found`);
    if (!ext.isActive) await ext.activate();

    fixtureStorage = resolveFixtureStoragePath();
    assert.ok(fixtureStorage, 'Fixture codeql-storage directory not found');

    const serverPath = resolveServerPath();

    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      TRANSPORT_MODE: 'stdio',
      ENABLE_ANNOTATION_TOOLS: 'true',
      CODEQL_DATABASES_BASE_DIRS: path.join(fixtureStorage, 'databases'),
      CODEQL_QUERY_RUN_RESULTS_DIRS: path.join(fixtureStorage, 'queries'),
      CODEQL_MRVA_RUN_RESULTS_DIRS: path.join(fixtureStorage, 'variant-analyses'),
    };

    transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath],
      env,
      stderr: 'pipe',
    });

    client = new Client({ name: 'annotation-test', version: '1.0.0' });
    await client.connect(transport);
    console.log('[mcp-annotation-e2e] Connected to MCP server with annotation tools enabled');
  });

  suiteTeardown(async function () {
    this.timeout(10_000);
    try { if (client) await client.close(); } catch { /* best-effort */ }
    try { if (transport) await transport.close(); } catch { /* best-effort */ }
  });

  test('Annotation tools should be available when ENABLE_ANNOTATION_TOOLS=true', async function () {
    this.timeout(15_000);

    const response = await client.listTools();
    const toolNames = response.tools.map(t => t.name);

    // Layer 1: annotation tools
    assert.ok(toolNames.includes('annotation_create'), 'Should include annotation_create');
    assert.ok(toolNames.includes('annotation_get'), 'Should include annotation_get');
    assert.ok(toolNames.includes('annotation_list'), 'Should include annotation_list');
    assert.ok(toolNames.includes('annotation_update'), 'Should include annotation_update');
    assert.ok(toolNames.includes('annotation_delete'), 'Should include annotation_delete');
    assert.ok(toolNames.includes('annotation_search'), 'Should include annotation_search');

    // Layer 2: audit tools (gated by same flag)
    assert.ok(toolNames.includes('audit_store_findings'), 'Should include audit_store_findings');
    assert.ok(toolNames.includes('audit_list_findings'), 'Should include audit_list_findings');
    assert.ok(toolNames.includes('audit_add_notes'), 'Should include audit_add_notes');
    assert.ok(toolNames.includes('audit_clear_repo'), 'Should include audit_clear_repo');

    // Layer 3: query results cache tools (gated by same flag)
    assert.ok(toolNames.includes('query_results_cache_lookup'), 'Should include query_results_cache_lookup');
    assert.ok(toolNames.includes('query_results_cache_retrieve'), 'Should include query_results_cache_retrieve');
    assert.ok(toolNames.includes('query_results_cache_clear'), 'Should include query_results_cache_clear');
    assert.ok(toolNames.includes('query_results_cache_compare'), 'Should include query_results_cache_compare');

    console.log(`[mcp-annotation-e2e] All 14 annotation/audit/cache tools registered`);
  });

  test('MRVA + Annotation workflow: store and retrieve findings', async function () {
    this.timeout(30_000);

    // Step 1: Discover MRVA runs (from fixture)
    const mrvaResult = await client.callTool({
      name: 'list_mrva_run_results',
      arguments: {},
    });
    assert.ok(!mrvaResult.isError, 'list_mrva_run_results should succeed');
    const mrvaText = (mrvaResult.content as Array<{ type: string; text: string }>)[0]?.text ?? '';
    assert.ok(mrvaText.includes('10001'), 'Should find fixture MRVA run 10001');

    // Step 1b: Clear any pre-existing data (idempotent, tolerates empty state)
    await client.callTool({
      name: 'audit_clear_repo',
      arguments: { owner: 'arduino', repo: 'Arduino' },
    });

    // Step 2: Store findings for a repository
    const storeResult = await client.callTool({
      name: 'audit_store_findings',
      arguments: {
        owner: 'arduino',
        repo: 'Arduino',
        findings: [
          { sourceLocation: 'src/main.cpp', line: 42, sourceType: 'RemoteFlowSource', description: 'Test finding' },
        ],
      },
    });
    assert.ok(!storeResult.isError, 'audit_store_findings should succeed');
    const storeText = (storeResult.content as Array<{ type: string; text: string }>)[0]?.text ?? '';
    assert.ok(storeText.includes('Stored 1'), `Should store 1 finding. Got: ${storeText}`);

    // Step 3: List findings for the repo
    const listResult = await client.callTool({
      name: 'audit_list_findings',
      arguments: { owner: 'arduino', repo: 'Arduino' },
    });
    assert.ok(!listResult.isError, 'audit_list_findings should succeed');
    const listText = (listResult.content as Array<{ type: string; text: string }>)[0]?.text ?? '';
    assert.ok(listText.includes('src/main.cpp'), `Should include finding location. Got: ${listText}`);

    // Step 4: Add triage notes
    const notesResult = await client.callTool({
      name: 'audit_add_notes',
      arguments: {
        owner: 'arduino',
        repo: 'Arduino',
        sourceLocation: 'src/main.cpp',
        line: 42,
        notes: 'False positive: validated input',
      },
    });
    assert.ok(!notesResult.isError, 'audit_add_notes should succeed');

    // Step 5: Search for annotated findings
    const searchResult = await client.callTool({
      name: 'annotation_search',
      arguments: { search: 'false positive' },
    });
    assert.ok(!searchResult.isError, 'annotation_search should succeed');
    const searchText = (searchResult.content as Array<{ type: string; text: string }>)[0]?.text ?? '';
    assert.ok(searchText.includes('validated input'), `Should find triage note. Got: ${searchText}`);

    // Step 6: Clear repo
    const clearResult = await client.callTool({
      name: 'audit_clear_repo',
      arguments: { owner: 'arduino', repo: 'Arduino' },
    });
    assert.ok(!clearResult.isError, 'audit_clear_repo should succeed');
    const clearText = (clearResult.content as Array<{ type: string; text: string }>)[0]?.text ?? '';
    assert.ok(clearText.includes('Cleared'), `Should confirm clearing. Got: ${clearText}`);

    console.log('[mcp-annotation-e2e] MRVA + Annotation workflow test passed');
  });

  test('Query results cache: lookup, clear, and compare', async function () {
    this.timeout(15_000);

    // Step 1: Lookup should return cached:false for a query not yet run
    const lookupResult = await client.callTool({
      name: 'query_results_cache_lookup',
      arguments: { queryName: 'PrintAST', language: 'javascript' },
    });
    assert.ok(!lookupResult.isError, 'query_results_cache_lookup should succeed');
    const lookupText = (lookupResult.content as Array<{ type: string; text: string }>)[0]?.text ?? '';
    // May be cached:false or cached:true depending on prior test runs — just verify it doesn't error
    assert.ok(lookupText.includes('cached'), `Should contain cached field. Got: ${lookupText}`);

    // Step 2: Compare should work even with empty cache
    const compareResult = await client.callTool({
      name: 'query_results_cache_compare',
      arguments: { queryName: 'NonExistentQuery' },
    });
    assert.ok(!compareResult.isError, 'query_results_cache_compare should succeed');
    const compareText = (compareResult.content as Array<{ type: string; text: string }>)[0]?.text ?? '';
    assert.ok(compareText.includes('No cached results') || compareText.includes('databases'), `Should handle empty compare. Got: ${compareText}`);

    // Step 3: Clear all — should not error even on empty cache
    const clearResult = await client.callTool({
      name: 'query_results_cache_clear',
      arguments: { all: true },
    });
    assert.ok(!clearResult.isError, 'query_results_cache_clear should succeed');
    const clearText = (clearResult.content as Array<{ type: string; text: string }>)[0]?.text ?? '';
    assert.ok(clearText.includes('Cleared'), `Should confirm clearing. Got: ${clearText}`);

    // Step 4: Retrieve should handle missing key gracefully
    const retrieveResult = await client.callTool({
      name: 'query_results_cache_retrieve',
      arguments: { cacheKey: 'nonexistent-test-key', maxLines: 10 },
    });
    assert.ok(!retrieveResult.isError, 'query_results_cache_retrieve should succeed');
    const retrieveText = (retrieveResult.content as Array<{ type: string; text: string }>)[0]?.text ?? '';
    assert.ok(retrieveText.includes('No cached result'), `Should handle missing key. Got: ${retrieveText}`);

    console.log('[mcp-annotation-e2e] Query results cache test passed');
  });
});
