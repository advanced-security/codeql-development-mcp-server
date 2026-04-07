/**
 * Prompt argument completion providers for VS Code UX.
 *
 * When workflow prompts are used as slash commands in VS Code Copilot Chat,
 * VS Code shows a dialog for each prompt argument. The MCP SDK's
 * `completable()` wrapper lets us provide auto-complete suggestions so that
 * users can pick values from a filtered dropdown instead of typing paths and
 * language names manually.
 *
 * Each completion callback receives the current user input and returns
 * matching suggestions. VS Code filters the list as the user types.
 */

import { readdir, readFile } from 'fs/promises';
import { dirname, join, relative, sep } from 'path';
import { homedir } from 'os';
import { completable } from '@modelcontextprotocol/sdk/server/completable.js';
import { z } from 'zod';
import { getUserWorkspaceDir } from '../utils/package-paths';
import { logger } from '../utils/logger';
import { SUPPORTED_LANGUAGES } from './workflow-prompts';
import { getDatabaseBaseDirs } from '../lib/discovery-config';

// ────────────────────────────────────────────────────────────────────────────
// Completion callbacks
// ────────────────────────────────────────────────────────────────────────────

/** Maximum number of completions to return for file-based lookups. */
const MAX_FILE_COMPLETIONS = 50;

/** Maximum directory depth when scanning for files. */
const MAX_SCAN_DEPTH = 8;

/**
 * Complete a `language` parameter by filtering SUPPORTED_LANGUAGES.
 */
export function completeLanguage(value: string): string[] {
  const lower = (value || '').toLowerCase();
  return [...SUPPORTED_LANGUAGES].filter(lang => lang.startsWith(lower));
}

/**
 * Recursively find files matching given extensions under `dir`, up to
 * `maxDepth` levels deep. Returns paths relative to `baseDir`.
 *
 * Silently skips directories that cannot be read (permission errors, etc.).
 */
async function findFilesByExtension(
  dir: string,
  baseDir: string,
  extensions: string[],
  maxDepth: number,
  results: string[],
): Promise<void> {
  if (maxDepth <= 0 || results.length >= MAX_FILE_COMPLETIONS) return;

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return; // skip unreadable directories
  }

  for (const entry of entries) {
    if (results.length >= MAX_FILE_COMPLETIONS) break;

    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip common non-CodeQL directories
      if (
        entry.name === 'node_modules'
        || entry.name === '.git'
        || entry.name === '.github'
        || entry.name === '.tmp'
        || entry.name === 'build'
        || entry.name === 'coverage'
        || entry.name === 'dist'
      ) {
        continue;
      }
      await findFilesByExtension(fullPath, baseDir, extensions, maxDepth - 1, results);
    } else if (entry.isFile()) {
      const lower = entry.name.toLowerCase();
      if (extensions.some(ext => lower.endsWith(ext))) {
        results.push(relative(baseDir, fullPath));
      }
    }
  }
}

/**
 * Complete a `queryPath` parameter by finding `.ql` and `.qlref` files
 * in the workspace, filtered by the user's current input.
 */
export async function completeQueryPath(value: string): Promise<string[]> {
  const workspace = getUserWorkspaceDir();
  const results: string[] = [];

  try {
    await findFilesByExtension(workspace, workspace, ['.ql', '.qlref'], MAX_SCAN_DEPTH, results);
  } catch (err) {
    logger.debug(`completeQueryPath scan error: ${err}`);
  }

  const lower = (value || '').toLowerCase();
  const filtered = results
    .filter(p => p.toLowerCase().includes(lower))
    .sort();

  return filtered.slice(0, MAX_FILE_COMPLETIONS);
}

/**
 * Complete a `sarifPath` parameter by finding `.sarif` and `.sarif.json`
 * files in the workspace.
 */
export async function completeSarifPath(value: string): Promise<string[]> {
  const workspace = getUserWorkspaceDir();
  const results: string[] = [];

  try {
    await findFilesByExtension(workspace, workspace, ['.sarif', '.sarif.json'], MAX_SCAN_DEPTH, results);
  } catch (err) {
    logger.debug(`completeSarifPath scan error: ${err}`);
  }

  const lower = (value || '').toLowerCase();
  const filtered = results
    .filter(p => p.toLowerCase().includes(lower))
    .sort();

  return filtered.slice(0, MAX_FILE_COMPLETIONS);
}

/**
 * Complete a `database` / `databasePath` parameter by listing CodeQL
 * database directories from configured base dirs, well-known default
 * locations, and workspace directories containing `codeql-database.yml`.
 */
export async function completeDatabasePath(value: string): Promise<string[]> {
  const baseDirs = getDatabaseBaseDirs();
  const results: string[] = [];

  // Add well-known default location: $HOME/codeql/databases/
  const homeDbDir = join(homedir(), 'codeql', 'databases');
  const allBaseDirs = baseDirs.includes(homeDbDir) ? baseDirs : [...baseDirs, homeDbDir];

  for (const baseDir of allBaseDirs) {
    if (results.length >= MAX_FILE_COMPLETIONS) break;

    let entries;
    try {
      entries = await readdir(baseDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (results.length >= MAX_FILE_COMPLETIONS) break;
      if (entry.isDirectory()) {
        results.push(join(baseDir, entry.name));
      }
    }
  }

  // Scan the workspace for directories containing codeql-database.yml
  const workspace = getUserWorkspaceDir();
  await findDatabaseDirs(workspace, workspace, MAX_SCAN_DEPTH, results);

  // Also check the workspace for -db suffixed directories (legacy heuristic)
  try {
    const wsEntries = await readdir(workspace, { withFileTypes: true });
    for (const entry of wsEntries) {
      if (results.length >= MAX_FILE_COMPLETIONS) break;
      if (entry.isDirectory() && entry.name.endsWith('-db')) {
        const fullPath = join(workspace, entry.name);
        if (!results.includes(fullPath)) {
          results.push(fullPath);
        }
      }
    }
  } catch {
    // ignore
  }

  // Deduplicate
  const unique = [...new Set(results)];

  const lower = (value || '').toLowerCase();
  const filtered = unique
    .filter(p => {
      // Match against the full path or just the basename
      const lastSeg = p.split(sep).pop() ?? '';
      return p.toLowerCase().includes(lower) || lastSeg.toLowerCase().includes(lower);
    })
    .sort();

  return filtered.slice(0, MAX_FILE_COMPLETIONS);
}

/**
 * Recursively find directories containing `codeql-database.yml`
 * (including `.testproj` directories) under `dir`.
 */
async function findDatabaseDirs(
  dir: string,
  _baseDir: string,
  maxDepth: number,
  results: string[],
): Promise<void> {
  if (maxDepth <= 0 || results.length >= MAX_FILE_COMPLETIONS) return;

  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  // Check if this directory is a CodeQL database
  const hasDbYml = entries.some(
    e => e.isFile() && e.name === 'codeql-database.yml',
  );
  if (hasDbYml) {
    results.push(dir);
    return; // Don't recurse into database directories
  }

  for (const entry of entries) {
    if (results.length >= MAX_FILE_COMPLETIONS) break;
    if (
      entry.isDirectory()
      && entry.name !== 'node_modules'
      && entry.name !== '.git'
      && entry.name !== '.github'
      && entry.name !== '.tmp'
      && entry.name !== 'dist'
      && entry.name !== 'coverage'
    ) {
      await findDatabaseDirs(join(dir, entry.name), _baseDir, maxDepth - 1, results);
    }
  }
}

/**
 * Complete a `workspaceUri` / `packRoot` parameter by finding directories
 * that contain a `codeql-pack.yml` file in the workspace.
 */
export async function completePackRoot(value: string): Promise<string[]> {
  const workspace = getUserWorkspaceDir();
  const results: string[] = [];

  async function scan(dir: string, depth: number): Promise<void> {
    if (depth <= 0 || results.length >= MAX_FILE_COMPLETIONS) return;

    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    // Check if this directory has a codeql-pack.yml
    const hasPackYml = entries.some(
      e => e.isFile() && e.name === 'codeql-pack.yml',
    );
    if (hasPackYml) {
      results.push(relative(workspace, dir) || '.');
    }

    for (const entry of entries) {
      if (results.length >= MAX_FILE_COMPLETIONS) break;
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== '.tmp') {
        await scan(join(dir, entry.name), depth - 1);
      }
    }
  }

  try {
    await scan(workspace, MAX_SCAN_DEPTH);
  } catch (err) {
    logger.debug(`completePackRoot scan error: ${err}`);
  }

  const lower = (value || '').toLowerCase();
  const filtered = results
    .filter(p => p.toLowerCase().includes(lower))
    .sort();

  return filtered.slice(0, MAX_FILE_COMPLETIONS);
}

// ────────────────────────────────────────────────────────────────────────────
// Language resolution from CodeQL pack metadata
// ────────────────────────────────────────────────────────────────────────────

/**
 * Pattern matching `codeql/<language>-all` or `codeql/<language>-queries`
 * in a `codeql-pack.yml` dependencies section. The capture group extracts
 * the language name.
 */
const CODEQL_LANG_DEP_RE = /codeql\/([a-z]+)-(all|queries)/;

/**
 * Resolve the CodeQL target language from the nearest `codeql-pack.yml`
 * that contains a `codeql/<language>-all` or `codeql/<language>-queries`
 * dependency.
 *
 * Walks up from `queryFilePath`'s parent directory until a
 * `codeql-pack.yml` with a recognisable language dependency is found,
 * or the filesystem root is reached.
 *
 * @returns A supported language string, or `undefined` if unresolvable.
 */
export async function resolveLanguageFromPack(
  queryFilePath: string,
): Promise<string | undefined> {
  let dir = dirname(queryFilePath);
  const root = dirname(dir) === dir ? dir : undefined; // filesystem root guard

  // Walk up at most 20 levels (safety limit)
  for (let i = 0; i < 20; i++) {
    const packPath = join(dir, 'codeql-pack.yml');
    try {
      const content = await readFile(packPath, 'utf-8');
      const match = CODEQL_LANG_DEP_RE.exec(content);
      if (match) {
        const lang = match[1];
        // Verify it's a known supported language
        if ([...SUPPORTED_LANGUAGES].includes(lang as typeof SUPPORTED_LANGUAGES[number])) {
          return lang;
        }
      }
    } catch {
      // No codeql-pack.yml at this level — keep walking up
    }

    const parent = dirname(dir);
    if (parent === dir || parent === root) break;
    dir = parent;
  }

  return undefined;
}

// ────────────────────────────────────────────────────────────────────────────
// Shape enhancement: apply completable() to known parameter names
// ────────────────────────────────────────────────────────────────────────────

/** Completion callback type matching the MCP SDK's CompleteCallback. */
type CompleteCallback = (
  _value: string,
  _context?: { arguments?: Record<string, string> },
) => string[] | Promise<string[]>;

/**
 * Map of parameter names to their completion callbacks.
 *
 * When a prompt shape contains one of these keys, the corresponding
 * completion callback is attached via `completable()` so VS Code shows
 * a filtered dropdown in the slash-command input dialog.
 */
const PARAMETER_COMPLETIONS: Record<string, CompleteCallback> = {
  database: completeDatabasePath,
  databasePath: completeDatabasePath,
  language: completeLanguage,
  packRoot: completePackRoot,
  queryPath: completeQueryPath,
  sarifPath: completeSarifPath,
  sarifPathA: completeSarifPath,
  sarifPathB: completeSarifPath,
  workspaceUri: completePackRoot,
};

/**
 * Clone a Zod string-like (or optional-string-like) type, preserving its
 * description, so that `completable()` does not mutate shared schemas.
 *
 * Handles `z.string()`, `z.enum()`, and their optional wrappers — the
 * types used by the prompt parameters that have registered completers.
 * Enum types are widened to `z.string()` (matching `toPermissiveShape`
 * behaviour) since completable callbacks always return `string[]`.
 */
function cloneStringType(zodType: z.ZodTypeAny): z.ZodTypeAny {
  const desc = zodType.description;

  if (zodType instanceof z.ZodOptional) {
    const inner = zodType.unwrap();
    if (!(inner instanceof z.ZodString) && !(inner instanceof z.ZodEnum)) {
      throw new Error(`cloneStringType: expected ZodString or ZodEnum inside ZodOptional, got ${inner.constructor.name}`);
    }
    const fresh = z.string().optional();
    return desc ? fresh.describe(desc) : fresh;
  }

  if (!(zodType instanceof z.ZodString) && !(zodType instanceof z.ZodEnum)) {
    throw new Error(`cloneStringType: expected ZodString or ZodEnum, got ${zodType.constructor.name}`);
  }

  const fresh = z.string();
  return desc ? fresh.describe(desc) : fresh;
}

/**
 * Apply `completable()` wrappers to a prompt argument shape.
 *
 * For each field whose name is in `PARAMETER_COMPLETIONS`, the Zod type
 * is cloned (to avoid mutating shared schema objects) and wrapped with
 * the corresponding completion callback. Fields without a registered
 * completer are passed through unchanged.
 *
 * Call this **after** `toPermissiveShape()` so the completable metadata
 * is attached to the widened types that the MCP SDK sees.
 */
export function addCompletions(
  shape: Record<string, z.ZodTypeAny>,
): Record<string, z.ZodTypeAny> {
  const enhanced: Record<string, z.ZodTypeAny> = {};

  for (const [key, zodType] of Object.entries(shape)) {
    const completer = PARAMETER_COMPLETIONS[key];
    if (completer) {
      const fresh = cloneStringType(zodType);
      enhanced[key] = completable(fresh, completer);
    } else {
      enhanced[key] = zodType;
    }
  }

  return enhanced;
}
