/**
 * CodeQL resolve library-path tool
 */

import { z } from 'zod';
import { CLIToolDefinition, defaultCLIResultProcessor } from '../../lib/cli-tool-registry';

export const codeqlResolveLibraryPathTool: CLIToolDefinition = {
  name: 'codeql_resolve_library-path',
  description: 'Resolve paths to source code for all libraries used by, or available to, the given CodeQL query or qll file.',
  command: 'codeql',
  subcommand: 'resolve library-path',
  inputSchema: {
    query: z.string().describe('Path to a .ql or .qll file for the context to perform resolution for.'),
    format: z.enum(['text', 'json', 'betterjson']).optional()
      .describe('Output format for library path information'),
    verbose: z.boolean().optional().describe('Enable verbose output'),
    additionalArgs: z.array(z.string()).optional().describe('Additional command-line arguments')
  },
  examples: [
    'codeql resolve library-path --query=/path/to/query.ql',
    'codeql resolve library-path --format=json --query=/path/to/query.ql',
    'codeql resolve library-path --format=betterjson --query=/path/to/query.ql'
  ],
  resultProcessor: defaultCLIResultProcessor
};