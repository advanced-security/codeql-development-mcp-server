/**
 * Tests for bundle-customizations.js
 *
 * Runs the bundler's exported `runBundle()` function in an isolated temp
 * directory structure to verify default copying, manifest generation,
 * overlay support, and graceful handling of absent allowlisted files.
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
import { fileURLToPath, pathToFileURL } from 'url';

// Resolve the actual script location
const __repoRoot = resolve(fileURLToPath(import.meta.url), '..', '..', '..', '..', '..');

// Import the bundler dynamically. Use a `file://` URL rather than a raw
// filesystem path so the import resolves on Windows (where absolute paths
// like `C:\\…\\bundle-customizations.js` are not valid ESM specifiers).
async function importBundler() {
  const bundlerPath = resolve(__repoRoot, 'extensions', 'vscode', 'scripts', 'bundle-customizations.js');
  return import(pathToFileURL(bundlerPath).href) as Promise<{ runBundle: (opts: { extensionRoot: string; customizationsDir?: string }) => Promise<{ agents: string[]; prompts: string[]; skills: string[] }> }>;
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

  it('warns but does not fail when allowlisted files are absent', async () => {
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

  it('bundling the real source tree produces no broken relative markdown links', async () => {
    // Run the real bundler against the real source tree into a temp output
    // dir, then walk every bundled `.md` file and assert that each relative
    // markdown link resolves to a file inside the output dir.
    //
    // Performance: only copy the inputs the bundler will actually consume
    // (the customizations source dir, the allowlisted prompt files, and the
    // allowlisted skill directories). Copying the entire `.github/skills/`
    // tree would pull in every example workshop fixture on every test run.
    const fakeRoot = join(tmp, 'real-bundle');
    mkdirSync(fakeRoot, { recursive: true });
    const realExtensionRoot = resolve(__repoRoot, 'extensions', 'vscode');
    const fakeExt = join(fakeRoot, 'extensions', 'vscode');
    mkdirSync(fakeExt, { recursive: true });
    // Symlinks would be simpler but Windows-unfriendly — recursively copy the
    // small inputs we need.
    copyTree(join(realExtensionRoot, 'customizations'), join(fakeExt, 'customizations'));

    // Load the actual allowlist so the staging set tracks the bundler's
    // real inputs without duplicating the list in the test.
    const { prompts: allowedPrompts, skills: allowedSkills } = await import(
      pathToFileURL(
        resolve(realExtensionRoot, 'customizations', 'bundle-customizations.config.js'),
      ).href
    ) as {
      prompts: ReadonlyArray<string | { src: string; dst?: string }>;
      skills: ReadonlyArray<string | { src: string; dst?: string }>;
    };
    const srcOf = (e: string | { src: string; dst?: string }) => (typeof e === 'string' ? e : e.src);

    const fakePromptsDir = join(fakeRoot, 'server', 'src', 'prompts');
    mkdirSync(fakePromptsDir, { recursive: true });
    for (const entry of allowedPrompts) {
      const name = srcOf(entry);
      const src = resolve(__repoRoot, 'server', 'src', 'prompts', name);
      if (existsSync(src)) writeFileSync(join(fakePromptsDir, name), readFileSync(src));
    }

    const fakeSkillsRoot = join(fakeRoot, '.github', 'skills');
    mkdirSync(fakeSkillsRoot, { recursive: true });
    for (const entry of allowedSkills) {
      const name = srcOf(entry);
      const src = resolve(__repoRoot, '.github', 'skills', name);
      if (existsSync(src)) copyTree(src, join(fakeSkillsRoot, name));
    }

    const { runBundle } = await importBundler();
    await runBundle({ extensionRoot: fakeExt });

    const broken: { file: string; line: number; target: string }[] = [];
    for (const mdFile of walkMd(fakeExt)) {
      // Only inspect files under the bundled chat-customization output dirs.
      const rel = mdFile.slice(fakeExt.length + 1);
      if (
        !rel.startsWith('agents/') &&
        !rel.startsWith('prompts/') &&
        !rel.startsWith('skills/')
      ) {
        continue;
      }
      for (const link of relativeLinksIn(mdFile)) {
        const resolved = resolve(join(mdFile, '..'), link.target.replace(/[?#].*$/, ''));
        const insideBundle = !path_relative(fakeExt, resolved).startsWith('..');
        if (!insideBundle || !existsSync(resolved)) {
          broken.push({ file: rel, line: link.line, target: link.target });
        }
      }
    }

    if (broken.length > 0) {
      const summary = broken
        .map((b) => `  ${b.file}:${b.line}  →  ${b.target}`)
        .join('\n');
      throw new Error(`Found ${broken.length} broken relative markdown link(s):\n${summary}`);
    }
  });
});

// --- helpers for the link-validity unit test ---

import { relative as path_relative } from 'path';
import { readdirSync as _readdirSync } from 'fs';

function copyTree(src: string, dst: string): void {
  if (!existsSync(src)) return;
  mkdirSync(dst, { recursive: true });
  for (const entry of _readdirSync(src, { withFileTypes: true })) {
    const s = join(src, entry.name);
    const d = join(dst, entry.name);
    if (entry.isDirectory()) copyTree(s, d);
    else if (entry.isFile()) writeFileSync(d, readFileSync(s));
  }
}

function* walkMd(root: string): Generator<string> {
  if (!existsSync(root)) return;
  for (const entry of _readdirSync(root, { withFileTypes: true })) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) yield* walkMd(full);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) yield full;
  }
}

interface RelLink {
  line: number;
  target: string;
}

function relativeLinksIn(filePath: string): RelLink[] {
  const text = readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  const out: RelLink[] = [];
  const linkRe = /\[(?:[^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
  let inFence = false;
  let marker = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const f = /^(\s*)(`{3,}|~{3,})/.exec(line);
    if (f) {
      const mk = f[2];
      if (!inFence) { inFence = true; marker = mk; continue; }
      if (mk.startsWith(marker[0]) && mk.length >= marker.length) { inFence = false; marker = ''; continue; }
    }
    if (inFence) continue;
    linkRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(line)) !== null) {
      const raw = m[1];
      const stripped = raw.replace(/[?#].*$/, '');
      if (!stripped) continue;
      if (/^[a-z][a-z0-9+.-]*:/i.test(stripped)) continue;
      if (stripped.startsWith('//')) continue;
      out.push({ line: i + 1, target: raw });
    }
  }
  return out;
}
