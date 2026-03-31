/**
 * Query result processing — interpretation, evaluation, and caching.
 *
 * Extracted from cli-tool-registry.ts for single-responsibility.
 * Handles BQRS interpretation via `codeql bqrs interpret`, legacy
 * evaluation functions, and automatic result caching.
 */

import { basename, dirname } from 'path';
import { mkdirSync, readFileSync } from 'fs';
import { createHash } from 'crypto';
import { CLIExecutionResult, executeCodeQLCommand, getActualCodeqlVersion } from './cli-executor';
import { evaluateQueryResults, extractQueryMetadata, QueryEvaluationResult } from './query-results-evaluator';
import { resolveQueryPath } from './query-resolver';
import { sessionDataManager } from './session-data-manager';

/**
 * Logger interface used by result processing functions.
 */
interface ProcessorLogger {
  error: (_message: string, ..._args: unknown[]) => void;
  info: (_message: string, ..._args: unknown[]) => void;
}

/**
 * Compute a deterministic cache key for a query execution.
 */
export function computeQueryCacheKey(params: {
  codeqlVersion: string;
  databasePath: string;
  externalPredicates?: Record<string, string>;
  outputFormat: string;
  queryPath: string;
}): string {
  const input = JSON.stringify({
    d: params.databasePath,
    e: params.externalPredicates ?? {},
    f: params.outputFormat,
    q: params.queryPath,
    v: params.codeqlVersion,
  });
  return createHash('sha256').update(input).digest('hex').substring(0, 16);
}

/**
 * Get default output extension based on format.
 */
export function getDefaultExtension(format: string): string {
  switch (format) {
    case 'sarif-latest':
    case 'sarifv2.1.0':
      return '.sarif';
    case 'csv':
      return '.csv';
    case 'graphtext':
      return '.txt';
    case 'dgml':
      return '.dgml';
    case 'dot':
      return '.dot';
    default:
      return '.txt';
  }
}

/**
 * Interpret a BQRS file using `codeql bqrs interpret`.
 */
export async function interpretBQRSFile(
  bqrsPath: string,
  queryPath: string,
  format: string,
  outputPath: string,
  logger: ProcessorLogger,
): Promise<CLIExecutionResult> {
  try {
    // Extract query metadata to get id and kind
    const metadata = await extractQueryMetadata(queryPath);

    // Validate required metadata fields
    const missingFields = [];
    if (!metadata.id) missingFields.push('id');
    if (!metadata.kind) missingFields.push('kind');

    if (missingFields.length > 0) {
      return {
        error: `Query metadata is incomplete. Missing required field(s): ${missingFields.join(', ')}. Ensure the query file contains @id and @kind metadata.`,
        exitCode: 1,
        stderr: '',
        stdout: '',
        success: false,
      };
    }

    // Sanitize metadata values to prevent command injection
    const sanitizedId = (metadata.id || '').replace(/[^a-zA-Z0-9_/:-]/g, '');
    const sanitizedKind = (metadata.kind || '').replace(/[^a-zA-Z0-9_-]/g, '');

    // Validate format for query kind
    const graphFormats = ['graphtext', 'dgml', 'dot'];
    if (graphFormats.includes(format) && metadata.kind !== 'graph') {
      return {
        error: `Format '${format}' is only compatible with @kind graph queries, but this query has @kind ${metadata.kind}`,
        exitCode: 1,
        stderr: '',
        stdout: '',
        success: false,
      };
    }

    // Ensure output directory exists
    mkdirSync(dirname(outputPath), { recursive: true });

    // Build the codeql bqrs interpret command
    const params: Record<string, unknown> = {
      format,
      output: outputPath,
      t: [`kind=${sanitizedKind}`, `id=${sanitizedId}`],
    };

    logger.info(`Interpreting BQRS file ${bqrsPath} with format ${format} to ${outputPath}`);

    // Execute codeql bqrs interpret
    return await executeCodeQLCommand('bqrs interpret', params, [bqrsPath]);
  } catch (error) {
    return {
      error: `Failed to interpret BQRS file: ${error}`,
      exitCode: 1,
      stderr: '',
      stdout: '',
      success: false,
    };
  }
}

/**
 * Process query run results with optional interpretation or evaluation.
 *
 * Called after `codeql query run` completes. Handles:
 * - BQRS → SARIF/graphtext/CSV interpretation
 * - Legacy evaluationFunction support
 * - Automatic result caching (when annotation tools are enabled)
 */
export async function processQueryRunResults(
  result: CLIExecutionResult,
  params: Record<string, unknown>,
  logger: ProcessorLogger,
): Promise<CLIExecutionResult> {
  try {
    const {
      _resolvedQueryPath,
      evaluationFunction,
      evaluationOutput,
      format,
      interpretedOutput,
      output,
      query,
      queryLanguage,
      queryName,
    } = params;

    // If no format or evaluationFunction specified, return as-is
    if (!format && !evaluationFunction) {
      return result;
    }

    // Ensure output (bqrs file) was generated
    if (!output) {
      return result;
    }

    const bqrsPath = output as string;

    // Determine the query path for metadata extraction.
    // Prefer the pre-resolved path (avoids redundant CLI call to resolveQueryPath).
    let queryPath: string | null = (_resolvedQueryPath as string | null) ?? null;

    if (!queryPath && query) {
      queryPath = query as string;
    } else if (!queryPath && queryName && queryLanguage) {
      queryPath = await resolveQueryPath(params, logger);
    }

    if (!queryPath) {
      logger.error('Cannot determine query path for interpretation/evaluation');
      return {
        ...result,
        stdout: result.stdout + '\n\nWarning: Query interpretation skipped - could not determine query path',
      };
    }

    // Handle new format parameter (preferred approach)
    if (format) {
      const outputFormat = format as string;

      // Determine output path
      let outputFilePath = interpretedOutput as string | undefined;
      if (!outputFilePath) {
        const ext = getDefaultExtension(outputFormat);
        outputFilePath = bqrsPath.replace('.bqrs', ext);
      }

      logger.info(`Interpreting query results from ${bqrsPath} with format: ${outputFormat}`);

      // Interpret the BQRS file
      const interpretResult = await interpretBQRSFile(bqrsPath, queryPath, outputFormat, outputFilePath, logger);

      if (interpretResult.success) {
        let enhancedOutput = result.stdout;
        enhancedOutput += `\n\nQuery results interpreted successfully with format: ${outputFormat}`;
        enhancedOutput += `\nInterpreted output saved to: ${outputFilePath}`;

        // Auto-cache the interpreted results if annotation tools are enabled
        try {
          const config = sessionDataManager.getConfig();
          if (config.enableAnnotationTools && outputFilePath && queryPath) {
            const resultContent = readFileSync(outputFilePath, 'utf8');
            const codeqlVersion = getActualCodeqlVersion();
            const dbPath = (params.database as string) || '';
            const lang = (queryLanguage as string) || 'unknown';
            const extPreds: Record<string, string> = {};
            if (params.sourceFiles) extPreds.sourceFiles = params.sourceFiles as string;
            if (params.sourceFunction) extPreds.sourceFunction = params.sourceFunction as string;
            if (params.targetFunction) extPreds.targetFunction = params.targetFunction as string;

            const cacheKey = computeQueryCacheKey({
              codeqlVersion,
              databasePath: dbPath,
              externalPredicates: Object.keys(extPreds).length > 0 ? extPreds : undefined,
              outputFormat,
              queryPath,
            });

            const store = sessionDataManager.getStore();

            // Compute result count from content for SARIF formats
            let resultCount: number | null = null;
            if (outputFormat.includes('sarif')) {
              try {
                const sarif = JSON.parse(resultContent);
                resultCount = (sarif?.runs?.[0]?.results as unknown[] | undefined)?.length ?? 0;
              } catch { /* non-SARIF content — leave count null */ }
            }

            store.putCacheEntry({
              bqrsPath,
              cacheKey,
              codeqlVersion,
              databasePath: dbPath,
              externalPredicates: Object.keys(extPreds).length > 0 ? JSON.stringify(extPreds) : null,
              interpretedPath: outputFilePath,
              language: lang,
              outputFormat,
              queryName: (queryName as string) || basename(queryPath, '.ql'),
              queryPath,
              resultContent,
              resultCount,
            });
            enhancedOutput += `\nResults cached with key: ${cacheKey}`;
            logger.info(`Cached query results with key: ${cacheKey}`);
          }
        } catch (cacheErr) {
          logger.error('Failed to cache query results:', cacheErr);
        }

        return { ...result, stdout: enhancedOutput };
      } else {
        logger.error('Query interpretation failed:', interpretResult.error);
        return {
          ...result,
          stdout: result.stdout + `\n\nWarning: Query interpretation failed - ${interpretResult.error || interpretResult.stderr}`,
        };
      }
    }

    // Handle legacy evaluationFunction parameter (deprecated)
    if (evaluationFunction) {
      logger.info(`Using deprecated evaluationFunction parameter. Consider using format parameter instead.`);
      logger.info(`Evaluating query results from ${bqrsPath} using function: ${evaluationFunction}`);

      const evaluationResult: QueryEvaluationResult = await evaluateQueryResults(
        bqrsPath,
        queryPath,
        evaluationFunction as string,
        evaluationOutput as string | undefined,
      );

      if (evaluationResult.success) {
        let enhancedOutput = result.stdout;

        if (evaluationResult.outputPath) {
          enhancedOutput += `\n\nQuery evaluation completed successfully.`;
          enhancedOutput += `\nEvaluation output saved to: ${evaluationResult.outputPath}`;
        }

        if (evaluationResult.content) {
          enhancedOutput += `\n\n=== Query Results Evaluation ===\n`;
          enhancedOutput += evaluationResult.content;
        }

        return { ...result, stdout: enhancedOutput };
      } else {
        logger.error('Query evaluation failed:', evaluationResult.error);
        return {
          ...result,
          stdout: result.stdout + `\n\nWarning: Query evaluation failed - ${evaluationResult.error}`,
        };
      }
    }

    return result;
  } catch (error) {
    logger.error('Error in query results processing:', error);
    return {
      ...result,
      stdout: result.stdout + `\n\nWarning: Query processing error - ${error}`,
    };
  }
}

/**
 * Cache results produced by `codeql database analyze`.
 *
 * When the output file is SARIF, stores the entire SARIF blob in the
 * query results cache under a deterministic key so that
 * `query_results_cache_compare` and `query_results_cache_retrieve` can
 * access database-analyze results the same way they access query-run results.
 */
export function cacheDatabaseAnalyzeResults(
  params: Record<string, unknown>,
  logger: ProcessorLogger,
): void {
  try {
    const config = sessionDataManager.getConfig();
    if (!config.enableAnnotationTools) return;

    const outputPath = params.output as string | undefined;
    const format = params.format as string | undefined;
    const dbPath = params.database as string | undefined;
    const queries = params.queries as string | undefined;

    if (!outputPath || !format || !dbPath) return;

    // Only cache SARIF outputs
    if (!format.includes('sarif')) return;

    let resultContent: string;
    try {
      resultContent = readFileSync(outputPath, 'utf8');
    } catch {
      return; // Output file may not exist if analysis failed
    }

    const codeqlVersion = getActualCodeqlVersion();
    const queryName = queries ? basename(queries, '.qls') : 'database-analyze';

    // Compute result count from SARIF content
    let resultCount: number | null = null;
    try {
      const sarif = JSON.parse(resultContent);
      resultCount = (sarif?.runs?.[0]?.results as unknown[] | undefined)?.length ?? 0;
    } catch { /* non-SARIF content */ }

    const cacheKey = computeQueryCacheKey({
      codeqlVersion,
      databasePath: dbPath,
      outputFormat: format,
      queryPath: queries || 'database-analyze',
    });

    const store = sessionDataManager.getStore();
    store.putCacheEntry({
      cacheKey,
      codeqlVersion,
      databasePath: dbPath,
      interpretedPath: outputPath,
      language: 'unknown',
      outputFormat: format,
      queryName,
      queryPath: queries || 'database-analyze',
      resultContent,
      resultCount,
    });

    logger.info(`Cached database-analyze results with key: ${cacheKey} (${resultCount ?? 0} results)`);
  } catch (err) {
    logger.error('Failed to cache database-analyze results:', err);
  }
}
