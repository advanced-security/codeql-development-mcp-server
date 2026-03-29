/**
 * Query path resolution via CodeQL CLI.
 *
 * Resolves a queryName + queryLanguage pair to an absolute file path
 * by running `codeql resolve queries` against the appropriate tool pack.
 */

import { basename } from 'path';
import { resolveToolQueryPackPath } from '../utils/package-paths';

/**
 * Logger interface for query resolution (avoids coupling to concrete logger).
 */
interface ResolverLogger {
  info: (_message: string, ..._args: unknown[]) => void;
  error: (_message: string, ..._args: unknown[]) => void;
}

/**
 * Resolve a tool query path.
 *
 * If `queryName` and `queryLanguage` are provided, resolves the query via
 * `codeql resolve queries`. Otherwise falls back to the raw `query` parameter.
 */
export async function resolveQueryPath(
  params: Record<string, unknown>,
  logger: ResolverLogger,
): Promise<string | null> {
  const { query, queryLanguage, queryName, queryPack } = params;

  // Validate parameter usage - queryName and query are mutually exclusive
  if (queryName && query) {
    logger.error('Cannot use both "query" and "queryName" parameters simultaneously. Use either "query" for direct file path OR "queryName" + "queryLanguage" for tool queries.');
    throw new Error('Cannot use both "query" and "queryName" parameters simultaneously. Use either "query" for direct file path OR "queryName" + "queryLanguage" for tool queries.');
  }

  // If no queryName provided, fall back to direct query parameter
  if (!queryName) {
    return (query as string) || null;
  }

  // If queryName provided but no language, we can't resolve
  if (!queryLanguage) {
    logger.error('queryLanguage is required when using queryName parameter. Supported languages: actions, cpp, csharp, go, java, javascript, python, ruby, swift');
    throw new Error('queryLanguage is required when using queryName parameter. Supported languages: actions, cpp, csharp, go, java, javascript, python, ruby, swift');
  }

  try {
    // Determine the query pack path - use absolute path to ensure it works regardless of cwd
    const defaultPackPath = resolveToolQueryPackPath(queryLanguage as string);
    const packPath = (queryPack as string) || defaultPackPath;

    logger.info(`Resolving query: ${queryName} for language: ${queryLanguage} in pack: ${packPath}`);

    // Execute codeql resolve queries to get available queries
    const { executeCodeQLCommand } = await import('./cli-executor');
    const resolveResult = await executeCodeQLCommand(
      'resolve queries',
      { format: 'json' },
      [packPath],
    );

    if (!resolveResult.success) {
      logger.error('Failed to resolve queries:', resolveResult.stderr || resolveResult.error);
      throw new Error(`Failed to resolve queries: ${resolveResult.stderr || resolveResult.error}`);
    }

    // Parse the JSON output to find matching queries
    let resolvedQueries: string[];
    try {
      resolvedQueries = JSON.parse(resolveResult.stdout);
    } catch (parseError) {
      logger.error('Failed to parse resolve queries output:', parseError);
      throw new Error('Failed to parse resolve queries output', { cause: parseError });
    }

    // Find the query that matches the requested name exactly
    const matchingQuery = resolvedQueries.find((queryPath) => {
      const fileName = basename(queryPath);
      return fileName === `${queryName}.ql`;
    });

    if (!matchingQuery) {
      logger.error(`Query "${queryName}.ql" not found in pack "${packPath}". Available queries:`, resolvedQueries.map(q => basename(q)));
      throw new Error(`Query "${queryName}.ql" not found in pack "${packPath}"`);
    }

    logger.info(`Resolved query "${queryName}" to: ${matchingQuery}`);
    return matchingQuery;
  } catch (error) {
    logger.error('Error resolving query path:', error);
    throw error;
  }
}
