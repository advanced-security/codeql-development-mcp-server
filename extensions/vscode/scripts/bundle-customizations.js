/**
 * bundle-customizations.js
 *
 * Copies bundled custom agents, whitelisted prompts, and whitelisted skills
 * into the extension's output directories so the VSIX is self-contained.
 *
 * Run via: npm run bundle:customizations
 * Called automatically by: vscode:prepublish
 *
 * Resulting layout inside extensions/vscode/:
 *   agents/                            (bundled .agent.md files)
 *   prompts/                           (whitelisted prompt files)
 *   skills/<name>/SKILL.md             (whitelisted skill files)
 *   dist-customizations-manifest.json  (manifest of bundled files)
 *
 * Overlay support:
 *   --customizations-dir=<path>  or  CODEQL_MCP_CUSTOMIZATIONS_DIR=<path>
 *   After the defaults are copied, files from <path>/{agents,prompts,skills}
 *   are merged in, replacing any colliding files with a warning.
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { basename, dirname, join, normalize, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Core bundle function — separated so tests can call it directly.
 * @param {object} opts
 * @param {string} opts.extensionRoot   Absolute path to extensions/vscode/
 * @param {string|undefined} opts.customizationsDir  Optional overlay directory
 */
export async function runBundle({ extensionRoot, customizationsDir }) {
  const repoRoot = resolve(extensionRoot, '..', '..');
  const serverPromptsDir = join(repoRoot, 'server', 'src', 'prompts');
  const skillsRoot = join(repoRoot, '.github', 'skills');
  const customizationsSourceDir = join(extensionRoot, 'customizations');

  const targetAgentsDir = join(extensionRoot, 'agents');
  const targetPromptsDir = join(extensionRoot, 'prompts');
  const targetSkillsDir = join(extensionRoot, 'skills');

  // Load whitelist config
  const configPath = join(customizationsSourceDir, 'bundle-customizations.config.js');
  const { prompts: promptWhitelist, skills: skillWhitelist } = await import(configPath);

  // Clean previous outputs
  for (const dir of [targetAgentsDir, targetPromptsDir, targetSkillsDir]) {
    if (existsSync(dir)) {
      rmSync(dir, { recursive: true, force: true });
    }
    mkdirSync(dir, { recursive: true });
  }

  // Track bundled files for manifest
  const manifest = { agents: [], prompts: [], skills: [] };

  // --- Copy agents ---
  const agentsSourceDir = join(customizationsSourceDir, 'agents');
  if (existsSync(agentsSourceDir)) {
    for (const file of readdirSync(agentsSourceDir)) {
      if (!file.endsWith('.agent.md')) continue;
      const src = join(agentsSourceDir, file);
      const dst = join(targetAgentsDir, file);
      copyFileSync(src, dst);
      manifest.agents.push(`agents/${file}`);
      console.log(`✅ Copied agent: ${file}`);
    }
  }

  // --- Copy whitelisted prompts ---
  for (const promptName of promptWhitelist) {
    const src = join(serverPromptsDir, promptName);
    if (!existsSync(src)) {
      console.warn(`⚠️  Prompt not found, skipping: ${promptName}`);
      continue;
    }
    const dst = join(targetPromptsDir, promptName);
    copyFileSync(src, dst);
    manifest.prompts.push(`prompts/${promptName}`);
    console.log(`✅ Copied prompt: ${promptName}`);
  }

  // --- Copy whitelisted skills ---
  for (const skillName of skillWhitelist) {
    const src = join(skillsRoot, skillName, 'SKILL.md');
    if (!existsSync(src)) {
      console.warn(`⚠️  Skill not found, skipping: ${skillName}/SKILL.md`);
      continue;
    }
    const dstDir = join(targetSkillsDir, skillName);
    mkdirSync(dstDir, { recursive: true });
    const dst = join(dstDir, 'SKILL.md');
    copyFileSync(src, dst);
    manifest.skills.push(`skills/${skillName}/SKILL.md`);
    console.log(`✅ Copied skill: ${skillName}/SKILL.md`);
  }

  // --- Apply overlay (if specified) ---
  if (customizationsDir) {
    const overlayRoot = resolve(customizationsDir);
    console.log(`\n🔀 Applying overlay from: ${overlayRoot}`);

    for (const category of ['agents', 'prompts', 'skills']) {
      const overlayDir = join(overlayRoot, category);
      if (!existsSync(overlayDir)) continue;

      applyOverlayDir(overlayDir, join(extensionRoot, category), category, manifest);
    }
  }

  // --- Write manifest ---
  const manifestPath = join(extensionRoot, 'dist-customizations-manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log(`\n📋 Manifest written: dist-customizations-manifest.json`);

  console.log('');
  console.log('🎉 Customizations bundle complete.');
  console.log(`   Agents : ${manifest.agents.length}`);
  console.log(`   Prompts: ${manifest.prompts.length}`);
  console.log(`   Skills : ${manifest.skills.length}`);

  return manifest;
}

/**
 * Recursively copies files from overlayDir into targetDir.
 * Warns when a file already exists (collision).
 */
function applyOverlayDir(overlayDir, targetDir, categoryKey, manifest) {
  for (const entry of readdirSync(overlayDir, { withFileTypes: true })) {
    const srcPath = join(overlayDir, entry.name);
    const dstPath = join(targetDir, entry.name);

    if (entry.isDirectory()) {
      mkdirSync(dstPath, { recursive: true });
      applyOverlayDir(srcPath, dstPath, categoryKey, manifest);
      continue;
    }

    const alreadyExists = existsSync(dstPath);
    if (alreadyExists) {
      console.warn(`⚠️  Overlay replaces bundled file: ${normalize(dstPath)}`);
    }

    mkdirSync(dirname(dstPath), { recursive: true });
    copyFileSync(srcPath, dstPath);

    // Build a relative manifest key: e.g. "agents/foo.agent.md"
    const relKey = `${categoryKey}/${entry.name}`;
    if (!alreadyExists && Array.isArray(manifest[categoryKey])) {
      manifest[categoryKey].push(relKey);
    }

    console.log(`   ${alreadyExists ? '↩️  Replaced' : '➕  Added'}: ${relKey}`);
  }
}

// --- CLI entry point ---
if (import.meta.url === `file://${process.argv[1]}`) {
  // Parse --customizations-dir=PATH or --customizations-dir PATH
  let customizationsDir =
    process.env.CODEQL_MCP_CUSTOMIZATIONS_DIR ?? undefined;

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith('--customizations-dir=')) {
      customizationsDir = arg.slice('--customizations-dir='.length);
    } else if (arg === '--customizations-dir' && process.argv[i + 1]) {
      customizationsDir = process.argv[++i];
    }
  }

  const extensionRoot = resolve(__dirname, '..');
  runBundle({ extensionRoot, customizationsDir }).catch((err) => {
    console.error('❌ bundle-customizations failed:', err);
    process.exit(1);
  });
}
