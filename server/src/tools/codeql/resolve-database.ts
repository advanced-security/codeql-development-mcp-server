/**
 * CodeQL resolve database tool
 */

import { z } from 'zod';
import { CLIToolDefinition, createCodeQLSchemas, defaultCLIResultProcessor } from '../../lib/cli-tool-registry';

export const codeqlResolveDatabaseTool: CLIToolDefinition = {
  name: 'codeql_resolve_database',
  description: 'Resolve database path and validate database structure',
  command: 'codeql',
  subcommand: 'resolve database',
  inputSchema: {
    database: z.string().describe('Database path to resolve'),
    format: z.enum(['text', 'json', 'betterjson']).optional()
      .describe('Output format for database information'),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    'codeql resolve database -- /path/to/database',
    'codeql resolve database --format=json -- my-database',
    'codeql resolve database --format=betterjson -- database-dir'
  ],
  resultProcessor: defaultCLIResultProcessor
};