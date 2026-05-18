/**
 * Tests for bundle-customizations.js
 *
 * Runs the bundler's exported `runBundle()` function in an isolated temp
 * directory structure to verify default copying, manifest generation,
 * overlay support, and graceful handling of absent whitelisted files.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

// Resolve the actual script location
const __repoRoot = resolve(fileURLToPath(import.meta.url), '..', '..', '..', '..', '..');

// Import the bundler dynamically (ES module)
async function importBundler() {
  const bundlerPath = resolve(__repoRoot, 'extensions', 'vscode', 'scripts', 'bundle-customizations.js');
  return import(bundlerPath) as Promise<{ runBundle: (opts: { extensionRoot: string; customizationsDir?: string }) => Promise<{ agents: string[]; prompts: string[]; skills: string[] }> }>;
}

describe('bundle-customizations', () => {
  let tmp: string;

  beforeEach(() => {
    // Use project-local .tmp/ rather than process.cwd() to avoid polluting
    // the repo root and to match the convention used elsewhere in the
    // monorepo. .tmp/ is gitignored at the repo root.
    const tmpRoot = resolve(__repoRoot, '.tmp');
    mkdirSync(tmpRoot, { recursive: true });
    tmp = mkdtempSync(join(tmpRoot, 'bundle-test-'));
  });

  afterEach(() => {
    if (existsSync(tmp)) rmSync(tmp, { recursive: true, force: true });
  });

  it('copies agent files to agents/ output dir', async () => {
    const fakeDeep = join(tmp, 'fake-repo', 'extensions', 'vscode');
    mkdirSync(fakeDeep, { recursive: true });
    // Copy customizations into fakeDeep
    const customizationsDir = join(fakeDeep, 'customizations');
    const agentsDir = join(customizationsDir, 'agents');
    mkdirSync(agentsDir, { recursive: true });
    writeFileSync(
      join(agentsDir, 'codeql-query-developer.agent.md'),
      '---\nname: codeql-query-developer\n---\n',
    );
    // Config that references real repo paths
    writeFileSync(
      join(customizationsDir, 'bundle-customizations.config.js'),
      `export const prompts = ['ql-tdd-basic.prompt.md'];\nexport const skills = ['validate-ql-mcp-server-tools-queries', 'nonexistent-skill'];\n`,
    );

    // Create the server/src/prompts dir
    const serverPromptsDir = join(tmp, 'fake-repo', 'server', 'src', 'prompts');
    mkdirSync(serverPromptsDir, { recursive: true });
    // Copy a real prompt
    const realPrompt = join(__repoRoot, 'server', 'src', 'prompts', 'ql-tdd-basic.prompt.md');
    if (existsSync(realPrompt)) {
      const content = readFileSync(realPrompt, 'utf8');
      writeFileSync(join(serverPromptsDir, 'ql-tdd-basic.prompt.md'), content);
    }

    // Create skills dir
    const skillsDir = join(tmp, 'fake-repo', '.github', 'skills', 'validate-ql-mcp-server-tools-queries');
    mkdirSync(skillsDir, { recursive: true });
    const realSkill = join(__repoRoot, '.github', 'skills', 'validate-ql-mcp-server-tools-queries', 'SKILL.md');
    if (existsSync(realSkill)) {
      writeFileSync(join(skillsDir, 'SKILL.md'), readFileSync(realSkill, 'utf8'));
    }

    const { runBundle } = await importBundler();
    const manifest = await runBundle({ extensionRoot: fakeDeep });

    // Agents dir should exist
    expect(existsSync(join(fakeDeep, 'agents', 'codeql-query-developer.agent.md'))).toBe(true);

    // Prompt should be present
    expect(existsSync(join(fakeDeep, 'prompts', 'ql-tdd-basic.prompt.md'))).toBe(true);

    // Skill should be present
    expect(existsSync(join(fakeDeep, 'skills', 'validate-ql-mcp-server-tools-queries', 'SKILL.md'))).toBe(true);

    // Manifest emitted
    expect(existsSync(join(fakeDeep, 'dist-customizations-manifest.json'))).toBe(true);
    expect(manifest.agents).toContain('agents/codeql-query-developer.agent.md');
    expect(manifest.prompts).toContain('prompts/ql-tdd-basic.prompt.md');
    expect(manifest.skills).toContain('skills/validate-ql-mcp-server-tools-queries/SKILL.md');
  });

  it('warns but does not fail when whitelisted files are absent', async () => {
    const fakeDeep = join(tmp, 'fake-repo2', 'extensions', 'vscode');
    mkdirSync(join(fakeDeep, 'customizations', 'agents'), { recursive: true });
    writeFileSync(
      join(fakeDeep, 'customizations', 'bundle-customizations.config.js'),
      `export const prompts = ['nonexistent.prompt.md'];\nexport const skills = ['nonexistent-skill'];\n`,
    );

    const { runBundle } = await importBundler();

    // Should not throw
    await expect(runBundle({ extensionRoot: fakeDeep })).resolves.toBeDefined();

    const manifestPath = join(fakeDeep, 'dist-customizations-manifest.json');
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { agents: string[]; prompts: string[]; skills: string[] };
    // Nothing should have been copied for prompts/skills
    expect(manifest.prompts).toEqual([]);
    expect(manifest.skills).toEqual([]);
  });

  it('overlay: replaces existing file with warning and adds net-new files', async () => {
    const fakeDeep = join(tmp, 'fake-repo3', 'extensions', 'vscode');
    mkdirSync(join(fakeDeep, 'customizations', 'agents'), { recursive: true });
    writeFileSync(
      join(fakeDeep, 'customizations', 'agents', 'codeql-query-developer.agent.md'),
      '---\nname: codeql-query-developer\n---\n# Default\n',
    );
    writeFileSync(
      join(fakeDeep, 'customizations', 'bundle-customizations.config.js'),
      `export const prompts = [];\nexport const skills = [];\n`,
    );

    // Create an overlay directory
    const overlayDir = join(tmp, 'overlay');
    mkdirSync(join(overlayDir, 'agents'), { recursive: true });
    // Override the existing agent
    writeFileSync(
      join(overlayDir, 'agents', 'codeql-query-developer.agent.md'),
      '---\nname: codeql-query-developer\n---\n# Override\n',
    );
    // Add a net-new agent
    writeFileSync(
      join(overlayDir, 'agents', 'team-agent.agent.md'),
      '---\nname: team-agent\n---\n# Team\n',
    );

    const { runBundle } = await importBundler();

    // Capture console.warn calls
    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => { warnings.push(String(args[0])); };

    try {
      await runBundle({ extensionRoot: fakeDeep, customizationsDir: overlayDir });

      // Replacement should have warned
      expect(warnings.some((w) => w.includes('Overlay replaces bundled file'))).toBe(true);

      // Override file has new content
      const overrideContent = readFileSync(join(fakeDeep, 'agents', 'codeql-query-developer.agent.md'), 'utf8');
      expect(overrideContent).toContain('# Override');

      // Net-new file should exist
      expect(existsSync(join(fakeDeep, 'agents', 'team-agent.agent.md'))).toBe(true);
    } finally {
      console.warn = originalWarn;
    }
  });
});
