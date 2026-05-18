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

  test('Toggling codeql-mcp.agents.enabled = false removes bundled dir; re-enabling restores it', async () => {
    const agentsDir = path.join(ext.extensionPath, 'agents');
    const cfg = vscode.workspace.getConfiguration('codeql-mcp');
    const chatCfg = vscode.workspace.getConfiguration('chat');

    // Save original values
    const originalEnabled = cfg.get<boolean>('agents.enabled', true);
    const originalLocations = chatCfg.get<Record<string, boolean>>('agentFilesLocations', {});

    try {
      // Disable agents
      await cfg.update('agents.enabled', false, vscode.ConfigurationTarget.Global);
      // Give the registrar time to react
      await new Promise((resolve) => setTimeout(resolve, 200));

      const locationsAfterDisable = vscode.workspace.getConfiguration('chat')
        .get<Record<string, boolean>>('agentFilesLocations', {});
      const containsBundledAfterDisable = Object.keys(locationsAfterDisable).some(
        (k) => path.normalize(k) === path.normalize(agentsDir),
      );
      assert.strictEqual(containsBundledAfterDisable, false, 'Bundled dir should be removed when disabled');

      // Re-enable
      await cfg.update('agents.enabled', true, vscode.ConfigurationTarget.Global);
      await new Promise((resolve) => setTimeout(resolve, 200));

      const locationsAfterEnable = vscode.workspace.getConfiguration('chat')
        .get<Record<string, boolean>>('agentFilesLocations', {});
      const containsBundledAfterEnable = Object.keys(locationsAfterEnable).some(
        (k) => path.normalize(k) === path.normalize(agentsDir),
      );
      assert.strictEqual(containsBundledAfterEnable, true, 'Bundled dir should be restored when re-enabled');
    } finally {
      // Restore original config
      await cfg.update('agents.enabled', originalEnabled, vscode.ConfigurationTarget.Global);
      await chatCfg.update('agentFilesLocations', originalLocations, vscode.ConfigurationTarget.Global);
    }
  });

  test('Setting codeql-mcp.additionalAgentDirs appends the dir', async () => {
    const tmpRoot = path.resolve(ext.extensionPath, '..', '..', '..', '.tmp');
    fs.mkdirSync(tmpRoot, { recursive: true });
    const tmpDir = fs.mkdtempSync(path.join(tmpRoot, 'codeql-mcp-test-'));
    const cfg = vscode.workspace.getConfiguration('codeql-mcp');
    const chatCfg = vscode.workspace.getConfiguration('chat');

    const originalAdditional = cfg.get<string[]>('additionalAgentDirs', []);
    const originalLocations = chatCfg.get<Record<string, boolean>>('agentFilesLocations', {});

    try {
      await cfg.update('additionalAgentDirs', [tmpDir], vscode.ConfigurationTarget.Global);
      await new Promise((resolve) => setTimeout(resolve, 200));

      const locations = vscode.workspace.getConfiguration('chat')
        .get<Record<string, boolean>>('agentFilesLocations', {});
      const containsTmpDir = Object.keys(locations).some(
        (k) => path.normalize(k) === path.normalize(tmpDir),
      );
      assert.ok(containsTmpDir, `tmpDir ${tmpDir} should be in agentFilesLocations`);
    } finally {
      await cfg.update('additionalAgentDirs', originalAdditional, vscode.ConfigurationTarget.Global);
      await chatCfg.update('agentFilesLocations', originalLocations, vscode.ConfigurationTarget.Global);
      try { fs.rmdirSync(tmpDir); } catch { /* ignore */ }
    }
  });
});
