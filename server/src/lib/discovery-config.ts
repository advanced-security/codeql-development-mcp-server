/**
 * Discovery configuration for locating CodeQL databases, query run results,
 * and MRVA (Multi-Repository Variant Analysis) run results.
 *
 * Reads colon-separated directory lists from environment variables:
 * - `CODEQL_DATABASES_BASE_DIRS` — directories to search for CodeQL databases
 * - `CODEQL_MRVA_RUN_RESULTS_DIRS` — directories containing MRVA run result subdirectories
 * - `CODEQL_QUERY_RUN_RESULTS_DIRS` — directories containing per-run query result subdirectories
 *
 * The VS Code extension sets these automatically from vscode-codeql storage paths.
 * CLI users can set them manually.
 */

/**
 * Parse a colon-separated list of directories from an environment variable.
 */
function parsePathList(envValue: string | undefined): string[] {
  if (!envValue) {
    return [];
  }
  return envValue
    .split(':')
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
}

/**
 * Get the list of base directories to search for CodeQL databases.
 *
 * Each directory is expected to contain one or more CodeQL database directories
 * (each with a `codeql-database.yml` file).
 *
 * Set via `CODEQL_DATABASES_BASE_DIRS` (colon-separated).
 */
export function getDatabaseBaseDirs(): string[] {
  return parsePathList(process.env.CODEQL_DATABASES_BASE_DIRS);
}

/**
 * Get the list of directories containing MRVA run result subdirectories.
 *
 * Each directory is expected to contain numeric subdirectories (run IDs),
 * each holding `timestamp`, `repo_states.json`, and per-repository
 * subdirectories with `repo_task.json`, `results/results.sarif`, and
 * `results/results.bqrs`.
 *
 * Set via `CODEQL_MRVA_RUN_RESULTS_DIRS` (colon-separated).
 */
export function getMrvaRunResultsDirs(): string[] {
  return parsePathList(process.env.CODEQL_MRVA_RUN_RESULTS_DIRS);
}

/**
 * Get the list of directories containing per-run query result subdirectories.
 *
 * Each directory is expected to contain subdirectories named like
 * `<QueryName>.ql-<nanoid>/`, each holding artifacts such as
 * `evaluator-log.jsonl`, `results.bqrs`, and `results-interpreted.sarif`.
 *
 * Set via `CODEQL_QUERY_RUN_RESULTS_DIRS` (colon-separated).
 */
export function getQueryRunResultsDirs(): string[] {
  return parsePathList(process.env.CODEQL_QUERY_RUN_RESULTS_DIRS);
}
