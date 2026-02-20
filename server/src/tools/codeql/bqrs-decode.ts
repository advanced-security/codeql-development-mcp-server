/**
 * CodeQL BQRS decode tool
 *
 * Decodes BQRS (Binary Query Result Set) files to human-readable formats.
 * Use `list_query_run_results` to discover BQRS files from previous query runs,
 * then decode them with this tool. For long-running queries (codeql_query_run)
 * or suites (codeql_database_analyze), the BQRS file is located at
 * `<runDir>/results.bqrs`. Use `codeql_bqrs_info` first to discover available
 * result sets and column schemas.
 */

import { z } from 'zod';
import { CLIToolDefinition, createCodeQLSchemas, createBQRSResultProcessor } from '../../lib/cli-tool-registry';

export const codeqlBqrsDecodeTool: CLIToolDefinition = {
  name: 'codeql_bqrs_decode',
  description:
    'Decode BQRS result files to human-readable formats (text, csv, json). ' +
    'Typical workflow: (1) use list_query_run_results to find BQRS paths from previous codeql_query_run or codeql_database_analyze runs, ' +
    '(2) use codeql_bqrs_info to discover result sets and column schemas, ' +
    '(3) decode specific result sets with this tool. ' +
    'For large result sets, use --rows to paginate.',
  command: 'codeql',
  subcommand: 'bqrs decode',
  inputSchema: {
    files: z.array(z.string()).describe('BQRS file(s) to decode'),
    output: createCodeQLSchemas.output(),
    format: z.enum(['csv', 'json', 'text', 'bqrs']).optional()
      .describe('Output format: text (human-readable table, default), csv, json (streaming JSON), or bqrs (binary, requires --output)'),
    'result-set': z.string().optional()
      .describe('Decode a specific result set by name (use codeql_bqrs_info to list available sets). If omitted, all result sets are decoded.'),
    'sort-key': z.string().optional()
      .describe('Sort by column(s): comma-separated column indices (0-based)'),
    'sort-direction': z.string().optional()
      .describe('Sort direction(s): comma-separated "asc" or "desc" per column'),
    'no-titles': z.boolean().optional()
      .describe('Omit column titles for text and csv formats'),
    entities: z.string().optional()
      .describe('Control entity column display: comma-separated list of url, string, id, all'),
    rows: z.number().optional()
      .describe('Maximum number of rows to output (for pagination). Use with --start-at for paging.'),
    'start-at': z.number().optional()
      .describe('Byte offset to start decoding from (get from codeql_bqrs_info or previous JSON output "next" pointer). Must be used with --rows.'),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    'codeql bqrs decode --format=csv --output=results.csv results.bqrs',
    'codeql bqrs decode --format=json --rows=100 results.bqrs',
    'codeql bqrs decode --result-set=#select --format=csv results.bqrs',
    'codeql bqrs decode --format=json --entities=url,string results.bqrs'
  ],
  resultProcessor: createBQRSResultProcessor()
};