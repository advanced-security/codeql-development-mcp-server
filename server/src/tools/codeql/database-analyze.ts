/**
 * CodeQL database analyze tool
 */

import { z } from 'zod';
import { CLIToolDefinition } from '../../lib/cli-tool-registry';

export const codeqlDatabaseAnalyzeTool: CLIToolDefinition = {
  name: 'codeql_database_analyze',
  description: 'Run queries or query suites against CodeQL databases',
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
    verbose: z.boolean().optional().describe('Enable verbose output'),
    additionalArgs: z.array(z.string()).optional().describe('Additional command-line arguments')
  },
  examples: [
    'codeql database analyze mydb queries.qls --format=sarif-latest --output=results.sarif',
    'codeql database analyze mydb codeql/java-queries --format=csv'
  ]
};