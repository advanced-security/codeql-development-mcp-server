/**
 * Integration tests for built-in custom agents.
 *
 * These run inside the Extension Development Host with the REAL VS Code API.
 * They verify that the bundled `agents/` directory and its `.agent.md` files
 * exist on disk after activation, that `package.json` contributes those agents
 * via `contributes.chatAgents`, and — critically — that the extension does
 * NOT write its absolute bundled-agents path into `chat.agentFilesLocations`
 * (which VS Code rejects for non-prompt/instructions entries).
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

const EXTENSION_ID = 'advanced-security.vscode-codeql-development-mcp-server';

suite('Agents Integration Tests', () => {
  let ext: vscode.Extension<unknown>;

  suiteSetup(async () => {
    const found = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(found, `Extension ${EXTENSION_ID} not found`);
    ext = found;
    if (!ext.isActive) {
      await ext.activate();
    }
  });

  test('Extension agents/ directory exists', () => {
    const agentsDir = path.join(ext.extensionPath, 'agents');
    assert.ok(fs.existsSync(agentsDir), `agents/ dir should exist at ${agentsDir}`);
  });

  test('Activation does NOT write the absolute bundled-agents path to chat.agentFilesLocations', () => {
    // VS Code rejects absolute paths in chat.agentFilesLocations with
    // "Skipping invalid path (glob patterns and absolute paths not supported)".
    // Writing the bundled extension path there is therefore a no-op + pollutes
    // user settings. Agents must be registered via contributes.chatAgents
    // (or a future programmatic API), not via this setting.
    const agentsDir = path.join(ext.extensionPath, 'agents');
    const chatCfg = vscode.workspace.getConfiguration('chat');
    const raw = chatCfg.get<unknown>('agentFilesLocations');
    const keys: string[] = Array.isArray(raw)
      ? (raw as unknown[]).filter((x) => typeof x === 'string') as string[]
      : (raw && typeof raw === 'object' ? Object.keys(raw as Record<string, unknown>) : []);
    const polluted = keys.some(
      (k) => path.isAbsolute(k) && path.normalize(k) === path.normalize(agentsDir),
    );
    assert.strictEqual(
      polluted,
      false,
      `chat.agentFilesLocations should not contain the absolute bundled-agents path; got: ${JSON.stringify(keys)}`,
    );
  });

  test('package.json declares contributes.chatAgents for both bundled agents', () => {
    const pkgPath = path.join(ext.extensionPath, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const chatAgents = pkg.contributes?.chatAgents;
    assert.ok(Array.isArray(chatAgents) && chatAgents.length >= 2, 'contributes.chatAgents should have >=2 entries');
    const paths: string[] = chatAgents.map((e: { path: string }) => e.path);
    assert.ok(
      paths.some((p) => p.endsWith('ql-mcp-ext-query-developer.agent.md')),
      'chatAgents should reference ql-mcp-ext-query-developer.agent.md',
    );
    assert.ok(
      paths.some((p) => p.endsWith('ql-mcp-ext-workshop-author.agent.md')),
      'chatAgents should reference ql-mcp-ext-workshop-author.agent.md',
    );
    for (const p of paths) {
      assert.ok(fs.existsSync(path.join(ext.extensionPath, p)), `chatAgents path should exist on disk: ${p}`);
    }
  });

  test('ql-mcp-ext-query-developer.agent.md exists and has correct name frontmatter', () => {
    const agentPath = path.join(ext.extensionPath, 'agents', 'ql-mcp-ext-query-developer.agent.md');
    assert.ok(fs.existsSync(agentPath), `${agentPath} should exist`);
    const content = fs.readFileSync(agentPath, 'utf8');
    assert.ok(content.includes('name: ql-mcp-ext-query-developer'), 'Should contain name frontmatter');
    assert.ok(!content.includes('model:'), 'Should NOT contain model: key');
  });

  test('ql-mcp-ext-workshop-author.agent.md exists and has correct name frontmatter', () => {
    const agentPath = path.join(ext.extensionPath, 'agents', 'ql-mcp-ext-workshop-author.agent.md');
    assert.ok(fs.existsSync(agentPath), `${agentPath} should exist`);
    const content = fs.readFileSync(agentPath, 'utf8');
    assert.ok(content.includes('name: ql-mcp-ext-workshop-author'), 'Should contain name frontmatter');
    assert.ok(!content.includes('model:'), 'Should NOT contain model: key');
  });

  test('dist-customizations-manifest.json exists and lists expected files', () => {
    const manifestPath = path.join(ext.extensionPath, 'dist-customizations-manifest.json');
    assert.ok(fs.existsSync(manifestPath), 'dist-customizations-manifest.json should exist');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    assert.ok(Array.isArray(manifest.agents), 'manifest.agents should be an array');
    assert.ok(Array.isArray(manifest.prompts), 'manifest.prompts should be an array');
    assert.ok(Array.isArray(manifest.skills), 'manifest.skills should be an array');
    assert.ok(
      manifest.agents.some((a: string) => a.includes('ql-mcp-ext-query-developer')),
      'Manifest should list ql-mcp-ext-query-developer agent',
    );
  });

  test('codeql-mcp.showAgentsStatus command resolves without throwing', async () => {
    await assert.doesNotReject(
      vscode.commands.executeCommand('codeql-mcp.showAgentsStatus'),
      'showAgentsStatus command should not throw',
    );
  });

  test('extension API exposes getBundledAgentsStatus() with both bundled agent paths', async () => {
    // Regression guard: the showAgentsStatus command must source its data
    // from a helper that reads the manifest off disk (via context.extensionUri)
    // rather than from `context.extension.id`, which is fragile/non-portable.
    // The helper is exposed on the extension API so tests can introspect the
    // exact data the command surfaces without relying on output-channel scraping.
    const ext = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(ext, 'extension must be loadable for this assertion');
    const api = ext.exports as { getBundledAgentsStatus?: () => { bundledDir: string; contributedAgents: { path: string }[] } };
    assert.ok(
      typeof api.getBundledAgentsStatus === 'function',
      'ExtensionApi.getBundledAgentsStatus() should be exported',
    );

    const status = api.getBundledAgentsStatus!();
    assert.strictEqual(
      status.bundledDir,
      path.join(ext.extensionPath, 'agents'),
      'bundledDir should resolve via extensionUri',
    );
    assert.ok(Array.isArray(status.contributedAgents), 'contributedAgents should be an array');
    const paths = status.contributedAgents.map((e) => e.path);
    assert.ok(
      paths.some((p) => p.endsWith('ql-mcp-ext-query-developer.agent.md')),
      `contributedAgents should reference ql-mcp-ext-query-developer.agent.md; got: ${JSON.stringify(paths)}`,
    );
    assert.ok(
      paths.some((p) => p.endsWith('ql-mcp-ext-workshop-author.agent.md')),
      `contributedAgents should reference ql-mcp-ext-workshop-author.agent.md; got: ${JSON.stringify(paths)}`,
    );
  });

  test('package.json does NOT contribute chatPromptFiles (prompts come from the MCP server)', () => {
    // The extension intentionally does not bundle .prompt.md files. Workflow
    // prompts ship via the `ql-mcp` MCP server's `prompts/list` surface and
    // are exposed by Copilot Chat as slash commands when the server is
    // connected. Bundling extension-side duplicates created two slash-command
    // IDs for the same content (e.g. `/ql-mcp-ext-tdd-basic` and
    // `/ql_tdd_basic`); the extension now contributes only agents + skills
    // and points the agents at the MCP slash IDs.
    const pkgPath = path.join(ext.extensionPath, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    const promptFiles = pkg.contributes?.chatPromptFiles;
    if (promptFiles !== undefined) {
      assert.ok(
        Array.isArray(promptFiles) && promptFiles.length === 0,
        `contributes.chatPromptFiles should be absent or empty; got: ${JSON.stringify(promptFiles)}`,
      );
    }
  });

  test('Bundled prompts/ directory is not produced by the bundler', () => {
    const promptsDir = path.join(ext.extensionPath, 'prompts');
    assert.strictEqual(
      fs.existsSync(promptsDir),
      false,
      `${promptsDir} should not exist; the extension no longer bundles workflow prompts`,
    );
  });

  test('Every MCP prompt slash ID referenced by shipped agents maps to a real MCP prompt', () => {
    // Catches the failure mode where the agent prose names a slash command
    // that no longer exists in the MCP server (e.g. after a server-side
    // rename). The set of valid MCP prompt IDs is derived from the names
    // registered in server/src/prompts/workflow-prompts.ts.
    const VALID_MCP_PROMPT_IDS = new Set<string>([
      'check_for_duplicated_code',
      'compare_overlapping_alerts',
      'data_extension_development',
      'document_codeql_query',
      'explain_codeql_query',
      'find_overlapping_queries',
      'ql_lsp_iterative_development',
      'ql_tdd_advanced',
      'ql_tdd_basic',
      'run_query_and_summarize_false_positives',
      'sarif_rank_false_positives',
      'sarif_rank_true_positives',
      'test_driven_development',
      'tools_query_workflow',
      'workshop_creation_workflow',
    ]);

    const agentsDir = path.join(ext.extensionPath, 'agents');
    const agentFiles = fs
      .readdirSync(agentsDir)
      .filter((f) => f.endsWith('.agent.md'));
    assert.ok(agentFiles.length >= 2, 'expected at least 2 bundled agent files');

    // Find `/<prompt_id>` tokens inside backticks (the documented form).
    const slashRe = /`\/([a-z][a-z0-9_]+)`/g;
    const unknown: { agent: string; id: string }[] = [];
    const perAgentCount: Record<string, number> = {};
    for (const file of agentFiles) {
      perAgentCount[file] = 0;
      const content = fs.readFileSync(path.join(agentsDir, file), 'utf8');
      let m: RegExpExecArray | null;
      while ((m = slashRe.exec(content)) !== null) {
        perAgentCount[file]++;
        if (!VALID_MCP_PROMPT_IDS.has(m[1])) {
          unknown.push({ agent: file, id: m[1] });
        }
      }
    }
    for (const [file, count] of Object.entries(perAgentCount)) {
      assert.ok(
        count > 0,
        `${file} should reference at least one \`/<mcp_prompt_id>\` slash command; got 0`,
      );
    }
    assert.deepStrictEqual(
      unknown,
      [],
      `agent prose references unknown MCP prompt IDs: ${JSON.stringify(unknown)}`,
    );
  });
});
