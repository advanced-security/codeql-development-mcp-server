/**
 * CodeQL metadata resolver utilities
 * Handles resolution of query metadata using the CodeQL CLI
 */

import { executeCodeQLCommand } from './cli-executor';
import { logger } from '../utils/logger';

/**
 * Query metadata structure returned by codeql resolve metadata
 */
export interface QueryMetadata {
  [key: string]: string | string[];
}

/**
 * Resolve metadata for a CodeQL query file
 * @param queryPath - Absolute or relative path to the .ql query file
 * @returns Parsed metadata object or null if resolution fails
 */
export async function resolveQueryMetadata(queryPath: string): Promise<QueryMetadata | null> {
  try {
    logger.info(`Resolving metadata for query: ${queryPath}`);

    const result = await executeCodeQLCommand(
      'resolve metadata',
      { format: 'json' },
      [queryPath]
    );

    if (!result.success) {
      logger.error(`Failed to resolve metadata for ${queryPath}:`, result.stderr || result.error);
      return null;
    }

    // Parse the JSON output
    try {
      const metadata = JSON.parse(result.stdout);
      return metadata;
    } catch (parseError) {
      logger.error(`Failed to parse metadata JSON for ${queryPath}:`, parseError);
      return null;
    }
  } catch (error) {
    logger.error(`Error resolving metadata for ${queryPath}:`, error);
    return null;
  }
}
