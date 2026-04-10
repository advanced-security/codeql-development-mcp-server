/**
 * CodeQL query compile tool
 */

import { z } from 'zod';
import { CLIToolDefinition } from '../../lib/cli-tool-registry';

export const codeqlQueryCompileTool: CLIToolDefinition = {
  name: 'codeql_query_compile',
  description: 'Compile and validate CodeQL queries. By default, produces a .dil file containing the optimized DIL intermediate representation alongside the compilation output.',
  command: 'codeql',
  subcommand: 'query compile',
  inputSchema: {
    query: z.string().describe('Path to the CodeQL query file (.ql)'),
    database: z.string().optional().describe('Path to the CodeQL database'),
    'dump-dil': z.boolean().optional()
      .describe('Print the optimized DIL intermediate representation to standard output while compiling. Enabled by default; pass false or --no-dump-dil to disable.'),
    library: z.string().optional().describe('Path to query library'),
    logDir: z.string().optional()
      .describe('Directory to write the .dil file. If not provided, a unique log directory is created automatically.'),
    output: z.string().optional().describe('Output file path'),
    warnings: z.enum(['hide', 'show', 'error']).optional()
      .describe('How to handle compilation warnings'),
    verbose: z.boolean().optional().describe('Enable verbose output'),
    additionalArgs: z.array(z.string()).optional().describe('Additional command-line arguments')
  },
  examples: [
    'codeql query compile --database=/path/to/db MyQuery.ql',
    'codeql query compile --dump-dil --database=/path/to/db MyQuery.ql',
    'codeql query compile --library=/path/to/lib --output=compiled.qlo MyQuery.ql'
  ]
};