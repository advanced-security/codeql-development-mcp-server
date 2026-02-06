/**
 * Secure project-local temporary directory helpers for tests.
 *
 * Uses `<repoRoot>/.tmp/test-data/` instead of `os.tmpdir()` so that
 * temporary test files never land in the world-readable OS temp
 * directory (CWE-377 / CWE-378).
 */

import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'fs';
import { join, resolve } from 'path';

/**
 * Repository root – from `server/test/utils/` go up 3 levels.
 */
const repoRoot = resolve(__dirname, '..', '..', '..');

/**
 * Base directory for all test temporary data.
 */
const TEST_TMP_BASE = join(repoRoot, '.tmp', 'test-data');

/**
 * Return the test temp base directory, creating it if needed.
 */
export function getTestTmpBase(): string {
  if (!existsSync(TEST_TMP_BASE)) {
    mkdirSync(TEST_TMP_BASE, { recursive: true });
  }
  return TEST_TMP_BASE;
}

/**
 * Create a uniquely-named temporary directory for a test suite.
 *
 * Drop-in replacement for `join(tmpdir(), 'some-prefix-' + Date.now())`.
 *
 * @param prefix - Descriptive prefix for the directory name.
 * @returns Absolute path to the new directory.
 */
export function createTestTempDir(prefix: string): string {
  const base = getTestTmpBase();
  return mkdtempSync(join(base, `${prefix}-`));
}

/**
 * Remove a test temporary directory if it exists.
 * Convenience wrapper used in `afterEach` / `afterAll` hooks.
 */
export function cleanupTestTempDir(dir: string): void {
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
}
