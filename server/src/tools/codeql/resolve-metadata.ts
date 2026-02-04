/**
 * CodeQL resolve metadata tool
 */

import { z } from 'zod';
import { CLIToolDefinition, defaultCLIResultProcessor } from '../../lib/cli-tool-registry';

export const codeqlResolveMetadataTool: CLIToolDefinition = {
  name: 'codeql_resolve_metadata',
  description: 'Resolve and return the key-value metadata pairs from a CodeQL query source file.',
  command: 'codeql',
  subcommand: 'resolve metadata',
  inputSchema: {
    query: z.string().describe('Query file to resolve metadata for'),
    format: z.enum(['json']).optional()
      .describe('Output format for metadata information (always JSON, optional for future compatibility)'),
    verbose: z.boolean().optional().describe('Enable verbose output'),
    additionalArgs: z.array(z.string()).optional().describe('Additional command-line arguments')
  },
  examples: [
    'codeql resolve metadata -- relative-path/2/MyQuery.ql',
    'codeql resolve metadata --format=json -- /absolute-plus/relative-path/2/MyQuery.ql'
  ],
  resultProcessor: defaultCLIResultProcessor
};