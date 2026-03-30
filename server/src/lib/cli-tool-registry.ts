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
import { processQueryRunResults } from './result-processor';
import { getUserWorkspaceDir, packageRootDir } from '../utils/package-paths';
import { writeFileSync, rmSync, existsSync, mkdirSync } from 'fs';
import { delimiter, dirname, isAbsolute, join, resolve } from 'path';
import * as yaml from 'js-yaml';
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
            
            // Handle extensible predicates for tool queries via data extensions.
            // Instead of CSV files + --external flags, we create a temporary
            // extension pack with a codeql-pack.yml and data extension YAML that
            // injects values into the src pack's extensible predicates.
            const extensiblePredicates: Record<string, string[]> = {};
            
            if ((queryName === 'PrintAST' || queryName === 'PrintCFG') && sourceFiles) {
              const filePaths = (sourceFiles as string).split(',').map((f: string) => f.trim()).filter((f: string) => f.length > 0);
              if (filePaths.length > 0) {
                extensiblePredicates['selectedSourceFiles'] = filePaths;
              }
            }

            if (sourceFunction) {
              const functionNames = (sourceFunction as string).split(',').map((f: string) => f.trim()).filter((f: string) => f.length > 0);
              if (functionNames.length > 0) {
                extensiblePredicates['sourceFunction'] = functionNames;
              }
            }

            if (targetFunction) {
              const functionNames = (targetFunction as string).split(',').map((f: string) => f.trim()).filter((f: string) => f.length > 0);
              if (functionNames.length > 0) {
                extensiblePredicates['targetFunction'] = functionNames;
              }
            }
            
            if (Object.keys(extensiblePredicates).length > 0) {
              // Derive the target pack name from queryLanguage or query path
              let targetPackName: string | undefined;
              if (_queryLanguage) {
                targetPackName = `advanced-security/ql-mcp-${_queryLanguage}-tools-src`;
              } else if (query && typeof query === 'string') {
                // Extract language from query path: .../ql/{lang}/tools/src/...
                // Normalize backslashes for Windows compatibility
                const normalizedQuery = (query as string).replace(/\\/g, '/');
                const match = normalizedQuery.match(/\/ql\/([^/]+)\/tools\/src\//);
                if (match) {
                  targetPackName = `advanced-security/ql-mcp-${match[1]}-tools-src`;
                }
              }
              
              if (targetPackName) {
                try {
                  const extPackDir = createProjectTempDir('codeql-ext-pack-');
                  tempDirsToCleanup.push(extPackDir);
                  
                  // Create codeql-pack.yml for the temporary extension pack
                  const qlpackContent = [
                    'library: true',
                    'name: advanced-security/ql-mcp-runtime-extensions',
                    'version: 0.0.0',
                    'extensionTargets:',
                    `  ${targetPackName}: "*"`,
                    'dataExtensions:',
                    '  - "ext/*.model.yml"',
                    '',
                  ].join('\n');
                  writeFileSync(join(extPackDir, 'codeql-pack.yml'), qlpackContent, 'utf8');
                  
                  // Create ext/ directory and data extension YAML
                  const extDir = join(extPackDir, 'ext');
                  mkdirSync(extDir, { recursive: true });
                  
                  // Build the YAML data extensions content using js-yaml for safe serialization
                  const extensionsData = {
                    extensions: Object.entries(extensiblePredicates).map(([predName, values]) => ({
                      addsTo: {
                        pack: targetPackName,
                        extensible: predName,
                      },
                      data: values.map((val) => [val]),
                    })),
                  };
                  
                  writeFileSync(join(extDir, 'runtime.model.yml'), yaml.dump(extensionsData, { lineWidth: -1, flowLevel: 4 }), 'utf8');
                  
                  // Add the extension pack directory to --additional-packs so it can be resolved
                  const existingPacks = options['additional-packs'] as string | undefined;
                  options['additional-packs'] = existingPacks
                    ? `${existingPacks}${delimiter}${extPackDir}`
                    : extPackDir;
                  
                  // Use --model-packs to activate the extension pack for extensible predicates
                  const modelPacks = options['model-packs'] as string[] | undefined;
                  const modelPacksArray = Array.isArray(modelPacks) ? modelPacks : [];
                  modelPacksArray.push('advanced-security/ql-mcp-runtime-extensions@0.0.0');
                  options['model-packs'] = modelPacksArray;
                  
                  logger.info(`Created runtime extension pack at ${extPackDir} targeting ${targetPackName} with predicates: ${Object.keys(extensiblePredicates).join(', ')}`);
                } catch (err) {
                  logger.error(`Failed to create runtime extension pack: ${err instanceof Error ? err.message : String(err)}`);
                  throw err;
                }
              } else {
                logger.warn('Could not determine target pack name for extensible predicates — queryLanguage not set and query path does not match expected pattern');
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

        // Extract additionalArgs from options so they are passed as raw CLI
        // arguments instead of being transformed into --additionalArgs=value
        // by buildCodeQLArgs.
        const rawAdditionalArgs = Array.isArray(options.additionalArgs)
          ? options.additionalArgs as string[]
          : [];
        delete options.additionalArgs;

        // For tools with post-execution processing (query run, test run,
        // database analyze), certain CLI flags are set internally and their
        // values are read back after execution (e.g. --evaluator-log for log
        // summary generation, --output for SARIF interpretation).  If a user
        // passes these flags via additionalArgs the CLI would receive
        // conflicting duplicates and the post-processing would use stale
        // values from the options object.  Filter them out and log a warning
        // directing the user to the corresponding named parameter instead.
        const managedFlagNames = new Set([
          'evaluator-log',
          'logdir',
          'output',
          'tuple-counting',
          'verbosity',
        ]);
        const userAdditionalArgs = queryLogDir
          ? (() => {
              const filteredAdditionalArgs: string[] = [];

              for (let i = 0; i < rawAdditionalArgs.length; i += 1) {
                const arg = rawAdditionalArgs[i];
                const m = arg.match(/^--(?:no-)?([^=]+)(?:=.*)?$/);

                if (m && managedFlagNames.has(m[1])) {
                  logger.warn(
                    `Ignoring "${arg}" from additionalArgs for ${name}: ` +
                    'this flag is managed internally. Use the corresponding named parameter instead.'
                  );

                  // Always skip the managed flag itself. If it is provided in
                  // space-separated form (e.g. ["--output", "file.sarif"]),
                  // also skip the following token as its value so it does not
                  // become a stray positional argument.
                  const hasInlineValue = arg.includes('=');
                  if (!hasInlineValue && i + 1 < rawAdditionalArgs.length) {
                    i += 1;
                  }

                  continue;
                }

                filteredAdditionalArgs.push(arg);
              }

              return filteredAdditionalArgs;
            })()
          : rawAdditionalArgs;

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
            const existingAdditionalPacks = options['additional-packs'] as string | undefined;
            options['additional-packs'] = existingAdditionalPacks
              ? `${existingAdditionalPacks}${delimiter}${additionalPacksPath}`
              : additionalPacksPath;
          }
          
          // Keep test databases for codeql_test_run to allow subsequent query runs
          if (name === 'codeql_test_run') {
            options['keep-databases'] = true;
          }
          
          result = await executeCodeQLCommand(subcommand, options, [...positionalArgs, ...userAdditionalArgs], cwd);
        } else if (command === 'qlt') {
          result = await executeQLTCommand(subcommand, options, [...positionalArgs, ...userAdditionalArgs]);
        } else {
          throw new Error(`Unsupported command: ${command}`);
        }

        // Post-execution processing for codeql_query_run
        if (name === 'codeql_query_run' && result.success && queryLogDir) {
          // Ensure params has the output path (may have been auto-set in options)
          if (!params.output && options.output) {
            params.output = options.output;
          }
          // Process query results: interpretation (SARIF/graphtext/CSV) + auto-caching
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
