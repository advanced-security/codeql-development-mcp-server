/**
 * list_mrva_run_results tool
 *
 * Discovers MRVA (Multi-Repository Variant Analysis) run result directories
 * in configured search paths.
 * Scans each directory in `CODEQL_MRVA_RUN_RESULTS_DIRS` for numeric
 * subdirectories representing variant analysis runs created by vscode-codeql.
 * Reports run ID, timestamp, repositories scanned, analysis status, and
 * available artifacts for each run.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import { getMrvaRunResultsDirs } from '../../lib/discovery-config';
import { logger } from '../../utils/logger';

export interface MrvaRepoResult {
  analysisStatus?: string;
  fullName: string;
  hasBqrs: boolean;
  hasSarif: boolean;
  resultCount?: number;
}

export interface MrvaRunResult {
  path: string;
  repositories: MrvaRepoResult[];
  runId: string;
  timestamp?: string;
}

/**
 * Pattern matching numeric MRVA run directory names.
 */
const NUMERIC_DIR_PATTERN = /^\d+$/;

/**
 * Directory names to skip when walking repository subdirectories.
 */
const SKIP_DIRS = new Set(['.DS_Store', 'exported-results']);

/**
 * Discover MRVA run result directories in the given search paths.
 *
 * @param resultsDirs - Directories to scan for MRVA run subdirectories
 * @param runId - Optional run ID filter (e.g., "20442")
 * @returns List of discovered MRVA run results with repository inventory
 */
export async function discoverMrvaRunResults(
  resultsDirs: string[],
  runId?: string,
): Promise<MrvaRunResult[]> {
  const results: MrvaRunResult[] = [];

  for (const dir of resultsDirs) {
    if (!existsSync(dir)) {
      continue;
    }

    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const entryPath = join(dir, entry);

      // Skip non-directories
      try {
        if (!statSync(entryPath).isDirectory()) {
          continue;
        }
      } catch {
        continue;
      }

      // Match numeric directory names
      if (!NUMERIC_DIR_PATTERN.test(entry)) {
        continue;
      }

      // Apply run ID filter
      if (runId && entry !== runId) {
        continue;
      }

      // Read timestamp if available
      let timestamp: string | undefined;
      const timestampPath = join(entryPath, 'timestamp');
      if (existsSync(timestampPath)) {
        try {
          timestamp = readFileSync(timestampPath, 'utf-8').trim();
        } catch {
          // Ignore read errors
        }
      }

      // Discover repository subdirectories
      const repositories = discoverRepoResults(entryPath);

      results.push({
        path: entryPath,
        repositories,
        runId: entry,
        timestamp,
      });
    }
  }

  return results;
}

/**
 * Walk a single MRVA run directory to discover per-repository results.
 *
 * The directory structure is `<owner>/<repo>/` containing `repo_task.json`
 * and optionally `results/results.sarif` and `results/results.bqrs`.
 */
function discoverRepoResults(runPath: string): MrvaRepoResult[] {
  const repos: MrvaRepoResult[] = [];

  let ownerEntries: string[];
  try {
    ownerEntries = readdirSync(runPath);
  } catch {
    return repos;
  }

  for (const ownerEntry of ownerEntries) {
    if (SKIP_DIRS.has(ownerEntry)) {
      continue;
    }

    // Skip non-directory entries (timestamp, repo_states.json, etc.)
    const ownerPath = join(runPath, ownerEntry);
    try {
      if (!statSync(ownerPath).isDirectory()) {
        continue;
      }
    } catch {
      continue;
    }

    let repoEntries: string[];
    try {
      repoEntries = readdirSync(ownerPath);
    } catch {
      continue;
    }

    for (const repoEntry of repoEntries) {
      const repoPath = join(ownerPath, repoEntry);
      try {
        if (!statSync(repoPath).isDirectory()) {
          continue;
        }
      } catch {
        continue;
      }

      const fullName = `${ownerEntry}/${repoEntry}`;

      // Parse repo_task.json if present
      let analysisStatus: string | undefined;
      let resultCount: number | undefined;
      const repoTaskPath = join(repoPath, 'repo_task.json');
      if (existsSync(repoTaskPath)) {
        try {
          const raw = readFileSync(repoTaskPath, 'utf-8');
          const task = JSON.parse(raw);
          if (typeof task.analysisStatus === 'string') {
            analysisStatus = task.analysisStatus;
          }
          if (typeof task.resultCount === 'number') {
            resultCount = task.resultCount;
          }
        } catch {
          // Ignore parse errors
        }
      }

      // Check for SARIF and BQRS artifacts
      const hasSarif = existsSync(join(repoPath, 'results', 'results.sarif'));
      const hasBqrs = existsSync(join(repoPath, 'results', 'results.bqrs'));

      repos.push({
        analysisStatus,
        fullName,
        hasBqrs,
        hasSarif,
        resultCount,
      });
    }
  }

  return repos;
}

/**
 * Register the list_mrva_run_results tool with the MCP server.
 */
export function registerListMrvaRunResultsTool(server: McpServer): void {
  server.tool(
    'list_mrva_run_results',
    'List discovered MRVA (Multi-Repository Variant Analysis) run results (set via CODEQL_MRVA_RUN_RESULTS_DIRS env var). Returns run ID, timestamp, repositories scanned, analysis status, and available artifacts for each run.',
    {
      runId: z
        .string()
        .optional()
        .describe('Filter results by run ID (e.g., "20442")'),
    },
    async ({ runId }) => {
      try {
        const resultsDirs = getMrvaRunResultsDirs();

        if (resultsDirs.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No MRVA run results directories configured. Set the CODEQL_MRVA_RUN_RESULTS_DIRS environment variable to a colon-separated list of directories to search.',
              },
            ],
          };
        }

        const runs = await discoverMrvaRunResults(resultsDirs, runId);

        if (runs.length === 0) {
          const filterMsg = runId ? ` for run ID "${runId}"` : '';
          return {
            content: [
              {
                type: 'text' as const,
                text: `No MRVA run results found${filterMsg} in: ${resultsDirs.join(', ')}`,
              },
            ],
          };
        }

        const lines = [
          `Found ${runs.length} MRVA run result(s):`,
          '',
          ...runs.map((run) => {
            const parts = [`  Run ${run.runId}`];
            parts.push(`    Path: ${run.path}`);
            if (run.timestamp) parts.push(`    Timestamp: ${run.timestamp}`);
            parts.push(`    Repositories: ${run.repositories.length}`);
            for (const repo of run.repositories) {
              const artifacts: string[] = [];
              if (repo.hasSarif) artifacts.push('sarif');
              if (repo.hasBqrs) artifacts.push('bqrs');
              const status = repo.analysisStatus ?? 'unknown';
              const count = repo.resultCount !== undefined ? `, ${repo.resultCount} result(s)` : '';
              parts.push(`      ${repo.fullName} [${status}${count}] artifacts: ${artifacts.length > 0 ? artifacts.join(', ') : 'none'}`);
            }
            return parts.join('\n');
          }),
        ];

        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      } catch (error) {
        logger.error('Error listing MRVA run results:', error);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
