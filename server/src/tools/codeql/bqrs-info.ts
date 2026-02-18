/**
 * CodeQL BQRS info tool
 *
 * Lists result sets, column schemas, and row counts in a BQRS file.
 * Use this tool before codeql_bqrs_decode to discover available result
 * sets and their column types. BQRS files are produced by codeql_query_run
 * and codeql_database_analyze — use list_query_run_results to find them.
 */

import { z } from 'zod';
import { CLIToolDefinition, createCodeQLSchemas, createBQRSResultProcessor } from '../../lib/cli-tool-registry';

export const codeqlBqrsInfoTool: CLIToolDefinition = {
  name: 'codeql_bqrs_info',
  description:
    'Get metadata about BQRS result files: lists result sets, column names/types, and row counts. ' +
    'Use before codeql_bqrs_decode to discover available result sets (e.g., "#select", "edges", "nodes"). ' +
    'BQRS files are found at <runDir>/results.bqrs — use list_query_run_results to discover them. ' +
    'Use --format=json with --paginate-rows to get byte offsets for paginated decoding with codeql_bqrs_decode --start-at.',
  command: 'codeql',
  subcommand: 'bqrs info',
  inputSchema: {
    files: z.array(z.string()).describe('BQRS file(s) to examine'),
    format: z.enum(['text', 'json']).optional()
      .describe('Output format: text (default) or json. Use json for machine-readable output and pagination offset computation.'),
    'paginate-rows': z.number().optional()
      .describe('Compute byte offsets for pagination at intervals of this many rows. Use with --format=json. Offsets can be passed to codeql_bqrs_decode --start-at.'),
    'paginate-result-set': z.string().optional()
      .describe('Compute pagination offsets only for this result set name'),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    'codeql bqrs info results.bqrs',
    'codeql bqrs info --format=json results.bqrs',
    'codeql bqrs info --format=json --paginate-rows=100 --paginate-result-set=#select results.bqrs'
  ],
  resultProcessor: createBQRSResultProcessor()
};