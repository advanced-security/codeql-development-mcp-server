/**
 * Database path resolution with caching.
 *
 * Resolves database paths that may point to multi-language database roots
 * (directories without `codeql-database.yml` that have language subfolders).
 */

import { basename, join } from 'path';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { logger } from '../utils/logger';

/**
 * In-memory cache for resolved database paths.
 * Avoids redundant filesystem scans when the same database is referenced
 * multiple times during a query execution.
 */
const databasePathCache = new Map<string, string>();

/**
 * Resolve a database path that may point to a multi-language database root
 * (i.e. a directory that does not contain `codeql-database.yml` itself but
 * has a language subfolder that does). This handles the common case where
 * vscode-codeql stores databases in a parent directory with language
 * subfolders like `javascript/`, `python/`, etc.
 *
 * When multiple candidate children are found, throws an error describing
 * the ambiguity so the caller can pick the right one explicitly.
 */
export function resolveDatabasePath(dbPath: string): string {
  const cached = databasePathCache.get(dbPath);
  if (cached !== undefined) return cached;

  if (existsSync(join(dbPath, 'codeql-database.yml'))) {
    databasePathCache.set(dbPath, dbPath);
    return dbPath;
  }
  try {
    const entries = readdirSync(dbPath);
    const candidates: string[] = [];
    for (const entry of entries) {
      const candidate = join(dbPath, entry);
      try {
        if (statSync(candidate).isDirectory() &&
            existsSync(join(candidate, 'codeql-database.yml'))) {
          candidates.push(candidate);
        }
      } catch {
        // Skip inaccessible entries
      }
    }
    if (candidates.length === 1) {
      logger.info(`Resolved database directory: ${dbPath} -> ${candidates[0]}`);
      databasePathCache.set(dbPath, candidates[0]);
      return candidates[0];
    }
    if (candidates.length > 1) {
      const names = candidates.map((c) => basename(c)).join(', ');
      throw new Error(
        `Ambiguous database path: ${dbPath} contains multiple databases (${names}). ` +
        'Specify the full path to the desired database subfolder.'
      );
    }
  } catch (err) {
    // Re-throw ambiguity errors
    if (err instanceof Error && err.message.startsWith('Ambiguous database path')) {
      throw err;
    }
    // Parent directory not readable — return original path
  }
  databasePathCache.set(dbPath, dbPath);
  return dbPath;
}

// ---------------------------------------------------------------------------
// Database metadata
// ---------------------------------------------------------------------------

/**
 * Metadata parsed from `codeql-database.yml`.
 */
export interface DatabaseMetadata {
  cliVersion?: string;
  creationTime?: string;
  language?: string;
  sourceLocationPrefix?: string;
}

/**
 * Read and parse `codeql-database.yml` from a CodeQL database directory.
 *
 * Uses simple line-based parsing (no YAML dependency) to extract common
 * metadata fields. Returns an empty object if the file is missing or
 * unparseable. Handles both `.yml` and `.yaml` extensions.
 *
 * This is the single authoritative function for reading database metadata.
 * All code that needs `primaryLanguage`, `sourceLocationPrefix`, etc.
 * should use this function instead of ad-hoc YAML parsing.
 */
export function readDatabaseMetadata(databasePath: string): DatabaseMetadata {
  for (const filename of ['codeql-database.yml', 'codeql-database.yaml']) {
    try {
      const content = readFileSync(join(databasePath, filename), 'utf8');
      return parseDatabaseYmlContent(content);
    } catch { /* file not found, try next */ }
  }
  return {};
}

/**
 * Parse the text content of a `codeql-database.yml` file.
 *
 * Exported for testing — callers should prefer `readDatabaseMetadata()`.
 */
export function parseDatabaseYmlContent(content: string): DatabaseMetadata {
  const metadata: DatabaseMetadata = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const key = trimmed.substring(0, colonIdx).trim();
    const value = trimmed.substring(colonIdx + 1).trim().replace(/^["']|["']$/g, '');

    switch (key) {
      case 'primaryLanguage':
        metadata.language = value;
        break;
      case 'sourceLocationPrefix':
        metadata.sourceLocationPrefix = value;
        break;
      case 'cliVersion':
        metadata.cliVersion = value;
        break;
      case 'creationTime':
        metadata.creationTime = value;
        break;
    }
  }

  return metadata;
}
