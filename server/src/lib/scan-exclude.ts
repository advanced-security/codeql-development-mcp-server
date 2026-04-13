/**
 * Shared directory exclusion list for workspace scanning operations.
 *
 * Provides a comprehensive default set of directory names to skip during
 * recursive file discovery (prompt completions, QL code search, etc.)
 * and makes the set configurable via the `CODEQL_MCP_SCAN_EXCLUDE_DIRS`
 * environment variable.
 *
 * The VS Code extension surfaces this as the `codeql-mcp.scanExcludeDirs`
 * setting, which is passed through to the server as an env var.
 *
 * ## Configuration
 *
 * The env var accepts a comma-separated list of directory names.
 * Entries prefixed with `!` remove a default from the set (negation).
 * All other entries are added to the default set.
 *
 * Examples:
 *   - `CODEQL_MCP_SCAN_EXCLUDE_DIRS="custom-build,tmp-output"` — adds
 *   - `CODEQL_MCP_SCAN_EXCLUDE_DIRS="!build,!dist"` — removes `build` and `dist` from defaults
 *   - `CODEQL_MCP_SCAN_EXCLUDE_DIRS="custom-dir,!coverage"` — adds `custom-dir`, removes `coverage`
 */

/**
 * Comprehensive default set of directory names to skip during workspace
 * scanning. Sorted alphabetically.
 *
 * This list is the union of directories previously skipped in
 * `prompt-completions.ts` and `search-ql-code.ts`, plus additional
 * well-known directories that never contain CodeQL source files and
 * would slow down scanning.
 */
export const DEFAULT_SCAN_EXCLUDE_DIRS: readonly string[] = [
  '.cache',
  '.codeql',
  '.git',
  '.github',
  '.idea',
  '.mypy_cache',
  '.pytest_cache',
  '.tmp',
  '.tox',
  '.vscode',
  '.yarn',
  '__pycache__',
  'build',
  'coverage',
  'dist',
  'node_modules',
  'out',
  'target',
  'vendor',
];

/**
 * Parse the `CODEQL_MCP_SCAN_EXCLUDE_DIRS` environment variable and
 * merge with defaults.
 *
 * @returns A `Set` of directory names to exclude from scanning.
 */
export function getScanExcludeDirs(): Set<string> {
  const result = new Set(DEFAULT_SCAN_EXCLUDE_DIRS);

  const envValue = process.env.CODEQL_MCP_SCAN_EXCLUDE_DIRS;
  if (!envValue) {
    return result;
  }

  const entries = envValue.split(',').map(e => e.trim()).filter(e => e.length > 0);

  for (const entry of entries) {
    if (entry.startsWith('!')) {
      // Negation: remove from defaults
      result.delete(entry.slice(1).trim());
    } else {
      // Addition: add to the set
      result.add(entry);
    }
  }

  return result;
}

/**
 * Check whether a directory name should be excluded from scanning.
 *
 * @param dirName  - The directory basename to check.
 * @param excludeSet - Optional pre-computed exclusion set. When omitted,
 *                     `getScanExcludeDirs()` is called (reads the env var).
 * @returns `true` if the directory should be skipped.
 */
export function isScanExcluded(
  dirName: string,
  excludeSet?: Set<string>,
): boolean {
  const set = excludeSet ?? getScanExcludeDirs();
  return set.has(dirName);
}
