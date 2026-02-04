/**
 * CodeQL resolve library-path tool
 */

import { z } from 'zod';
import { CLIToolDefinition, defaultCLIResultProcessor } from '../../lib/cli-tool-registry';

export const codeqlResolveLibraryPathTool: CLIToolDefinition = {
  name: 'codeql_resolve_library-path',
  description: 'Resolve library path for CodeQL queries and libraries',
  command: 'codeql',
  subcommand: 'resolve library-path',
  inputSchema: {
    language: z.string().optional().describe('Programming language to resolve library path for'),
    format: z.enum(['text', 'json', 'betterjson']).optional()
      .describe('Output format for library path information'),
    verbose: z.boolean().optional().describe('Enable verbose output'),
    additionalArgs: z.array(z.string()).optional().describe('Additional command-line arguments')
  },
  examples: [
    'codeql resolve library-path --language=java',
    'codeql resolve library-path --format=json --language=python',
    'codeql resolve library-path --format=betterjson'
  ],
  resultProcessor: defaultCLIResultProcessor
};