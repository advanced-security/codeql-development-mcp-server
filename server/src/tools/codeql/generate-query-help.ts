/**
 * CodeQL generate query-help tool
 */

import { z } from 'zod';
import { CLIToolDefinition, createCodeQLSchemas, defaultCLIResultProcessor } from '../../lib/cli-tool-registry';

export const codeqlGenerateQueryHelpTool: CLIToolDefinition = {
  name: 'codeql_generate_query-help',
  description: 'Generate query help documentation from QLDoc comments',
  command: 'codeql',
  subcommand: 'generate query-help',
  inputSchema: {
    query: z.string().describe('Path to the query file to generate help for'),
    outputFile: z.string().optional().describe('Path to write the help documentation'),
    format: z.enum(['markdown', 'text', 'html']).optional()
      .describe('Output format for the help documentation'),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    'codeql generate query-help -- MyQuery.ql',
    'codeql generate query-help --format=markdown -- MyQuery.ql help.md',
    'codeql generate query-help --format=html -- MyQuery.ql help.html'
  ],
  resultProcessor: defaultCLIResultProcessor
};