/**
 * Generic tool registry for creating MCP tools from CLI command definitions
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { CLIExecutionResult, executeCodeQLCommand, executeQLTCommand } from './cli-executor';
import { resolveDatabasePath } from './database-resolver';
import { logger } from '../utils/logger';
import { getOrCreateLogDirectory } from './log-directory-manager';
import { resolveQueryPath } from './query-resolver';
import { interpretBQRSFile, processQueryRunResults } from './result-processor';
import { getUserWorkspaceDir, packageRootDir } from '../utils/package-paths';
import { writeFileSync, rmSync, existsSync, mkdirSync } from 'fs';
import { dirname, isAbsolute, join, resolve } from 'path';
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
        // For codeql_bqrs_interpret, codeql_bqrs_decode, codeql_bqrs_info, codeql_generate_query-help, and codeql_database_analyze, format should be passed to CLI
        const formatShouldBePassedToCLI = name === 'codeql_bqrs_interpret' || name === 'codeql_bqrs_decode' || name === 'codeql_bqrs_info' || name === 'codeql_generate_query-help' || name === 'codeql_database_analyze' || name === 'codeql_resolve_files';
        
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
          positionalArgs = [...positionalArgs, resolveDatabasePath(options.database as string)];
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
            positionalArgs = [...positionalArgs, resolveDatabasePath(options.database as string)];
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
            // Resolve relative paths against the user's effective workspace
            // directory. In monorepo layouts this is the repo root; in npm-
            // installed layouts it falls back to process.cwd().
            if (tests && Array.isArray(tests)) {
              const userDir = getUserWorkspaceDir();
              positionalArgs = [...positionalArgs, ...(tests as string[]).map(
                t => isAbsolute(t) ? t : resolve(userDir, t)
              )];
            }
            break;
            
          case 'codeql_query_run': {
            // Resolve database path to absolute path if it's relative
            if (options.database && typeof options.database === 'string' && !isAbsolute(options.database)) {
              options.database = resolve(getUserWorkspaceDir(), options.database);
              logger.info(`Resolved database path to: ${options.database}`);
            }
            // Auto-resolve multi-language DB root to language subfolder
            if (options.database && typeof options.database === 'string') {
              options.database = resolveDatabasePath(options.database);
            }
            
            // Implement query resolution logic with enhanced results processing
            const resolvedQuery = await resolveQueryPath(params, logger);
            if (resolvedQuery) {
              positionalArgs = [...positionalArgs, resolvedQuery];
              // Store the resolved path so processQueryRunResults can reuse it
              // without calling resolveQueryPath a second time
              params._resolvedQueryPath = resolvedQuery;
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

            // Handle external predicates for CallGraphFromTo queries (needs both source and target)
            if (queryName === 'CallGraphFromTo') {
              if (sourceFunction) {
                const functionNames = (sourceFunction as string).split(',').map((f: string) => f.trim());
                let tempDir: string;
                let csvPath: string;
                try {
                  tempDir = createProjectTempDir('codeql-external-');
                  tempDirsToCleanup.push(tempDir);
                  csvPath = join(tempDir, 'sourceFunction.csv');
                  writeFileSync(csvPath, functionNames.join('\n') + '\n', 'utf8');
                } catch (err) {
                  logger.error(`Failed to create external predicate CSV for CallGraphFromTo sourceFunction at path ${csvPath || '[unknown]'}: ${err instanceof Error ? err.message : String(err)}`);
                  throw err;
                }
                const currentExternal = options.external || [];
                const externalArray = Array.isArray(currentExternal) ? currentExternal : [currentExternal];
                externalArray.push(`sourceFunction=${csvPath}`);
                options.external = externalArray;
                logger.info(`Created sourceFunction CSV at ${csvPath} for CallGraphFromTo: ${functionNames.join(', ')}`);
              }
              if (targetFunction) {
                const functionNames = (targetFunction as string).split(',').map((f: string) => f.trim());
                let tempDir: string;
                let csvPath: string;
                try {
                  tempDir = createProjectTempDir('codeql-external-');
                  tempDirsToCleanup.push(tempDir);
                  csvPath = join(tempDir, 'targetFunction.csv');
                  writeFileSync(csvPath, functionNames.join('\n') + '\n', 'utf8');
                } catch (err) {
                  logger.error(`Failed to create external predicate CSV for CallGraphFromTo targetFunction at path ${csvPath || '[unknown]'}: ${err instanceof Error ? err.message : String(err)}`);
                  throw err;
                }
                const currentExternal = options.external || [];
                const externalArray = Array.isArray(currentExternal) ? currentExternal : [currentExternal];
                externalArray.push(`targetFunction=${csvPath}`);
                options.external = externalArray;
                logger.info(`Created targetFunction CSV at ${csvPath} for CallGraphFromTo: ${functionNames.join(', ')}`);
              }
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

          case 'codeql_resolve_library-path':
            // --query is a named flag for resolve library-path, not positional.
            // It was extracted from options so we need to restore it.
            if (query) {
              options.query = query;
            }
            break;
            
          case 'codeql_resolve_queries':
            // Handle directory parameter as positional argument
            if (directory) {
              positionalArgs = [...positionalArgs, directory as string];
            }
            break;

          case 'codeql_resolve_files':
            // Handle dir parameter as positional argument
            if (dir) {
              positionalArgs = [...positionalArgs, dir as string];
            }
            break;
            
          default:
            // No special parameter handling needed for other tools
            break;
        }

        // Set up logging directory for query/test/analyze runs
        let queryLogDir: string | undefined;
        if (name === 'codeql_query_run' || name === 'codeql_test_run' || name === 'codeql_database_analyze') {
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

          // Set evaluator-log if not explicitly provided
          if (!options['evaluator-log']) {
            options['evaluator-log'] = join(queryLogDir, 'evaluator-log.jsonl');
          }

          // Enable --tuple-counting by default for evaluator logging
          if (options['tuple-counting'] === undefined) {
            options['tuple-counting'] = true;
          }

          // For query run, also handle default output
          if (name === 'codeql_query_run') {
            // If output was not explicitly provided, set it to the log directory
            if (!options.output) {
              options.output = join(queryLogDir, 'results.bqrs');
            }
          }

          // Ensure the parent directory of --output exists (the CLI will not create it)
          if (options.output && typeof options.output === 'string') {
            const outputDir = dirname(options.output);
            mkdirSync(outputDir, { recursive: true });
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
            // Resolve relative paths against the user's effective workspace
            // directory rather than a potentially read-only package root.
            cwd = isAbsolute(rawCwd) ? rawCwd : resolve(getUserWorkspaceDir(), rawCwd);
          }
          
          // Add --additional-packs for commands that need to access local test packs.
          // Only set the default examples path when it actually exists on disk
          // (it may be absent in npm-installed layouts where ql/javascript/examples/
          // is not included in the published package).
          const defaultExamplesPath = resolve(packageRootDir, 'ql', 'javascript', 'examples');
          const additionalPacksPath = process.env.CODEQL_ADDITIONAL_PACKS
            || (existsSync(defaultExamplesPath) ? defaultExamplesPath : undefined);
          if (additionalPacksPath && (name === 'codeql_test_run' || name === 'codeql_query_run' || name === 'codeql_query_compile' || name === 'codeql_database_analyze')) {
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
          // Generate SARIF interpretation if results.bqrs exists and query path is known
          const bqrsPath = options.output as string;
          const sarifPath = join(queryLogDir, 'results-interpreted.sarif');

          // The query file path is the last positional argument (set during query resolution)
          const queryFilePath = positionalArgs.length > 0 ? positionalArgs[positionalArgs.length - 1] : undefined;

          if (existsSync(bqrsPath) && queryFilePath) {
            try {
              const sarifResult = await interpretBQRSFile(
                bqrsPath,
                queryFilePath,
                'sarif-latest',
                sarifPath,
                logger
              );

              if (sarifResult.success) {
                logger.info(`Generated SARIF interpretation at ${sarifPath}`);
              } else {
                logger.warn(`SARIF interpretation returned error: ${sarifResult.error || sarifResult.stderr}`);
              }
            } catch (error) {
              logger.warn(`Failed to generate SARIF interpretation: ${error}`);
            }
          } else if (existsSync(bqrsPath) && !queryFilePath) {
            logger.warn('Skipping SARIF interpretation: query file path not available');
          }

          // Process evaluation results
          result = await processQueryRunResults(result, params, logger);
        }

        // Post-execution: generate evaluator log summary for query run / database analyze
        if ((name === 'codeql_query_run' || name === 'codeql_database_analyze') && result.success && queryLogDir) {
          const evalLogPath = options['evaluator-log'] as string | undefined;
          if (evalLogPath && existsSync(evalLogPath)) {
            try {
              const summaryPath = evalLogPath.replace(/\.jsonl$/, '.summary.jsonl');
              // codeql generate log-summary takes positional args: <input> [<result>]
              const summaryResult = await executeCodeQLCommand(
                'generate log-summary',
                { format: 'predicates' },
                [evalLogPath, summaryPath]
              );

              if (summaryResult.success) {
                logger.info(`Generated evaluator log summary at ${summaryPath}`);
              }
            } catch (error) {
              logger.warn(`Failed to generate evaluator log summary: ${error}`);
            }
          }
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