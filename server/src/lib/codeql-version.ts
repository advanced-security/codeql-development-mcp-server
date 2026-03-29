/**
 * CodeQL CLI version detection and comparison.
 *
 * Tracks the actual CodeQL CLI version (detected at startup) and the target
 * version the MCP server was built against (from .codeql-version).
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { packageRootDir as pkgRootDir, workspaceRootDir } from '../utils/package-paths';
import { logger } from '../utils/logger';

/**
 * The actual CodeQL CLI version string (set after startup validation).
 * Use this for cache keys — it reflects what actually ran the query.
 */
let actualCodeqlVersion: string | undefined;

/**
 * The target CodeQL CLI version the MCP server was built against
 * (read from .codeql-version at the repo root).
 */
let targetCodeqlVersion: string | undefined;

/**
 * Get the actual CodeQL CLI version detected at startup.
 * Returns 'unknown' if not yet validated.
 */
export function getActualCodeqlVersion(): string {
  return actualCodeqlVersion ?? 'unknown';
}

/**
 * Get the target CodeQL CLI version from .codeql-version.
 * Returns 'unknown' if the file is missing.
 */
export function getTargetCodeqlVersion(): string {
  if (targetCodeqlVersion !== undefined) return targetCodeqlVersion;
  try {
    for (const root of [workspaceRootDir, pkgRootDir]) {
      const versionFile = join(root, '.codeql-version');
      if (existsSync(versionFile)) {
        targetCodeqlVersion = readFileSync(versionFile, 'utf8').trim();
        return targetCodeqlVersion;
      }
    }
  } catch {
    // Fall through
  }
  targetCodeqlVersion = 'unknown';
  return targetCodeqlVersion;
}

/**
 * Store the actual CLI version (called from validateCodeQLBinaryReachable).
 */
export function setActualCodeqlVersion(version: string): void {
  actualCodeqlVersion = version;
}

/**
 * Compare the actual version against the target and log a warning on mismatch.
 */
export function warnOnVersionMismatch(actual: string): void {
  const target = getTargetCodeqlVersion();
  if (
    target !== 'unknown' &&
    actual !== target &&
    `v${actual}` !== target &&
    actual !== `v${target}`
  ) {
    logger.warn(
      `CodeQL CLI version mismatch: detected ${actual}, MCP server targets ${target}. ` +
      `The server will continue, but query results may differ from expected behavior.`,
    );
  }
}
