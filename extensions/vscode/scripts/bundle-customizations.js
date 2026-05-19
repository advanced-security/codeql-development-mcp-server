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
  readFileSync,
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

  // --- Copy whitelisted prompts (rename on copy per { src, dst }) ---
  for (const entry of promptWhitelist) {
    const { src: srcName, dst: dstName } = normalizeRenameEntry(entry);
    const src = join(serverPromptsDir, srcName);
    if (!existsSync(src)) {
      console.warn(`⚠️  Prompt not found, skipping: ${srcName}`);
      continue;
    }
    const dst = join(targetPromptsDir, dstName);
    copyFileSync(src, dst);
    manifest.prompts.push(`prompts/${dstName}`);
    if (srcName === dstName) {
      console.log(`✅ Copied prompt: ${dstName}`);
    } else {
      console.log(`✅ Copied prompt: ${srcName} → ${dstName}`);
    }
  }

  // --- Copy whitelisted skills (recursive: SKILL.md + any supporting files) ---
  // Each entry may rename the skill dir via { src, dst }. The bundled
  // SKILL.md's frontmatter `name:` is rewritten to match `dst` so VS Code's
  // skill registry resolves it under the new name.
  // Build a rename map first so that intra-skill cross-references (e.g.
  // `[label](../<old-skill-name>/SKILL.md)`) can be rewritten to point at
  // the new bundled directories during copy.
  const skillRenameMap = new Map();
  for (const entry of skillWhitelist) {
    const { src, dst } = normalizeRenameEntry(entry);
    if (src !== dst) skillRenameMap.set(src, dst);
  }

  for (const entry of skillWhitelist) {
    const { src: srcName, dst: dstName } = normalizeRenameEntry(entry);
    const srcDir = join(skillsRoot, srcName);
    const skillMd = join(srcDir, 'SKILL.md');
    if (!existsSync(skillMd)) {
      console.warn(`⚠️  Skill not found, skipping: ${srcName}/SKILL.md`);
      continue;
    }
    const dstDir = join(targetSkillsDir, dstName);
    mkdirSync(dstDir, { recursive: true });
    copyDirRecursive(srcDir, dstDir);
    if (srcName !== dstName) {
      rewriteSkillFrontmatterName(join(dstDir, 'SKILL.md'), dstName);
    }
    if (skillRenameMap.size > 0) {
      rewriteSiblingSkillRefs(dstDir, skillRenameMap);
    }
    for (const rel of listFilesRecursive(dstDir)) {
      manifest.skills.push(`skills/${dstName}/${rel}`);
    }
    if (srcName === dstName) {
      console.log(`✅ Copied skill: ${dstName}/ (recursive)`);
    } else {
      console.log(`✅ Copied skill: ${srcName}/ → ${dstName}/ (recursive)`);
    }
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
 *
 * subPath tracks the path relative to the category root so the manifest key
 * preserves the directory structure (e.g. "skills/foo/SKILL.md", not
 * "skills/SKILL.md").
 */
function applyOverlayDir(overlayDir, targetDir, categoryKey, manifest, subPath = '') {
  for (const entry of readdirSync(overlayDir, { withFileTypes: true })) {
    const srcPath = join(overlayDir, entry.name);
    const dstPath = join(targetDir, entry.name);
    const nextSubPath = subPath ? `${subPath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      mkdirSync(dstPath, { recursive: true });
      applyOverlayDir(srcPath, dstPath, categoryKey, manifest, nextSubPath);
      continue;
    }

    const alreadyExists = existsSync(dstPath);
    if (alreadyExists) {
      console.warn(`⚠️  Overlay replaces bundled file: ${normalize(dstPath)}`);
    }

    mkdirSync(dirname(dstPath), { recursive: true });
    copyFileSync(srcPath, dstPath);

    // Build a relative manifest key: e.g. "agents/foo.agent.md" or
    // "skills/foo/SKILL.md" — preserving any subdirectory structure.
    const relKey = `${categoryKey}/${nextSubPath}`;
    if (!alreadyExists && Array.isArray(manifest[categoryKey])) {
      manifest[categoryKey].push(relKey);
    }

    console.log(`   ${alreadyExists ? '↩️  Replaced' : '➕  Added'}: ${relKey}`);
  }
}

/**
 * Normalizes a whitelist entry to its `{ src, dst }` form.
 * Accepts either a bare string (no rename) or an object with `src` and `dst`.
 */
function normalizeRenameEntry(entry) {
  if (typeof entry === 'string') return { src: entry, dst: entry };
  if (entry && typeof entry === 'object' && entry.src) {
    return { src: entry.src, dst: entry.dst || entry.src };
  }
  throw new Error(`Invalid whitelist entry: ${JSON.stringify(entry)}`);
}

/**
 * Rewrites the `name:` field inside the YAML frontmatter of a bundled
 * SKILL.md so it matches the renamed bundled directory. The rest of the
 * file is untouched. No-op if no frontmatter is present.
 */
function rewriteSkillFrontmatterName(skillMdPath, newName) {
  const content = readFileSync(skillMdPath, 'utf8');
  if (!content.startsWith('---')) return;
  const end = content.indexOf('\n---', 3);
  if (end < 0) return;
  const front = content.slice(0, end);
  const rest = content.slice(end);
  const updated = front.replace(/^name:\s*.*$/m, `name: ${newName}`);
  if (updated === front) return;
  writeFileSync(skillMdPath, updated + rest, 'utf8');
}

/**
 * Rewrites intra-skill cross-references (`../<old-skill-name>/...`) in every
 * `.md` file under `bundledSkillDir` so they target the renamed sibling
 * directories. `renameMap` maps each src name to its dst name (entries where
 * src === dst can be omitted).
 */
function rewriteSiblingSkillRefs(bundledSkillDir, renameMap) {
  for (const rel of listFilesRecursive(bundledSkillDir)) {
    if (!rel.toLowerCase().endsWith('.md')) continue;
    const full = join(bundledSkillDir, rel);
    const content = readFileSync(full, 'utf8');
    let updated = content;
    for (const [src, dst] of renameMap) {
      // Only rewrite within markdown link targets to avoid touching prose
      // that legitimately mentions the source skill name.
      const re = new RegExp(`(\\]\\([^)]*?\\.\\.\\/)${escapeForRegExp(src)}(\\/)`, 'g');
      updated = updated.replace(re, `$1${dst}$2`);
    }
    if (updated !== content) {
      writeFileSync(full, updated, 'utf8');
    }
  }
}

function escapeForRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Recursively copies all files from `srcDir` into `dstDir`, preserving subdirs.
 */
function copyDirRecursive(srcDir, dstDir) {
  for (const entry of readdirSync(srcDir, { withFileTypes: true })) {
    const src = join(srcDir, entry.name);
    const dst = join(dstDir, entry.name);
    if (entry.isDirectory()) {
      mkdirSync(dst, { recursive: true });
      copyDirRecursive(src, dst);
    } else if (entry.isFile()) {
      copyFileSync(src, dst);
    }
  }
}

/**
 * Returns a list of file paths under `root`, each relative to `root` with
 * forward-slash separators.
 */
function listFilesRecursive(root, prefix = '') {
  const out = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const sub = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFilesRecursive(full, sub));
    } else if (entry.isFile()) {
      out.push(sub);
    }
  }
  return out;
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
