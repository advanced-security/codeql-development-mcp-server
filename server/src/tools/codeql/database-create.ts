/**
 * CodeQL database create tool
 */

import { z } from 'zod';
import { CLIToolDefinition, createDatabaseResultProcessor } from '../../lib/cli-tool-registry';

export const codeqlDatabaseCreateTool: CLIToolDefinition = {
  name: 'codeql_database_create',
  description: 'Create a CodeQL database from source code',
  command: 'codeql',
  subcommand: 'database create',
  inputSchema: {
    database: z.string().describe('Database path/name to create'),
    language: z.string().optional().describe('Programming language(s) to extract'),
    'source-root': z.string().optional().describe('Root directory of source code'),
    command: z.string().optional().describe('Build command for compiled languages'),
    'build-mode': z.enum(['none', 'autobuild', 'manual']).optional()
      .describe('Build mode: none (interpreted langs), autobuild, or manual'),
    threads: z.number().optional().describe('Number of threads to use'),
    ram: z.number().optional().describe('Amount of RAM to use (MB)'),
    verbose: z.boolean().optional().describe('Enable verbose output'),
    'no-cleanup': z.boolean().optional().describe('Skip database cleanup after finalization'),
    additionalArgs: z.array(z.string()).optional().describe('Additional command-line arguments')
  },
  examples: [
    'codeql database create --language=java --source-root=/path/to/project mydb',
    'codeql database create --language=cpp --command="make all" mydb',
    'codeql database create --language=python,javascript mydb'
  ],
  resultProcessor: createDatabaseResultProcessor()
};