/**
 * CodeQL database analyze tool
 */

import { z } from 'zod';
import { CLIToolDefinition } from '../../lib/cli-tool-registry';

export const codeqlDatabaseAnalyzeTool: CLIToolDefinition = {
  name: 'codeql_database_analyze',
  description:
    'Run queries or query suites against CodeQL databases. ' +
    'Produces evaluator logs, BQRS results, and optionally SARIF output. ' +
    'Use list_codeql_databases to discover available databases, and register_database to register new ones. ' +
    'After analysis completes, use list_query_run_results to find result artifacts, then codeql_bqrs_info and codeql_bqrs_decode to inspect results.',
  command: 'codeql',
  subcommand: 'database analyze',
  inputSchema: {
    database: z.string().describe('Path to the CodeQL database'),
    queries: z.string().describe('Queries or query suite to run'),
    output: z.string().optional().describe('Output file path'),
    format: z.enum(['csv', 'json', 'sarif-latest', 'sarifv2.1.0']).optional()
      .describe('Output format for results'),
    'download-location': z.string().optional()
      .describe('Location to download missing dependencies'),
    threads: z.number().optional().describe('Number of threads to use'),
    ram: z.number().optional().describe('Amount of RAM to use (MB)'),
    timeout: z.number().optional().describe('Timeout in seconds'),
    logDir: z.string().optional()
      .describe('Custom directory for analysis execution logs (overrides CODEQL_QUERY_LOG_DIR environment variable). If not provided, uses CODEQL_QUERY_LOG_DIR or defaults to .tmp/query-logs/<unique-id>'),
    'evaluator-log': z.string().optional()
      .describe('Path to save evaluator log. If not provided and logDir is set, defaults to <logDir>/evaluator-log.jsonl'),
    'tuple-counting': z.boolean().optional()
      .describe('Display tuple counts for each evaluation step in evaluator logs'),
    'evaluator-log-level': z.number().min(1).max(5).optional()
      .describe('Evaluator log verbosity level (1-5, default 5)'),
    rerun: z.boolean().optional()
      .describe('Force re-evaluation of queries even if BQRS results already exist in the database. Without this, cached results are reused.'),
    verbose: z.boolean().optional().describe('Enable verbose output'),
    additionalArgs: z.array(z.string()).optional().describe('Additional command-line arguments')
  },
  examples: [
    'codeql database analyze mydb queries.qls --format=sarif-latest --output=results.sarif',
    'codeql database analyze mydb codeql/java-queries --format=csv',
    'codeql database analyze mydb queries.qls --format=sarif-latest --output=results.sarif --rerun --tuple-counting'
  ]
};