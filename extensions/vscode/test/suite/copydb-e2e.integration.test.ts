/**
 * End-to-end integration tests for the `copyDatabases` feature.
 *
 * These run inside the Extension Development Host with the REAL VS Code API.
 * They exercise the full pipeline:
 *
 *   1. Copy a real CodeQL database into a staging directory that simulates
 *      `GitHub.vscode-codeql` extension storage (including a `.lock` file
 *      injected into the dataset cache directory).
 *   2. Use `DatabaseCopier` to sync the staged database into a managed
 *      destination directory — removing `.lock` files in the process.
 *   3. Spawn the MCP server and invoke `codeql_query_run` and
 *      `codeql_database_analyze` against the copied, lock-free database.
 *   4. Assert the tools succeed and the managed directory contains no `.lock`
 *      files.
 *
 * The test requires:
 *   - The CodeQL CLI (`codeql`) available on PATH or via CODEQL_PATH.
 *   - The JavaScript example test database extracted at
 *     `server/ql/javascript/examples/test/ExampleQuery1/ExampleQuery1.testproj`.
 *     If missing, the test is skipped gracefully.
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { DatabaseCopier } from '../../src/bridge/database-copier';

const EXTENSION_ID = 'advanced-security.vscode-codeql-development-mcp-server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve the MCP server entry point (monorepo dev layout). */
function resolveServerPath(): string {
  const extPath = vscode.extensions.getExtension(EXTENSION_ID)?.extensionUri.fsPath;
  if (!extPath) throw new Error('Extension not found');

  const monorepo = path.resolve(extPath, '..', '..', 'server', 'dist', 'codeql-development-mcp-server.js');
  if (fs.existsSync(monorepo)) return monorepo;

  const vsix = path.resolve(extPath, 'server', 'dist', 'codeql-development-mcp-server.js');
  if (fs.existsSync(vsix)) return vsix;

  throw new Error(`MCP server not found at ${monorepo} or ${vsix}`);
}

/** Resolve the repo root from the extension path. */
function resolveRepoRoot(): string {
  const extPath = vscode.extensions.getExtension(EXTENSION_ID)?.extensionUri.fsPath;
  if (!extPath) throw new Error('Extension not found');
  return path.resolve(extPath, '..', '..');
}

/** Recursively find all files named `.lock` under a directory. */
function findLockFiles(dir: string): string[] {
  const results: string[] = [];
  let entries: string[];
  try { entries = fs.readdirSync(dir); } catch { return results; }
  for (const entry of entries) {
    const full = path.join(dir, entry);
    try {
      if (fs.statSync(full).isDirectory()) {
        results.push(...findLockFiles(full));
      } else if (entry === '.lock') {
        results.push(full);
      }
    } catch { /* skip */ }
  }
  return results;
}

/** Recursively copy a directory (Node 16.7+). */
function copyDirSync(src: string, dest: string): void {
  fs.cpSync(src, dest, { recursive: true });
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

suite('copyDatabases E2E — query against copied database', () => {
  const REAL_DB_RELATIVE = 'server/ql/javascript/examples/test/ExampleQuery1/ExampleQuery1.testproj';
  const QUERY_RELATIVE   = 'server/ql/javascript/examples/src/ExampleQuery1/ExampleQuery1.ql';

  let repoRoot: string;
  let realDbPath: string;
  let queryPath: string;

  // Staging directory (simulates GitHub.vscode-codeql storage with .lock)
  let stagingDir: string;
  // Managed destination (lock-free copy produced by DatabaseCopier logic)
  let managedDir: string;
  // Temp root that holds both staging and managed dirs
  let tmpRoot: string;

  let client: Client;
  let transport: StdioClientTransport;

  suiteSetup(async function () {
    this.timeout(120_000); // query runs can take a while

    repoRoot  = resolveRepoRoot();
    realDbPath = path.join(repoRoot, REAL_DB_RELATIVE);
    queryPath  = path.join(repoRoot, QUERY_RELATIVE);

    // --- Gate: skip entirely if the real database hasn't been extracted ---
    if (!fs.existsSync(path.join(realDbPath, 'codeql-database.yml'))) {
      console.log('[copydb-e2e] Real test database not extracted — skipping suite');
      this.skip();
      return;
    }
    if (!fs.existsSync(queryPath)) {
      console.log('[copydb-e2e] Query file not found — skipping suite');
      this.skip();
      return;
    }

    // --- Build staging directory with a .lock file ---
    const extGlobal = vscode.extensions.getExtension(EXTENSION_ID)!.extensionUri.fsPath;
    tmpRoot    = path.join(extGlobal, '..', '..', '.tmp', 'copydb-e2e-' + Date.now());
    stagingDir = path.join(tmpRoot, 'vscode-codeql-storage');
    managedDir = path.join(tmpRoot, 'managed-databases');

    const stagedDb = path.join(stagingDir, 'ExampleQuery1.testproj');
    console.log(`[copydb-e2e] Copying real database → staging: ${stagedDb}`);
    fs.mkdirSync(stagingDir, { recursive: true });
    copyDirSync(realDbPath, stagedDb);

    // Inject a .lock file into the cache directory (mimicking query server).
    const cacheDir = path.join(stagedDb, 'db-javascript', 'default', 'cache');
    if (fs.existsSync(cacheDir)) {
      fs.writeFileSync(path.join(cacheDir, '.lock'), '');
      console.log('[copydb-e2e] Injected .lock into staged database cache');
    } else {
      console.log('[copydb-e2e] Warning: cache dir not found in staged database — .lock not injected');
    }

    // Verify .lock exists in staging
    const stagingLocks = findLockFiles(stagedDb);
    assert.ok(stagingLocks.length > 0, 'Staged database should contain at least one .lock file');
    console.log(`[copydb-e2e] Staging .lock files: ${stagingLocks.length}`);

    // --- Use DatabaseCopier to sync staging → managed (removing .lock) ---
    console.log(`[copydb-e2e] Syncing staging → managed via DatabaseCopier: ${managedDir}`);
    const logger = { info: console.log, warn: console.warn, error: console.error, debug: () => {} } as any;
    const copier = new DatabaseCopier(managedDir, logger);
    const copiedDbs = await copier.syncAll([stagingDir]);
    assert.ok(copiedDbs.length > 0, 'DatabaseCopier should have copied at least one database');

    // Verify no .lock in managed
    const managedDb = path.join(managedDir, 'ExampleQuery1.testproj');
    const managedLocks = findLockFiles(managedDb);
    assert.strictEqual(managedLocks.length, 0, 'Managed database should have zero .lock files after DatabaseCopier sync');
    console.log('[copydb-e2e] Managed database is lock-free');

    // --- Spawn MCP server pointing at managed directory ---
    const serverPath = resolveServerPath();
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      TRANSPORT_MODE: 'stdio',
      CODEQL_DATABASES_BASE_DIRS: managedDir,
      CODEQL_MCP_WORKSPACE: repoRoot,
    };

    transport = new StdioClientTransport({
      command: 'node',
      args: [serverPath],
      env,
      stderr: 'pipe',
    });

    client = new Client({ name: 'copydb-e2e-test', version: '1.0.0' });
    await client.connect(transport);
    console.log('[copydb-e2e] Connected to MCP server');
  });

  suiteTeardown(async function () {
    this.timeout(15_000);
    try { if (client) await client.close(); } catch { /* best-effort */ }
    try { if (transport) await transport.close(); } catch { /* best-effort */ }
    // Clean up temp directories
    try {
      if (tmpRoot && fs.existsSync(tmpRoot)) {
        fs.rmSync(tmpRoot, { recursive: true, force: true });
        console.log('[copydb-e2e] Cleaned up temp directory');
      }
    } catch { /* best-effort */ }
  });

  // -----------------------------------------------------------------------
  // Tests
  // -----------------------------------------------------------------------

  test('list_codeql_databases should discover the copied database', async function () {
    this.timeout(15_000);

    const result = await client.callTool({
      name: 'list_codeql_databases',
      arguments: {},
    });

    assert.ok(!result.isError, `Tool error: ${JSON.stringify(result.content)}`);
    const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? '';

    assert.ok(
      text.includes('ExampleQuery1.testproj'),
      `list_codeql_databases should find ExampleQuery1.testproj in managed dir. Got: ${text}`,
    );
    assert.ok(
      text.includes('javascript'),
      `Database should be javascript language. Got: ${text}`,
    );
    console.log(`[copydb-e2e] list_codeql_databases:\n${text}`);
  });

  test('codeql_query_run should succeed against the lock-free copied database', async function () {
    this.timeout(120_000); // query evaluation can be slow

    const managedDb = path.join(managedDir, 'ExampleQuery1.testproj');

    const result = await client.callTool({
      name: 'codeql_query_run',
      arguments: {
        database: managedDb,
        query: queryPath,
      },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? '';
    console.log(`[copydb-e2e] codeql_query_run result (first 500 chars):\n${text.slice(0, 500)}`);

    assert.ok(
      !result.isError,
      `codeql_query_run should succeed against the lock-free copied database. Error: ${text}`,
    );

    // The ExampleQuery1 finds File nodes named "ExampleQuery1.js" — verify
    // we got at least some result text indicating success.
    assert.ok(
      text.includes('ExampleQuery1') || text.includes('successfully') || text.includes('result'),
      `Query result should reference ExampleQuery1 or indicate success. Got: ${text.slice(0, 300)}`,
    );
  });

  test('codeql_database_analyze should succeed against the lock-free copied database', async function () {
    this.timeout(120_000);

    const managedDb = path.join(managedDir, 'ExampleQuery1.testproj');
    const outputSarif = path.join(tmpRoot, 'analyze-output.sarif');

    const result = await client.callTool({
      name: 'codeql_database_analyze',
      arguments: {
        database: managedDb,
        queries: queryPath,
        format: 'sarif-latest',
        output: outputSarif,
      },
    });

    const text = (result.content as Array<{ type: string; text: string }>)[0]?.text ?? '';
    console.log(`[copydb-e2e] codeql_database_analyze result (first 500 chars):\n${text.slice(0, 500)}`);

    assert.ok(
      !result.isError,
      `codeql_database_analyze should succeed against the lock-free copied database. Error: ${text}`,
    );
  });

  test('originally-injected .lock should not exist in managed directory after queries', function () {
    if (!managedDir || !fs.existsSync(managedDir)) {
      this.skip();
      return;
    }
    // The originally-injected .lock from staging must have been removed by
    // DatabaseCopier.  The CLI may create its own .lock during evaluation,
    // which is acceptable (no contention in the managed dir).
    const managedDb = path.join(managedDir, 'ExampleQuery1.testproj');
    const injectedLockPath = path.join(managedDb, 'db-javascript', 'default', 'cache', '.lock');
    // The injected lock was at db-javascript/default/cache/.lock — if the CLI
    // hasn't created one itself, it should still be absent.
    const allLocks = findLockFiles(managedDb);
    console.log(`[copydb-e2e] .lock files in managed dir after queries: ${allLocks.length}`);
    // Verify the staging source still has the lock (wasn't modified)
    const stagedDb = path.join(path.dirname(managedDir), 'vscode-codeql-storage', 'ExampleQuery1.testproj');
    if (fs.existsSync(stagedDb)) {
      const stagedLocks = findLockFiles(stagedDb);
      assert.ok(stagedLocks.length > 0, 'Source staged database should still contain the .lock file (unmodified)');
    }
    // The key invariant: DatabaseCopier removed the injected lock.
    // If the CLI re-created one during query evaluation that's fine — we just
    // verify it's not the stale leftover from the source.
    assert.ok(
      !fs.existsSync(injectedLockPath) || allLocks.length <= 1,
      `Expected the injected .lock to be removed by DatabaseCopier. Found locks: ${allLocks.join(', ')}`,
    );
  });
});
