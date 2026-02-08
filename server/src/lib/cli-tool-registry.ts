/**
 * Generic tool registry for creating MCP tools from CLI command definitions
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { executeCodeQLCommand, executeQLTCommand, CLIExecutionResult } from './cli-executor';
import { logger } from '../utils/logger';
import { evaluateQueryResults, QueryEvaluationResult, extractQueryMetadata } from './query-results-evaluator';
import { getOrCreateLogDirectory } from './log-directory-manager';
import { packageRootDir, resolveToolQueryPackPath, workspaceRootDir } from '../utils/package-paths';
import { writeFileSync, rmSync, existsSync, mkdirSync } from 'fs';
import { basename, dirname, isAbsolute, join, resolve } from 'path';
import { createProjectTempDir } from '../utils/temp-dir';

export type { CLIExecutionResult } from './cli-executor';

export interface CLIToolDefinition {
  name: string;
  description: string;
  command: 'codeql' | 'qlt';
  subcommand: string;
  inputSchema: Record<string, z.ZodTypeAny>;
  examples?: string[];
  resultProcessor?: (_result: CLIExecutionResult, _params: Record<string, unknown>) => string;
}

/**
 * Default result processor that formats CLI output appropriately
 */
export const defaultCLIResultProcessor = (
  result: CLIExecutionResult, 
  _params: Record<string, unknown>
): string => {
  if (!result.success) {
    return `Command failed (exit code ${result.exitCode || 'unknown'}):\n${result.error || result.stderr}`;
  }
  
  let output = '';
  
  if (result.stdout) {
    output += result.stdout;
  }
  
  if (result.stderr) {
    if (output) {
      output += '\n\nWarnings/Info:\n';
    }
    output += result.stderr;
  }
  
  if (!output) {
    output = 'Command executed successfully (no output)';
  }
  
  return output;
};

/**
 * Register a CLI tool with the MCP server
 */
export function registerCLITool(server: McpServer, definition: CLIToolDefinition): void {
  const {
    name,
    description,
    command,
    subcommand,
    inputSchema,
    resultProcessor = defaultCLIResultProcessor
  } = definition;

  server.tool(
    name,
    description,
    inputSchema,
    async (params: Record<string, unknown>) => {
      // Track temporary directories for cleanup
      const tempDirsToCleanup: string[] = [];
      
      try {
        logger.info(`Executing CLI tool: ${name}`, { command, subcommand, params });

        // Separate positional arguments from named options
        // Extract tool-specific parameters that should not be passed to CLI
        // Note: format is extracted for tools that use it internally but not on CLI
        // For codeql_bqrs_interpret, codeql_bqrs_decode, codeql_generate_query-help, and codeql_database_analyze, format should be passed to CLI
        const formatShouldBePassedToCLI = name === 'codeql_bqrs_interpret' || name === 'codeql_bqrs_decode' || name === 'codeql_generate_query-help' || name === 'codeql_database_analyze';
        
        const extractedParams = formatShouldBePassedToCLI
          ? {
              _positional: params._positional || [],
              files: params.files,
              file: params.file,
              dir: params.dir,
              packDir: params.packDir,
              tests: params.tests,
              query: params.query,
              queryName: params.queryName,
              queryLanguage: params.queryLanguage,
              queryPack: params.queryPack,
              sourceFiles: params.sourceFiles,
              sourceFunction: params.sourceFunction,
              targetFunction: params.targetFunction,
              interpretedOutput: params.interpretedOutput,
              evaluationFunction: params.evaluationFunction,
              evaluationOutput: params.evaluationOutput,
              directory: params.directory,
              logDir: params.logDir,
              qlref: params.qlref
            }
          : {
              _positional: params._positional || [],
              files: params.files,
              file: params.file,
              dir: params.dir,
              packDir: params.packDir,
              tests: params.tests,
              query: params.query,
              queryName: params.queryName,
              queryLanguage: params.queryLanguage,
              queryPack: params.queryPack, 
              sourceFiles: params.sourceFiles,
              sourceFunction: params.sourceFunction,
              targetFunction: params.targetFunction,
              format: params.format,
              interpretedOutput: params.interpretedOutput,
              evaluationFunction: params.evaluationFunction,
              evaluationOutput: params.evaluationOutput,
              directory: params.directory,
              logDir: params.logDir,
              qlref: params.qlref
            };

        const {
          _positional = [],
          files,
          file,
          dir,
          packDir,
          tests,
          query,
          queryName,
          queryLanguage: _queryLanguage,
          queryPack: _queryPack,
          sourceFiles,
          sourceFunction,
          targetFunction,
          format: _format,
          interpretedOutput: _interpretedOutput,
          evaluationFunction: _evaluationFunction,
          evaluationOutput: _evaluationOutput,
          directory,
          logDir: customLogDir,
          qlref,
        } = extractedParams;

        // Get remaining options (everything not extracted above)
        const options = {...params};
        Object.keys(extractedParams).forEach(key => delete options[key]);
        let positionalArgs = Array.isArray(_positional) ? _positional as string[] : [_positional as string];

        // Handle files parameter as positional arguments for certain tools
        if (files && Array.isArray(files)) {
          positionalArgs = [...positionalArgs, ...files as string[]];
        }

        // Handle file parameter as positional argument for BQRS tools
        if (file && name.startsWith('codeql_bqrs_')) {
          positionalArgs = [...positionalArgs, file as string];
        }

        // Handle qlref parameter as positional argument for resolve qlref tool
        if (qlref && name === 'codeql_resolve_qlref') {
          positionalArgs = [...positionalArgs, qlref as string];
        }

        // Handle database parameter as positional argument for resolve database tool
        if (options.database && name === 'codeql_resolve_database') {
          positionalArgs = [...positionalArgs, options.database as string];
          delete options.database;
        }

        // Handle database parameter as positional argument for database create tool
        if (options.database && name === 'codeql_database_create') {
          positionalArgs = [...positionalArgs, options.database as string];
          delete options.database;
        }

        // Handle database and queries parameters as positional arguments for database analyze tool
        if (name === 'codeql_database_analyze') {
          if (options.database) {
            positionalArgs = [...positionalArgs, options.database as string];
            delete options.database;
          }
          if (options.queries) {
            positionalArgs = [...positionalArgs, options.queries as string];
            delete options.queries;
          }
        }

        // Handle query parameter as positional argument for generate query-help tool
        if (query && name === 'codeql_generate_query-help') {
          positionalArgs = [...positionalArgs, query as string];
        }

        // Handle dir parameter as positional argument for pack tools
        if (dir && (name === 'codeql_pack_ls')) {
          positionalArgs = [...positionalArgs, dir as string];
        }
        
        // Handle tool-specific parameters using switch pattern for better maintainability
        switch (name) {
          case 'codeql_test_accept':
          case 'codeql_test_extract':
          case 'codeql_test_run':
          case 'codeql_resolve_tests':
            // Handle tests parameter as positional arguments for test tools.
            // Resolve relative paths against workspaceRootDir since the MCP
            // server's cwd may not be the repo root.
            if (tests && Array.isArray(tests)) {
              positionalArgs = [...positionalArgs, ...(tests as string[]).map(
                t => isAbsolute(t) ? t : resolve(workspaceRootDir, t)
              )];
            }
            break;
            
          case 'codeql_query_run': {
            // Resolve database path to absolute path if it's relative
            if (options.database && typeof options.database === 'string' && !isAbsolute(options.database)) {
              options.database = resolve(workspaceRootDir, options.database);
              logger.info(`Resolved database path to: ${options.database}`);
            }
            
            // Implement query resolution logic with enhanced results processing
            const resolvedQuery = await resolveQueryPath(params, logger);
            if (resolvedQuery) {
              positionalArgs = [...positionalArgs, resolvedQuery];
            } else if (query) {
              positionalArgs = [...positionalArgs, query as string];
            }
            
            // Handle external predicates for tool queries
            if (queryName === 'PrintAST' && sourceFiles) {
              // Create a CSV file with the source file paths for the external predicate
              // The external predicate expects a CSV file with one column containing file paths
              const filePaths = (sourceFiles as string).split(',').map((f: string) => f.trim());
              let tempDir: string;
              let csvPath: string;
              try {
                tempDir = createProjectTempDir('codeql-external-');
                tempDirsToCleanup.push(tempDir); // Track for cleanup
                csvPath = join(tempDir, 'selectedSourceFiles.csv');

                // Create CSV content
                const csvContent = filePaths.join('\n') + '\n';

                writeFileSync(csvPath, csvContent, 'utf8');
              } catch (err) {
                logger.error(`Failed to create external predicate CSV for PrintAST query at path ${csvPath || '[unknown]'}: ${err instanceof Error ? err.message : String(err)}`);
                throw err;
              }
              
              // Add the external predicate with the CSV file path
              const currentExternal = options.external || [];
              const externalArray = Array.isArray(currentExternal) ? currentExternal : [currentExternal];
              externalArray.push(`selectedSourceFiles=${csvPath}`);
              options.external = externalArray;
              
              logger.info(`Created external predicate CSV at ${csvPath} for files: ${filePaths.join(', ')}`);
            }
            
            // Handle external predicates for CallGraphFrom queries
            if (queryName === 'CallGraphFrom' && sourceFunction) {
              const functionNames = (sourceFunction as string).split(',').map((f: string) => f.trim());
              let tempDir: string;
              let csvPath: string;
              try {
                tempDir = createProjectTempDir('codeql-external-');
                tempDirsToCleanup.push(tempDir);
                csvPath = join(tempDir, 'sourceFunction.csv');

                // Create CSV content
                const csvContent = functionNames.join('\n') + '\n';

                writeFileSync(csvPath, csvContent, 'utf8');
              } catch (err) {
                logger.error(`Failed to create external predicate CSV for CallGraphFrom query at path ${csvPath || '[unknown]'}: ${err instanceof Error ? err.message : String(err)}`);
                throw err;
              }
              
              // Add the external predicate with the CSV file path
              const currentExternal = options.external || [];
              const externalArray = Array.isArray(currentExternal) ? currentExternal : [currentExternal];
              externalArray.push(`sourceFunction=${csvPath}`);
              options.external = externalArray;
              
              logger.info(`Created external predicate CSV at ${csvPath} for functions: ${functionNames.join(', ')}`);
            }
            
            // Handle external predicates for CallGraphTo queries
            if (queryName === 'CallGraphTo' && targetFunction) {
              const functionNames = (targetFunction as string).split(',').map((f: string) => f.trim());
              let tempDir: string;
              let csvPath: string;
              try {
                tempDir = createProjectTempDir('codeql-external-');
                tempDirsToCleanup.push(tempDir);
                csvPath = join(tempDir, 'targetFunction.csv');

                // Create CSV content
                const csvContent = functionNames.join('\n') + '\n';

                writeFileSync(csvPath, csvContent, 'utf8');
              } catch (err) {
                logger.error(`Failed to create external predicate CSV for CallGraphTo query at path ${csvPath || '[unknown]'}: ${err instanceof Error ? err.message : String(err)}`);
                throw err;
              }
              
              // Add the external predicate with the CSV file path
              const currentExternal = options.external || [];
              const externalArray = Array.isArray(currentExternal) ? currentExternal : [currentExternal];
              externalArray.push(`targetFunction=${csvPath}`);
              options.external = externalArray;
              
              logger.info(`Created external predicate CSV at ${csvPath} for functions: ${functionNames.join(', ')}`);
            }
            break;
          }
            
          case 'codeql_query_compile':
          case 'codeql_resolve_metadata':
            // Handle query parameter as positional argument for query compilation and metadata tools
            if (query) {
              positionalArgs = [...positionalArgs, query as string];
            }
            break;
            
          case 'codeql_resolve_queries':
            // Handle directory parameter as positional argument
            if (directory) {
              positionalArgs = [...positionalArgs, directory as string];
            }
            break;
            
          default:
            // No special parameter handling needed for other tools
            break;
        }

        // Set up logging directory for query/test runs
        let queryLogDir: string | undefined;
        if (name === 'codeql_query_run' || name === 'codeql_test_run') {
          queryLogDir = getOrCreateLogDirectory(customLogDir as string | undefined);
          logger.info(`Using log directory for ${name}: ${queryLogDir}`);
          
          // Create timestamp file to track when query/test run started
          const timestampPath = join(queryLogDir, 'timestamp');
          writeFileSync(timestampPath, Date.now().toString(), 'utf8');
          
          // Set the --logdir option for CodeQL CLI
          options.logdir = queryLogDir;
          
          // Set verbosity to progress+ to generate detailed query.log/test.log
          if (!options.verbosity) {
            options.verbosity = 'progress+';
          }
          
          // For query run, also handle the deprecated evaluator-log parameter and default output
          if (name === 'codeql_query_run') {
            // If evaluator-log was explicitly provided (deprecated), use it
            // Otherwise, set it to the log directory
            if (!options['evaluator-log']) {
              options['evaluator-log'] = join(queryLogDir, 'evaluator-log.jsonl');
            }
            
            // If output was not explicitly provided, set it to the log directory
            if (!options.output) {
              options.output = join(queryLogDir, 'results.bqrs');
            }
          }
        }

        let result: CLIExecutionResult;
        
        if (command === 'codeql') {
          // For pack commands, set the working directory to where qlpack.yml is located.
          // Resolve to absolute path since the MCP server's cwd may differ from
          // the workspace root (especially when launched by VS Code).
          let cwd: string | undefined;
          if ((name === 'codeql_pack_install' || name === 'codeql_pack_ls') && (dir || packDir)) {
            const rawCwd = (dir || packDir) as string;
            // Resolve relative paths against the workspace root, not process.cwd(),
            // since the MCP server's cwd may differ (especially in VS Code).
            cwd = isAbsolute(rawCwd) ? rawCwd : resolve(workspaceRootDir, rawCwd);
          }
          
          // Add --additional-packs for commands that need to access local test packs.
          // Only set the default examples path when it actually exists on disk
          // (it may be absent in npm-installed layouts where ql/javascript/examples/
          // is not included in the published package).
          const defaultExamplesPath = resolve(packageRootDir, 'ql', 'javascript', 'examples');
          const additionalPacksPath = process.env.CODEQL_ADDITIONAL_PACKS
            || (existsSync(defaultExamplesPath) ? defaultExamplesPath : undefined);
          if (additionalPacksPath && (name === 'codeql_test_run' || name === 'codeql_query_run' || name === 'codeql_query_compile')) {
            options['additional-packs'] = additionalPacksPath;
          }
          
          // Keep test databases for codeql_test_run to allow subsequent query runs
          if (name === 'codeql_test_run') {
            options['keep-databases'] = true;
          }
          
          result = await executeCodeQLCommand(subcommand, options, positionalArgs, cwd);
        } else if (command === 'qlt') {
          result = await executeQLTCommand(subcommand, options, positionalArgs);
        } else {
          throw new Error(`Unsupported command: ${command}`);
        }

        // Post-execution processing for codeql_query_run
        if (name === 'codeql_query_run' && result.success && queryLogDir) {
          // Generate SARIF interpretation if results.bqrs exists
          const bqrsPath = options.output as string;
          const sarifPath = join(queryLogDir, 'results.sarif');
          
          if (existsSync(bqrsPath)) {
            try {
              const sarifResult = await executeCodeQLCommand(
                'bqrs interpret',
                { format: 'sarif-latest', output: sarifPath },
                [bqrsPath]
              );
              
              if (sarifResult.success) {
                logger.info(`Generated SARIF interpretation at ${sarifPath}`);
              }
            } catch (error) {
              logger.warn(`Failed to generate SARIF interpretation: ${error}`);
            }
          }
          
          // Process evaluation results
          result = await processQueryRunResults(result, params, logger);
        }

        // Process the result
        const processedResult = resultProcessor(result, params);

        return {
          content: [{
            type: 'text' as const,
            text: processedResult
          }],
          isError: !result.success
        };

      } catch (error) {
        logger.error(`Error in CLI tool ${name}:`, error);
        
        return {
          content: [{
            type: 'text' as const,
            text: `Failed to execute CLI tool: ${error instanceof Error ? error.message : String(error)}`
          }],
          isError: true
        };
      } finally {
        // Clean up temporary directories
        for (const tempDir of tempDirsToCleanup) {
          try {
            rmSync(tempDir, { recursive: true, force: true });
            logger.info(`Cleaned up temporary directory: ${tempDir}`);
          } catch (cleanupError) {
            logger.error(`Failed to clean up temporary directory ${tempDir}:`, cleanupError);
          }
        }
      }
    }
  );
}

/**
 * Helper function to create common CodeQL input schemas
 */
export const createCodeQLSchemas = {
  database: () => z.string().describe('Path to the CodeQL database'),
  
  query: () => z.string().describe('Path to the CodeQL query file (.ql)'),
  
  output: () => z.string().optional().describe('Output file path'),
  
  outputFormat: () => z.enum(['csv', 'json', 'bqrs', 'sarif-latest', 'sarifv2.1.0']).optional()
    .describe('Output format for results'),
  
  language: () => z.string().optional().describe('Programming language'),
  
  threads: () => z.number().optional().describe('Number of threads to use'),
  
  ram: () => z.number().optional().describe('Amount of RAM to use (MB)'),
  
  timeout: () => z.number().optional().describe('Timeout in seconds'),
  
  verbose: () => z.boolean().optional().describe('Enable verbose output'),
  
  additionalArgs: () => z.array(z.string()).optional().describe('Additional command-line arguments'),
  
  positionalArgs: () => z.array(z.string()).optional().describe('Positional arguments')
    .transform((val) => ({ _positional: val }))
};

/**
 * Helper function to create common QLT input schemas
 */
export const createQLTSchemas = {
  language: () => z.string().describe('Programming language'),
  
  output: () => z.string().optional().describe('Output directory or file path'),
  
  template: () => z.string().optional().describe('Template to use'),
  
  name: () => z.string().optional().describe('Name for generated query'),
  
  description: () => z.string().optional().describe('Description for generated query'),
  
  verbose: () => z.boolean().optional().describe('Enable verbose output'),
  
  force: () => z.boolean().optional().describe('Force overwrite existing files'),
  
  additionalArgs: () => z.array(z.string()).optional().describe('Additional command-line arguments')
};

/**
 * Create a result processor that formats BQRS output specially
 */
export const createBQRSResultProcessor = () => (
  result: CLIExecutionResult, 
  params: Record<string, unknown>
): string => {
  if (!result.success) {
    return defaultCLIResultProcessor(result, params);
  }
  
  // For BQRS commands, provide more context about the output
  let output = result.stdout;
  
  if (params.output) {
    output += `\n\nResults saved to: ${params.output}`;
  }
  
  if (result.stderr) {
    output += `\n\nAdditional information:\n${result.stderr}`;
  }
  
  return output;
};

/**
 * Create a result processor that formats database creation output
 */
export const createDatabaseResultProcessor = () => (
  result: CLIExecutionResult, 
  params: Record<string, unknown>
): string => {
  if (!result.success) {
    return defaultCLIResultProcessor(result, params);
  }
  
  let output = 'Database creation completed successfully';
  
  if (params.database || params._positional) {
    const dbPath = params.database || (Array.isArray(params._positional) ? params._positional[0] : params._positional);
    output += `\n\nDatabase location: ${dbPath}`;
  }
  
  if (result.stdout) {
    output += `\n\nOutput:\n${result.stdout}`;
  }
  
  if (result.stderr) {
    output += `\n\nAdditional information:\n${result.stderr}`;
  }
  
  return output;
};

/**
 * Resolve query path for codeql_query_run tool
 * If queryName and queryLanguage are provided, resolve using codeql resolve queries
 */
async function resolveQueryPath(
  params: Record<string, unknown>, 
  logger: { info: (_message: string, ..._args: unknown[]) => void; error: (_message: string, ..._args: unknown[]) => void }
): Promise<string | null> {
  const { queryName, queryLanguage, queryPack, query } = params;
  
  // Validate parameter usage - queryName and query are mutually exclusive
  if (queryName && query) {
    logger.error('Cannot use both "query" and "queryName" parameters simultaneously. Use either "query" for direct file path OR "queryName" + "queryLanguage" for tool queries.');
    throw new Error('Cannot use both "query" and "queryName" parameters simultaneously. Use either "query" for direct file path OR "queryName" + "queryLanguage" for tool queries.');
  }
  
  // If no queryName provided, fall back to direct query parameter
  if (!queryName) {
    return query as string || null;
  }
  
  // If queryName provided but no language, we can't resolve
  if (!queryLanguage) {
    logger.error('queryLanguage is required when using queryName parameter. Supported languages: actions, cpp, csharp, go, java, javascript, python, ruby, swift');
    throw new Error('queryLanguage is required when using queryName parameter. Supported languages: actions, cpp, csharp, go, java, javascript, python, ruby, swift');
  }
  
  try {
    // Determine the query pack path - use absolute path to ensure it works regardless of cwd
    const defaultPackPath = resolveToolQueryPackPath(queryLanguage as string);
    const packPath = queryPack as string || defaultPackPath;
    
    logger.info(`Resolving query: ${queryName} for language: ${queryLanguage} in pack: ${packPath}`);
    
    // Execute codeql resolve queries to get available queries
    const { executeCodeQLCommand } = await import('./cli-executor');
    const resolveResult = await executeCodeQLCommand(
      'resolve queries',
      { format: 'json' },
      [packPath]
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
      throw new Error('Failed to parse resolve queries output');
    }
    
    // Find the query that matches the requested name exactly
    const matchingQuery = resolvedQueries.find(queryPath => {
      const fileName = basename(queryPath);
      // Match exact query name: "PrintAST" should match "PrintAST.ql" only
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

/**
 * Interpret BQRS file using codeql bqrs interpret
 */
async function interpretBQRSFile(
  bqrsPath: string,
  queryPath: string,
  format: string,
  outputPath: string,
  logger: { info: (_message: string, ..._args: unknown[]) => void; error: (_message: string, ..._args: unknown[]) => void }
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
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: '',
        error: `Query metadata is incomplete. Missing required field(s): ${missingFields.join(', ')}. Ensure the query file contains @id and @kind metadata.`
      };
    }
    
    // Sanitize metadata values to prevent command injection
    const sanitizedKind = (metadata.kind || '').replace(/[^a-zA-Z0-9_-]/g, '');
    const sanitizedId = (metadata.id || '').replace(/[^a-zA-Z0-9_/:-]/g, '');
    
    // Validate format for query kind
    const graphFormats = ['graphtext', 'dgml', 'dot'];
    if (graphFormats.includes(format) && metadata.kind !== 'graph') {
      return {
        success: false,
        exitCode: 1,
        stdout: '',
        stderr: '',
        error: `Format '${format}' is only compatible with @kind graph queries, but this query has @kind ${metadata.kind}`
      };
    }
    
    // Ensure output directory exists
    mkdirSync(dirname(outputPath), { recursive: true });
    
    // Build the codeql bqrs interpret command
    const params: Record<string, unknown> = {
      format: format,
      output: outputPath,
      t: [`kind=${sanitizedKind}`, `id=${sanitizedId}`]
    };
    
    logger.info(`Interpreting BQRS file ${bqrsPath} with format ${format} to ${outputPath}`);
    
    // Execute codeql bqrs interpret
    const result = await executeCodeQLCommand(
      'bqrs interpret',
      params,
      [bqrsPath]
    );
    
    return result;
  } catch (error) {
    return {
      success: false,
      exitCode: 1,
      stdout: '',
      stderr: '',
      error: `Failed to interpret BQRS file: ${error}`
    };
  }
}

/**
 * Get default output extension based on format
 */
function getDefaultExtension(format: string): string {
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
 * Process query run results with optional interpretation or evaluation
 */
async function processQueryRunResults(
  result: CLIExecutionResult,
  params: Record<string, unknown>,
  logger: { info: (_message: string, ..._args: unknown[]) => void; error: (_message: string, ..._args: unknown[]) => void }
): Promise<CLIExecutionResult> {
  try {
    const { format, interpretedOutput, evaluationFunction, evaluationOutput, output, query, queryName, queryLanguage } = params;
    
    // If no format or evaluationFunction specified, return as-is
    if (!format && !evaluationFunction) {
      return result;
    }
    
    // Ensure output (bqrs file) was generated
    if (!output) {
      return result;
    }
    
    const bqrsPath = output as string;
    
    // Determine the query path for metadata extraction
    let queryPath: string | null = null;
    
    if (query) {
      queryPath = query as string;
    } else if (queryName && queryLanguage) {
      // Try to resolve the query path again for evaluation
      queryPath = await resolveQueryPath(params, logger);
    }
    
    if (!queryPath) {
      logger.error('Cannot determine query path for interpretation/evaluation');
      return {
        ...result,
        stdout: result.stdout + '\n\nWarning: Query interpretation skipped - could not determine query path'
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
      const interpretResult = await interpretBQRSFile(
        bqrsPath,
        queryPath,
        outputFormat,
        outputFilePath,
        logger
      );
      
      if (interpretResult.success) {
        let enhancedOutput = result.stdout;
        enhancedOutput += `\n\nQuery results interpreted successfully with format: ${outputFormat}`;
        enhancedOutput += `\nInterpreted output saved to: ${outputFilePath}`;
        
        return {
          ...result,
          stdout: enhancedOutput
        };
      } else {
        logger.error('Query interpretation failed:', interpretResult.error);
        return {
          ...result,
          stdout: result.stdout + `\n\nWarning: Query interpretation failed - ${interpretResult.error || interpretResult.stderr}`
        };
      }
    }
    
    // Handle legacy evaluationFunction parameter (deprecated)
    if (evaluationFunction) {
      logger.info(`Using deprecated evaluationFunction parameter. Consider using format parameter instead.`);
      logger.info(`Evaluating query results from ${bqrsPath} using function: ${evaluationFunction}`);
      
      // Perform the evaluation
      const evaluationResult: QueryEvaluationResult = await evaluateQueryResults(
        bqrsPath,
        queryPath,
        evaluationFunction as string,
        evaluationOutput as string | undefined
      );
      
      if (evaluationResult.success) {
        // Append evaluation results to the command output
        let enhancedOutput = result.stdout;
        
        if (evaluationResult.outputPath) {
          enhancedOutput += `\n\nQuery evaluation completed successfully.`;
          enhancedOutput += `\nEvaluation output saved to: ${evaluationResult.outputPath}`;
        }
        
        if (evaluationResult.content) {
          enhancedOutput += `\n\n=== Query Results Evaluation ===\n`;
          enhancedOutput += evaluationResult.content;
        }
        
        return {
          ...result,
          stdout: enhancedOutput
        };
      } else {
        // Evaluation failed, but don't fail the whole operation
        logger.error('Query evaluation failed:', evaluationResult.error);
        return {
          ...result,
          stdout: result.stdout + `\n\nWarning: Query evaluation failed - ${evaluationResult.error}`
        };
      }
    }
    
    return result;
  } catch (error) {
    logger.error('Error in query results processing:', error);
    return {
      ...result,
      stdout: result.stdout + `\n\nWarning: Query processing error - ${error}`
    };
  }
}