/**
 * Secure project-local temporary directory utilities.
 *
 * All temporary files are created under `<packageRoot>/.tmp/` which is
 * `.gitignore`d.  This avoids writing to the OS temp directory
 * (`os.tmpdir()` / `/tmp`), which is world-readable and triggers
 * CWE-377 / CWE-378 (js/insecure-temporary-file).
 */

import { mkdirSync, mkdtempSync } from 'fs';
import { join } from 'path';
import { getPackageRootDir } from './package-paths';

/**
 * Base directory for all project-local temporary data.
 *
 * Resolution order:
 * 1. `CODEQL_MCP_TMP_DIR` environment variable — for read-only package root
 *    scenarios (e.g., npm global installs where the package directory is not
 *    writable).
 * 2. `<packageRoot>/.tmp` — default; excluded from version control.
 */
const PROJECT_TMP_BASE = process.env.CODEQL_MCP_TMP_DIR || join(getPackageRootDir(), '.tmp');

/**
 * Return the project-local `.tmp` base directory, creating it if needed.
 */
export function getProjectTmpBase(): string {
  mkdirSync(PROJECT_TMP_BASE, { recursive: true });
  return PROJECT_TMP_BASE;
}

/**
 * Create a unique temporary directory under the project `.tmp` root.
 *
 * Works identically to `fs.mkdtempSync(os.tmpdir(), prefix)` but is
 * scoped to the repository.
 *
 * @param prefix - Directory name prefix (e.g. `'codeql-external-'`).
 * @returns Absolute path to the newly created directory.
 */
export function createProjectTempDir(prefix: string): string {
  const base = getProjectTmpBase();
  return mkdtempSync(join(base, prefix));
}

/**
 * Return a deterministic subdirectory under `.tmp/<name>`, creating it
 * if it does not already exist.
 *
 * Useful for well-known scratch areas such as `query-logs` or `quickeval`.
 *
 * @param name - Subdirectory name (e.g. `'query-logs'`).
 * @returns Absolute path to the subdirectory.
 */
export function getProjectTmpDir(name: string): string {
  const dir = join(getProjectTmpBase(), name);
  mkdirSync(dir, { recursive: true });
  return dir;
}
