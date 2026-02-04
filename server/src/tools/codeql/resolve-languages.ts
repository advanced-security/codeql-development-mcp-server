/**
 * CodeQL resolve languages tool
 */

import { z } from 'zod';
import { CLIToolDefinition, defaultCLIResultProcessor } from '../../lib/cli-tool-registry';

export const codeqlResolveLanguagesTool: CLIToolDefinition = {
  name: 'codeql_resolve_languages',
  description: 'List installed CodeQL extractor packs',
  command: 'codeql',
  subcommand: 'resolve languages',
  inputSchema: {
    format: z.enum(['text', 'json', 'betterjson']).optional()
      .describe('Output format for language information'),
    verbose: z.boolean().optional().describe('Enable verbose output'),
    additionalArgs: z.array(z.string()).optional().describe('Additional command-line arguments')
  },
  examples: [
    'codeql resolve languages --format=text',
    'codeql resolve languages --format=json',
    'codeql resolve languages --format=betterjson'
  ],
  resultProcessor: defaultCLIResultProcessor
};