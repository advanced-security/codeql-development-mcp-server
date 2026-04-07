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

import { readdir } from 'fs/promises';
import { join, relative, sep } from 'path';
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
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.tmp') {
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
 * database directories from configured base dirs.
 */
export async function completeDatabasePath(value: string): Promise<string[]> {
  const baseDirs = getDatabaseBaseDirs();
  const results: string[] = [];

  for (const baseDir of baseDirs) {
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

  // Also check the workspace for databases
  const workspace = getUserWorkspaceDir();
  try {
    const wsEntries = await readdir(workspace, { withFileTypes: true });
    for (const entry of wsEntries) {
      if (results.length >= MAX_FILE_COMPLETIONS) break;
      if (entry.isDirectory() && entry.name.endsWith('-db')) {
        results.push(join(workspace, entry.name));
      }
    }
  } catch {
    // ignore
  }

  const lower = (value || '').toLowerCase();
  const filtered = results
    .filter(p => {
      // Match against the full path or just the basename
      const lastSeg = p.split(sep).pop() ?? '';
      return p.toLowerCase().includes(lower) || lastSeg.toLowerCase().includes(lower);
    })
    .sort();

  return filtered.slice(0, MAX_FILE_COMPLETIONS);
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
 * Clone a Zod string (or optional-string) type, preserving its description.
 *
 * This is necessary because `completable()` mutates the schema in-place,
 * and we must not mutate the canonical schema constants (e.g.
 * `explainCodeqlQuerySchema.shape.queryPath`).
 */
function cloneStringType(zodType: z.ZodTypeAny): z.ZodTypeAny {
  const desc = zodType.description;

  if (zodType instanceof z.ZodOptional) {
    const fresh = z.string().optional();
    return desc ? fresh.describe(desc) : fresh;
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
