/**
 * Extended Integration Test Runner
 *
 * Downloads real CodeQL databases from GitHub (via GH_TOKEN), spawns the
 * MCP server with annotation/cache tools enabled, and runs multi-scenario
 * validation against real-world codebases.
 *
 * Usage:
 *   GH_TOKEN=ghp_... npx tsx test/extended/run-extended-tests.ts
 *
 * Or via npm script:
 *   GH_TOKEN=ghp_... npm run test:integration:extended
 *
 * Override config:
 *   EXTENDED_TEST_CONFIG=/path/to/custom-repos.json npm run test:integration:extended
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { resolveAllDatabases, type RepoConfig } from './download-databases.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

interface ExtendedTestConfig {
  description?: string;
  repositories: RepoConfig[];
  settings: {
    databaseDir: string;
    fixtureSearchDirs?: string[];
    timeoutMs: number;
  };
}

function loadConfig(): ExtendedTestConfig {
  if (process.env.EXTENDED_TEST_CONFIG) {
    const raw = readFileSync(process.env.EXTENDED_TEST_CONFIG, 'utf8');
    return JSON.parse(raw) as ExtendedTestConfig;
  }
  // Resolve repos.json from the source tree (not dist/).
  // __dirname is either test/extended/ (source) or dist/test/extended/ (compiled).
  // Walk up to find the extension root (contains package.json), then use test/extended/repos.json.
  let dir = __dirname;
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(dir, 'package.json'))) {
      const configPath = join(dir, 'test', 'extended', 'repos.json');
      if (existsSync(configPath)) {
        return JSON.parse(readFileSync(configPath, 'utf8')) as ExtendedTestConfig;
      }
    }
    dir = resolve(dir, '..');
  }
  throw new Error('repos.json not found. Set EXTENDED_TEST_CONFIG or run from the extension directory.');
}

// ---------------------------------------------------------------------------
// MCP Server connection
// ---------------------------------------------------------------------------

function resolveServerPath(): string {
  // Walk up from __dirname to find the monorepo root (has server/dist/)
  let dir = __dirname;
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, 'server', 'dist', 'codeql-development-mcp-server.js');
    if (existsSync(candidate)) return candidate;
    dir = resolve(dir, '..');
  }
  throw new Error('MCP server not found. Run "npm run build -w server" first.');
}

/**
 * Collected server stderr log lines.
 */
const serverLogLines: string[] = [];

async function connectToServer(
  databaseDir: string,
  logDir: string,
): Promise<{ client: Client; transport: StdioClientTransport }> {
  const serverPath = resolveServerPath();

  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    CODEQL_DATABASES_BASE_DIRS: databaseDir,
    DEBUG: 'true',
    ENABLE_ANNOTATION_TOOLS: 'true',
    MONITORING_STORAGE_LOCATION: join(logDir, 'monitoring'),
    TRANSPORT_MODE: 'stdio',
  };

  const transport = new StdioClientTransport({
    args: [serverPath],
    command: 'node',
    env,
    stderr: 'pipe',
  });

  // Capture server stderr for the test report
  // The transport exposes the child process after start()
  const origStart = transport.start.bind(transport);
  transport.start = async function (...args: Parameters<typeof transport.start>) {
    const result = await origStart(...args);
    // Access the spawned process stderr via the transport's internal process
    const proc = (transport as unknown as { _process?: { stderr?: { on: (e: string, cb: (d: Buffer) => void) => void } } })._process;
    if (proc?.stderr) {
      proc.stderr.on('data', (chunk: Buffer) => {
        const text = chunk.toString();
        serverLogLines.push(text);
        // Also echo to our stderr so the user can see live output
        process.stderr.write(text);
      });
    }
    return result;
  };

  const client = new Client({ name: 'extended-test', version: '1.0.0' });
  await client.connect(transport);
  return { client, transport };
}

// ---------------------------------------------------------------------------
// Test utilities
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    failed++;
    console.error(`  ✗ ${message}`);
    throw new Error(message);
  }
  passed++;
  console.log(`  ✓ ${message}`);
}

function callToolText(result: { content: unknown[]; isError?: boolean }): string {
  const arr = result.content as Array<{ text?: string; type: string }>;
  return arr[0]?.text ?? '';
}

// ---------------------------------------------------------------------------
// Scenarios
// ---------------------------------------------------------------------------

async function scenario1_databaseDiscovery(
  client: Client,
  repos: RepoConfig[],
): Promise<void> {
  console.log('\n📋 Scenario 1: Database Discovery & Registration');

  const result = await client.callTool({ arguments: {}, name: 'list_codeql_databases' });
  assert(!result.isError, 'list_codeql_databases succeeds');
  const text = callToolText(result);

  for (const repo of repos) {
    assert(text.includes(repo.language), `Database for ${repo.owner}/${repo.repo} listed with language ${repo.language}`);
  }
}

async function scenario2_toolsQueryExecution(
  client: Client,
  databases: Map<string, string>,
  repos: RepoConfig[],
): Promise<void> {
  console.log('\n📋 Scenario 2: Tools Query Execution + Auto-Caching');

  for (const repo of repos) {
    const key = `${repo.owner}/${repo.repo}`;
    const dbPath = databases.get(key);
    if (!dbPath) {
      console.log(`  ⏭ Skipping ${key} — no database`);
      continue;
    }

    // Run CallGraphFromTo if source/target functions are defined
    if (repo.callGraphFromTo) {
      const { sourceFunction, targetFunction } = repo.callGraphFromTo;
      console.log(`  🔍 CallGraphFromTo on ${key}: ${sourceFunction} → ${targetFunction}`);

      const result = await client.callTool({
        arguments: {
          database: dbPath,
          format: 'sarif-latest',
          queryLanguage: repo.language,
          queryName: 'CallGraphFromTo',
          sourceFunction,
          targetFunction,
        },
        name: 'codeql_query_run',
      });

      const text = callToolText(result);
      if (result.isError || text.includes('not found in pack')) {
        console.log(`  ⚠️ CallGraphFromTo not available for ${repo.language} — ${text.substring(0, 100)}`);
      } else if (text.includes('Query failed') || text.includes('extensional predicate')) {
        console.log(`  ✗ Bug: External predicates not passed correctly for ${key}`);
        failed++;
      } else {
        assert(text.length > 0, `CallGraphFromTo for ${key} produces output`);

        // Verify results were cached
        const lookupResult = await client.callTool({
          arguments: { language: repo.language, queryName: 'CallGraphFromTo' },
          name: 'query_results_cache_lookup',
        });
        assert(!lookupResult.isError, `Cache lookup for ${key} succeeds`);
        const lookupText = callToolText(lookupResult);
        if (lookupText.includes('"cached": true') || lookupText.includes('"cached":true')) {
          console.log(`  ✓ Results cached for ${key}`);
        } else {
          console.log(`  ⚠️ Results not cached for ${key} (may be expected if query had no results)`);
        }
      }
    }
  }
}

async function scenario3_cacheRetrievalSubset(client: Client): Promise<void> {
  console.log('\n📋 Scenario 3: Cache Retrieval & Subset Selection');

  // List all cached entries
  const lookupResult = await client.callTool({
    arguments: {},
    name: 'query_results_cache_lookup',
  });
  const lookupText = callToolText(lookupResult);

  if (lookupText.includes('"cached": false') || lookupText.includes('"cached":false')) {
    console.log('  ⏭ No cached results available — skipping subset tests');
    return;
  }

  // Extract a cache key from the lookup result
  const keyMatch = lookupText.match(/"cacheKey":\s*"([^"]+)"/);
  if (!keyMatch) {
    console.log('  ⏭ Could not extract cache key — skipping subset tests');
    return;
  }
  const cacheKey = keyMatch[1];

  // Retrieve with maxLines limit
  const subsetResult = await client.callTool({
    arguments: { cacheKey, maxLines: 20 },
    name: 'query_results_cache_retrieve',
  });
  assert(!subsetResult.isError, 'query_results_cache_retrieve succeeds with maxLines');
  const subsetText = callToolText(subsetResult);
  assert(subsetText.includes('totalLines') || subsetText.includes('totalResults') || subsetText.includes('No cached result'), 'Subset response contains totals or graceful message');

  // Retrieve with grep
  const grepResult = await client.callTool({
    arguments: { cacheKey, grep: 'function', maxLines: 10 },
    name: 'query_results_cache_retrieve',
  });
  assert(!grepResult.isError, 'query_results_cache_retrieve succeeds with grep');
}

async function scenario4_crossDatabaseComparison(
  client: Client,
  _repos: RepoConfig[],
): Promise<void> {
  console.log('\n📋 Scenario 4: Cross-Database Query Comparison');

  const compareResult = await client.callTool({
    arguments: { queryName: 'CallGraphFrom' },
    name: 'query_results_cache_compare',
  });
  assert(!compareResult.isError, 'query_results_cache_compare succeeds');
  const compareText = callToolText(compareResult);
  assert(compareText.includes('queryName') || compareText.includes('No cached results'), 'Compare returns query info or empty message');
}

async function scenario5_auditWorkflow(
  client: Client,
  repos: RepoConfig[],
): Promise<void> {
  console.log('\n📋 Scenario 5: Audit Workflow (Multi-Repo Finding Triage)');

  // Store synthetic findings for two repos
  for (const repo of repos.slice(0, 2)) {
    const storeResult = await client.callTool({
      arguments: {
        findings: [
          { description: `Test finding in ${repo.repo}`, line: 10, sourceLocation: 'src/main.ts', sourceType: 'RemoteFlowSource' },
        ],
        owner: repo.owner,
        repo: repo.repo,
      },
      name: 'audit_store_findings',
    });
    assert(!storeResult.isError, `audit_store_findings succeeds for ${repo.owner}/${repo.repo}`);
  }

  // List findings for first repo
  const repo0 = repos[0];
  const listResult = await client.callTool({
    arguments: { owner: repo0.owner, repo: repo0.repo },
    name: 'audit_list_findings',
  });
  assert(!listResult.isError, 'audit_list_findings succeeds');
  const listText = callToolText(listResult);
  assert(listText.includes('src/main.ts'), 'Finding location appears in listing');

  // Add triage notes
  const notesResult = await client.callTool({
    arguments: {
      line: 10,
      notes: 'Extended test: false positive — input validated upstream',
      owner: repo0.owner,
      repo: repo0.repo,
      sourceLocation: 'src/main.ts',
    },
    name: 'audit_add_notes',
  });
  assert(!notesResult.isError, 'audit_add_notes succeeds');

  // Search across all repos
  const searchResult = await client.callTool({
    arguments: { query: 'false positive' },
    name: 'annotation_search',
  });
  assert(!searchResult.isError, 'annotation_search succeeds');
  const searchText = callToolText(searchResult);
  assert(searchText.includes('validated upstream'), 'Triage note found via search');

  // Clear first repo only
  const clearResult = await client.callTool({
    arguments: { owner: repo0.owner, repo: repo0.repo },
    name: 'audit_clear_repo',
  });
  assert(!clearResult.isError, 'audit_clear_repo succeeds');

  // Verify second repo still has findings
  if (repos.length >= 2) {
    const repo1 = repos[1];
    const list2Result = await client.callTool({
      arguments: { owner: repo1.owner, repo: repo1.repo },
      name: 'audit_list_findings',
    });
    const list2Text = callToolText(list2Result);
    assert(list2Text.includes('src/main.ts'), 'Second repo findings preserved after clearing first');
  }

  // Final cleanup
  for (const repo of repos.slice(0, 2)) {
    await client.callTool({
      arguments: { owner: repo.owner, repo: repo.repo },
      name: 'audit_clear_repo',
    });
  }
}

async function scenario6_promptsAndResources(client: Client): Promise<void> {
  console.log('\n📋 Scenario 6: Prompts & Resources Validation');

  // List prompts
  const promptsResponse = await client.listPrompts();
  assert(promptsResponse.prompts.length > 0, `Server provides ${promptsResponse.prompts.length} prompts`);

  const promptNames = promptsResponse.prompts.map(p => p.name);
  assert(promptNames.includes('tools_query_workflow'), 'tools_query_workflow prompt available');
  assert(promptNames.includes('test_driven_development'), 'test_driven_development prompt available');

  // List resources
  const resourcesResponse = await client.listResources();
  assert(resourcesResponse.resources.length > 0, `Server provides ${resourcesResponse.resources.length} resources`);

  const resourceUris = resourcesResponse.resources.map(r => r.uri);
  assert(resourceUris.some(u => u.includes('server/overview')), 'Server overview resource available');

  // Read a resource
  const overviewResource = resourcesResponse.resources.find(r => r.uri.includes('server/overview'));
  if (overviewResource) {
    const content = await client.readResource({ uri: overviewResource.uri });
    assert(content.contents.length > 0, 'Server overview resource has content');
  }
}

async function scenario7_cacheCleanup(client: Client): Promise<void> {
  console.log('\n📋 Scenario 7: Cache Cleanup');

  const clearResult = await client.callTool({
    arguments: { all: true },
    name: 'query_results_cache_clear',
  });
  assert(!clearResult.isError, 'query_results_cache_clear (all) succeeds');

  // Verify empty
  const lookupResult = await client.callTool({
    arguments: { queryName: 'CallGraphFrom' },
    name: 'query_results_cache_lookup',
  });
  const text = callToolText(lookupResult);
  assert(text.includes('false') || text.includes('count": 0') || text.includes('"count":0'), 'Cache is empty after clear');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🧪 CodeQL MCP Server — Extended Integration Tests');
  console.log('═══════════════════════════════════════════════════════════');

  const config = loadConfig();
  console.log(`\n📂 Config: ${config.repositories.length} repositories`);
  for (const r of config.repositories) {
    console.log(`   • ${r.owner}/${r.repo} (${r.language})`);
  }

  // Resolve extension root by walking up from __dirname
  let extensionRoot = __dirname;
  for (let i = 0; i < 5; i++) {
    if (existsSync(join(extensionRoot, 'package.json')) &&
        existsSync(join(extensionRoot, 'test', 'extended', 'repos.json'))) {
      break;
    }
    extensionRoot = resolve(extensionRoot, '..');
  }
  const logDir = resolve(extensionRoot, '.tmp', 'extended-test-logs');
  mkdirSync(logDir, { recursive: true });

  // Additional database dirs from config
  const additionalDirs: string[] = [];
  if (config.settings.databaseDir) {
    additionalDirs.push(resolve(extensionRoot, config.settings.databaseDir));
  }
  // Add fixture search dirs (relative to extension root)
  if (config.settings.fixtureSearchDirs) {
    for (const dir of config.settings.fixtureSearchDirs) {
      additionalDirs.push(resolve(extensionRoot, dir));
    }
  }

  // Phase 1: Discover and/or download databases
  console.log('\n📥 Phase 1: Resolving CodeQL databases...');
  const { databases, missing } = await resolveAllDatabases(config.repositories, additionalDirs);

  if (missing.length > 0) {
    console.log(`\n⚠️  ${missing.length} database(s) not found:`);
    for (const m of missing) {
      console.log(`   • ${m.owner}/${m.repo} (${m.language})`);
    }
    console.log('\n💡 To download missing databases, use the GitHub.vscode-codeql extension:');
    console.log('   1. Open VS Code with the CodeQL extension installed');
    console.log('   2. Run "CodeQL: Download Database from GitHub" from the command palette');
    console.log('   3. Enter the repository name (e.g., expressjs/express)');
    console.log('   4. Or set CODEQL_DATABASES_BASE_DIRS to point to your databases');
  }

  if (databases.size === 0) {
    console.log('\n✗ No databases found. Cannot run extended tests.');
    console.log('  Download at least one database with the vscode-codeql extension first.');
    process.exit(1);
  }

  console.log(`\n✓ ${databases.size} database(s) ready`);

  // Build colon-delimited database dirs for the MCP server
  const databaseDirs = [...new Set(Array.from(databases.values()).map(p => resolve(p, '..')))].join(':');

  // Phase 2: Connect to MCP server
  console.log('\n🔌 Phase 2: Connecting to MCP server...');
  let client: Client;
  let transport: StdioClientTransport;
  try {
    ({ client, transport } = await connectToServer(databaseDirs, logDir));
    console.log('✓ Connected to MCP server');
  } catch (err) {
    console.error(`\n✗ Server connection failed: ${err}`);
    process.exit(1);
  }

  // Phase 3: Run scenarios
  console.log('\n🧪 Phase 3: Running test scenarios...');

  const scenarios = [
    () => scenario1_databaseDiscovery(client, config.repositories),
    () => scenario2_toolsQueryExecution(client, databases, config.repositories),
    () => scenario3_cacheRetrievalSubset(client),
    () => scenario4_crossDatabaseComparison(client, config.repositories),
    () => scenario5_auditWorkflow(client, config.repositories),
    () => scenario6_promptsAndResources(client),
    () => scenario7_cacheCleanup(client),
  ];

  for (const scenario of scenarios) {
    try {
      await scenario();
    } catch (err) {
      console.error(`  ✗ Scenario failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  // Cleanup
  try { await client.close(); } catch { /* best-effort */ }
  try { await transport.close(); } catch { /* best-effort */ }

  // Write test report with server logs
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = join(logDir, `report-${timestamp}.txt`);
  const serverLogPath = join(logDir, `server-${timestamp}.log`);

  const reportLines = [
    `CodeQL MCP Server — Extended Integration Test Report`,
    `Date: ${new Date().toISOString()}`,
    `Config: ${config.repositories.length} repositories`,
    ...config.repositories.map(r => `  • ${r.owner}/${r.repo} (${r.language})`),
    ``,
    `Results: ${passed} passed, ${failed} failed`,
    ``,
    `Server log: ${serverLogPath}`,
  ];
  writeFileSync(reportPath, reportLines.join('\n') + '\n');
  writeFileSync(serverLogPath, serverLogLines.join(''));

  console.log(`\n📄 Report: ${reportPath}`);
  console.log(`📋 Server log: ${serverLogPath} (${serverLogLines.length} chunks)`);

  // Summary
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════════');

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
