/**
 * Log directory management utilities for CodeQL query and test runs
 */

import { mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { randomBytes } from 'crypto';

/**
 * Ensure that a given path is within a base directory.
 * Throws an error if the path is outside the base directory.
 */
function ensurePathWithinBase(baseDir: string, targetPath: string): string {
  const absBase = resolve(baseDir);
  const absTarget = resolve(targetPath);
  if (!absTarget.startsWith(absBase + '/') && absTarget !== absBase) {
    throw new Error(`Provided log directory is outside the allowed base directory: ${absBase}`);
  }
  return absTarget;
}

/**
 * Get or create a unique log directory for query/test runs
 * 
 * @param logDir - Optional custom log directory from parameters
 * @returns Absolute path to the log directory
 */
export function getOrCreateLogDirectory(logDir?: string): string {
  // Use CODEQL_QUERY_LOG_DIR env var or default base
  const baseLogDir = process.env.CODEQL_QUERY_LOG_DIR || '/tmp/codeql-development-mcp-server/query-logs';

  // If logDir is explicitly provided, validate it is within baseLogDir
  if (logDir) {
    const absLogDir = ensurePathWithinBase(baseLogDir, logDir);
    if (!existsSync(absLogDir)) {
      mkdirSync(absLogDir, { recursive: true });
    }
    return absLogDir;
  }
  
  // Otherwise, use baseLogDir and create a unique subdirectory
  
  // Create base directory if it doesn't exist
  if (!existsSync(baseLogDir)) {
    mkdirSync(baseLogDir, { recursive: true });
  }
  
  // Generate unique subdirectory with timestamp and random ID
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const uniqueId = randomBytes(4).toString('hex');
  const uniqueLogDir = join(baseLogDir, `query-run-${timestamp}-${uniqueId}`);
  
  mkdirSync(uniqueLogDir, { recursive: true });
  
  return uniqueLogDir;
}
