/**
 * Database path resolution with caching.
 *
 * Resolves database paths that may point to multi-language database roots
 * (directories without `codeql-database.yml` that have language subfolders).
 */

import { basename, join } from 'path';
import { existsSync, readdirSync, statSync } from 'fs';
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
