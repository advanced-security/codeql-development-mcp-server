/**
 * Integration tests for built-in custom agents.
 *
 * These run inside the Extension Development Host with the REAL VS Code API.
 * They verify the agents/ directory is bundled, the .agent.md files exist,
 * and that chat.agentFilesLocations is updated correctly.
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
      paths.some((p) => p.endsWith('codeql-query-developer.agent.md')),
      'chatAgents should reference codeql-query-developer.agent.md',
    );
    assert.ok(
      paths.some((p) => p.endsWith('codeql-workshop-author.agent.md')),
      'chatAgents should reference codeql-workshop-author.agent.md',
    );
    for (const p of paths) {
      assert.ok(fs.existsSync(path.join(ext.extensionPath, p)), `chatAgents path should exist on disk: ${p}`);
    }
  });

  test('codeql-query-developer.agent.md exists and has correct name frontmatter', () => {
    const agentPath = path.join(ext.extensionPath, 'agents', 'codeql-query-developer.agent.md');
    assert.ok(fs.existsSync(agentPath), `${agentPath} should exist`);
    const content = fs.readFileSync(agentPath, 'utf8');
    assert.ok(content.includes('name: codeql-query-developer'), 'Should contain name frontmatter');
    assert.ok(!content.includes('model:'), 'Should NOT contain model: key');
  });

  test('codeql-workshop-author.agent.md exists and has correct name frontmatter', () => {
    const agentPath = path.join(ext.extensionPath, 'agents', 'codeql-workshop-author.agent.md');
    assert.ok(fs.existsSync(agentPath), `${agentPath} should exist`);
    const content = fs.readFileSync(agentPath, 'utf8');
    assert.ok(content.includes('name: codeql-workshop-author'), 'Should contain name frontmatter');
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
      manifest.agents.some((a: string) => a.includes('codeql-query-developer')),
      'Manifest should list codeql-query-developer agent',
    );
  });

  test('codeql-mcp.showAgentsStatus command resolves without throwing', async () => {
    await assert.doesNotReject(
      vscode.commands.executeCommand('codeql-mcp.showAgentsStatus'),
      'showAgentsStatus command should not throw',
    );
  });
});
