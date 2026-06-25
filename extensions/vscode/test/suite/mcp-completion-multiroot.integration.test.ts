/**
 * End-to-end integration tests for multi-root completion behaviour.
 *
 * These run inside the Extension Development Host with the REAL VS Code API.
 * They spawn the bundled `ql-mcp` server process with a synthetic multi-root
 * `CODEQL_MCP_WORKSPACE_FOLDERS` value, populate each fake root with `.ql`,
 * `.sarif`, and `codeql-pack.yml` fixtures on disk, and then invoke the MCP
 * `completion/complete` method to assert that paths from **non-first**
 * workspace folders are returned by every path-style completion.
 *
 * Each workspace root has its own per-root scan budget, so a populous first
 * folder does not starve later folders of completion results.
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const EXTENSION_ID = 'advanced-security.vscode-codeql-development-mcp-server';

/** Number of `.ql` files seeded into the first fake root to exhaust the budget. */
const FLOOD_FIRST_ROOT_QUERY_COUNT = 75;

/** Number of `.sarif` files seeded into the first fake root. */
const FLOOD_FIRST_ROOT_SARIF_COUNT = 75;

/** Number of pack roots seeded into the first fake root. */
const FLOOD_FIRST_ROOT_PACK_COUNT = 75;

function resolveServerPath(): string {
  const extPath = vscode.extensions.getExtension(EXTENSION_ID)?.extensionUri.fsPath;
  if (!extPath) throw new Error('Extension not found');

  const monorepo = path.resolve(
    extPath, '..', '..', 'server', 'dist', 'codeql-development-mcp-server.js',
  );
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
 * Create a temporary directory and resolve its real path (macOS `/tmp` is a
 * symlink to `/private/tmp`).
 */
function createTempDir(prefix: string): string {
  return fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), prefix)));
}

function rmRf(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
}

suite('MCP Multi-Root Completion Integration Tests', () => {
  let firstRoot: string;
  let secondRoot: string;
  let thirdRoot: string;
  let client: Client;
  let transport: StdioClientTransport;

  /** Distinctive filename seeded into the SECOND (non-first) workspace root. */
  const secondRootQueryRelative = path.join('unique-second-root-queries', 'NeedleQuery.ql');
  /** Distinctive filename seeded into the THIRD (non-first) workspace root. */
  const thirdRootQueryRelative = path.join('unique-third-root-queries', 'NeedleQuery.ql');
  /** Distinctive `.sarif` file in the second root. */
  const secondRootSarifRelative = path.join('unique-second-root-results', 'needle-results.sarif');
  /** Distinctive pack directory in the second root. */
  const secondRootPackRelative = path.join('unique-second-root-packs', 'needle-pack');
  /** Distinctive database directory in the second root. */
  const secondRootDbRelative = 'unique-second-root-db';

  suiteSetup(async function () {
    this.timeout(60_000);

    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, `Extension ${EXTENSION_ID} not found`);
    if (!ext.isActive) await ext.activate();

    firstRoot = createTempDir('ql-mcp-multiroot-a-');
    secondRoot = createTempDir('ql-mcp-multiroot-b-');
    thirdRoot = createTempDir('ql-mcp-multiroot-c-');

    // ── First (index 0) root: flood with > MAX_FILE_COMPLETIONS items so the
    //    per-root budget is exercised before reaching root 2/3.
    const firstQueryDir = path.join(firstRoot, 'src');
    fs.mkdirSync(firstQueryDir, { recursive: true });
    for (let i = 0; i < FLOOD_FIRST_ROOT_QUERY_COUNT; i++) {
      fs.writeFileSync(path.join(firstQueryDir, `FloodQuery${i}.ql`), '');
    }
    const firstSarifDir = path.join(firstRoot, 'results');
    fs.mkdirSync(firstSarifDir, { recursive: true });
    for (let i = 0; i < FLOOD_FIRST_ROOT_SARIF_COUNT; i++) {
      fs.writeFileSync(path.join(firstSarifDir, `flood-${i}.sarif`), '');
    }
    for (let i = 0; i < FLOOD_FIRST_ROOT_PACK_COUNT; i++) {
      const packDir = path.join(firstRoot, 'packs', `flood-pack-${i}`);
      fs.mkdirSync(packDir, { recursive: true });
      fs.writeFileSync(path.join(packDir, 'codeql-pack.yml'), `name: flood/p${i}\n`);
    }

    // ── Second (index 1) root: seed distinctive needles that must surface.
    const secondQueryDir = path.dirname(path.join(secondRoot, secondRootQueryRelative));
    fs.mkdirSync(secondQueryDir, { recursive: true });
    fs.writeFileSync(path.join(secondRoot, secondRootQueryRelative), '');

    const secondSarifDir = path.dirname(path.join(secondRoot, secondRootSarifRelative));
    fs.mkdirSync(secondSarifDir, { recursive: true });
    fs.writeFileSync(path.join(secondRoot, secondRootSarifRelative), '');

    const secondPackDir = path.join(secondRoot, secondRootPackRelative);
    fs.mkdirSync(secondPackDir, { recursive: true });
    fs.writeFileSync(path.join(secondPackDir, 'codeql-pack.yml'), 'name: needle/pack\n');

    const secondDbDir = path.join(secondRoot, secondRootDbRelative);
    fs.mkdirSync(secondDbDir, { recursive: true });
    fs.writeFileSync(
      path.join(secondDbDir, 'codeql-database.yml'),
      'sourceLocationPrefix: /src\n',
    );

    // ── Third (index 2) root: another needle to cover roots beyond #2.
    const thirdQueryDir = path.dirname(path.join(thirdRoot, thirdRootQueryRelative));
    fs.mkdirSync(thirdQueryDir, { recursive: true });
    fs.writeFileSync(path.join(thirdRoot, thirdRootQueryRelative), '');

    // ── Spawn the MCP server with the synthetic multi-root env.
    const serverPath = resolveServerPath();
    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      CODEQL_MCP_WORKSPACE: firstRoot,
      CODEQL_MCP_WORKSPACE_FOLDERS: [firstRoot, secondRoot, thirdRoot].join(path.delimiter),
      CODEQL_DATABASES_BASE_DIRS: '',
      TRANSPORT_MODE: 'stdio',
    };

    transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath],
      env,
      stderr: 'pipe',
    });

    client = new Client({ name: 'completion-multiroot-test', version: '1.0.0' });
    await client.connect(transport);
    console.log('[mcp-completion-multiroot] Connected to MCP server with roots:');
    console.log(`  [0] ${firstRoot}`);
    console.log(`  [1] ${secondRoot}`);
    console.log(`  [2] ${thirdRoot}`);
  });

  suiteTeardown(async function () {
    this.timeout(10_000);
    try { if (client) await client.close(); } catch { /* best-effort */ }
    try { if (transport) await transport.close(); } catch { /* best-effort */ }
    rmRf(firstRoot);
    rmRf(secondRoot);
    rmRf(thirdRoot);
  });

  // ───────────────────────────────────────────────────────────────────────
  // completeQueryPath
  // ───────────────────────────────────────────────────────────────────────

  test('queryPath completion should surface .ql files from a non-first workspace folder', async function () {
    this.timeout(30_000);

    const result = await client.complete({
      ref: { type: 'ref/prompt', name: 'explain_codeql_query' },
      argument: { name: 'queryPath', value: 'NeedleQuery' },
    });

    assert.ok(result.completion, 'Should return completion result');
    assert.ok(Array.isArray(result.completion.values), 'Completion values should be an array');
    const values = result.completion.values;

    const fromSecondRoot = values.some((v) =>
      v.endsWith(secondRootQueryRelative) || v.endsWith(path.join(secondRoot, secondRootQueryRelative)),
    );
    const fromThirdRoot = values.some((v) =>
      v.endsWith(thirdRootQueryRelative) || v.endsWith(path.join(thirdRoot, thirdRootQueryRelative)),
    );

    assert.ok(
      fromSecondRoot,
      `queryPath completion should include the .ql file from the second workspace root.\n` +
        `Looked for an entry ending with: ${secondRootQueryRelative}\n` +
        `Got: ${JSON.stringify(values, null, 2)}`,
    );
    assert.ok(
      fromThirdRoot,
      `queryPath completion should include the .ql file from the third workspace root.\n` +
        `Looked for an entry ending with: ${thirdRootQueryRelative}\n` +
        `Got: ${JSON.stringify(values, null, 2)}`,
    );
  });

  // ───────────────────────────────────────────────────────────────────────
  // completeSarifPath
  // ───────────────────────────────────────────────────────────────────────

  test('sarifPath completion should surface .sarif files from a non-first workspace folder', async function () {
    this.timeout(30_000);

    const result = await client.complete({
      ref: { type: 'ref/prompt', name: 'sarif_rank_false_positives' },
      argument: { name: 'sarifPath', value: 'needle-results' },
    });

    assert.ok(result.completion, 'Should return completion result');
    const values = result.completion.values;
    const fromSecondRoot = values.some((v) =>
      v.endsWith(secondRootSarifRelative) || v.endsWith(path.join(secondRoot, secondRootSarifRelative)),
    );

    assert.ok(
      fromSecondRoot,
      `sarifPath completion should include the .sarif file from the second workspace root.\n` +
        `Looked for an entry ending with: ${secondRootSarifRelative}\n` +
        `Got: ${JSON.stringify(values, null, 2)}`,
    );
  });

  // ───────────────────────────────────────────────────────────────────────
  // completePackRoot
  // ───────────────────────────────────────────────────────────────────────

  test('packRoot completion should surface pack directories from a non-first workspace folder', async function () {
    this.timeout(30_000);

    // Several prompts expose a `workspaceUri` arg backed by completePackRoot.
    const result = await client.complete({
      ref: { type: 'ref/prompt', name: 'ql_lsp_iterative_development' },
      argument: { name: 'workspaceUri', value: 'needle-pack' },
    });

    assert.ok(result.completion, 'Should return completion result');
    const values = result.completion.values;
    const fromSecondRoot = values.some((v) =>
      v.endsWith(secondRootPackRelative) || v.endsWith(path.join(secondRoot, secondRootPackRelative)),
    );

    assert.ok(
      fromSecondRoot,
      `packRoot completion should include the pack from the second workspace root.\n` +
        `Looked for an entry ending with: ${secondRootPackRelative}\n` +
        `Got: ${JSON.stringify(values, null, 2)}`,
    );
  });

  // ───────────────────────────────────────────────────────────────────────
  // completeDatabasePath
  // ───────────────────────────────────────────────────────────────────────

  test('database completion should surface databases from a non-first workspace folder', async function () {
    this.timeout(30_000);

    const result = await client.complete({
      ref: { type: 'ref/prompt', name: 'tools_query_workflow' },
      argument: { name: 'database', value: 'unique-second-root-db' },
    });

    assert.ok(result.completion, 'Should return completion result');
    const values = result.completion.values;
    const fromSecondRoot = values.some((v) =>
      v.endsWith(secondRootDbRelative) || v.endsWith(path.join(secondRoot, secondRootDbRelative)),
    );

    assert.ok(
      fromSecondRoot,
      `database completion should include the DB from the second workspace root.\n` +
        `Looked for an entry ending with: ${secondRootDbRelative}\n` +
        `Got: ${JSON.stringify(values, null, 2)}`,
    );
  });

  // ───────────────────────────────────────────────────────────────────────
  // explain_codeql_query — end-to-end: workflow resolves a query that lives
  // ONLY in a non-first workspace root, using the relative path the
  // completion provider would surface.
  // ───────────────────────────────────────────────────────────────────────

  test('explain_codeql_query should resolve a relative queryPath against a non-first workspace folder', async function () {
    this.timeout(30_000);

    const result = await client.getPrompt({
      name: 'explain_codeql_query',
      arguments: {
        // A relative path that ONLY exists in the second workspace root.
        queryPath: secondRootQueryRelative,
        language: 'javascript',
      },
    });

    assert.ok(result.messages?.length, 'Prompt should return at least one message');
    const content = result.messages[0]?.content as unknown as { type: string; text: string };
    const text = content?.text ?? '';

    assert.ok(
      !text.includes('does not exist'),
      `explain_codeql_query should resolve the path against the non-first root and not warn that it does not exist.\n` +
        `Got:\n${text.slice(0, 800)}`,
    );

    const expectedAbsolute = path.join(secondRoot, secondRootQueryRelative);
    assert.ok(
      text.includes(expectedAbsolute),
      `explain_codeql_query response should embed the absolute path resolved against the second root.\n` +
        `Expected to contain: ${expectedAbsolute}\n` +
        `Got:\n${text.slice(0, 800)}`,
    );
  });
});
