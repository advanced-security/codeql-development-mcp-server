/**
 * Secure project-local temporary directory utilities.
 *
 * All temporary files are created under `<repoRoot>/.tmp/` which is
 * `.gitignore`d.  This avoids writing to the OS temp directory
 * (`os.tmpdir()` / `/tmp`), which is world-readable and triggers
 * CWE-377 / CWE-378 (js/insecure-temporary-file).
 */

import { existsSync, mkdirSync, mkdtempSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Repository root, calculated once at module load.
 *
 * - From source  (`server/src/utils/`)  → 3 levels up
 * - From bundle  (`server/dist/`)       → 2 levels up
 */
const repoRoot: string = __dirname.includes('src/utils')
  ? resolve(__dirname, '..', '..', '..')
  : resolve(__dirname, '..', '..');

/**
 * Base directory for all project-local temporary data.
 * Stored under `<repoRoot>/.tmp` and excluded from version control.
 */
const PROJECT_TMP_BASE = join(repoRoot, '.tmp');

/**
 * Return the project-local `.tmp` base directory, creating it if needed.
 */
export function getProjectTmpBase(): string {
  if (!existsSync(PROJECT_TMP_BASE)) {
    mkdirSync(PROJECT_TMP_BASE, { recursive: true });
  }
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
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}
