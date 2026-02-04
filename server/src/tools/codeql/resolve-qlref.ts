/**
 * CodeQL resolve qlref tool
 */

import { z } from 'zod';
import { CLIToolDefinition, createCodeQLSchemas, defaultCLIResultProcessor } from '../../lib/cli-tool-registry';

export const codeqlResolveQlrefTool: CLIToolDefinition = {
  name: 'codeql_resolve_qlref',
  description: 'Resolve qlref files to their corresponding query files',
  command: 'codeql',
  subcommand: 'resolve qlref',
  inputSchema: {
    qlref: z.string().describe('Path to the .qlref file to resolve'),
    format: z.enum(['text', 'json', 'betterjson']).optional()
      .describe('Output format for qlref resolution'),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    'codeql resolve qlref -- test/MyQuery.qlref',
    'codeql resolve qlref --format=json -- test/MyQuery.qlref',
    'codeql resolve qlref --format=betterjson -- test/MyQuery.qlref'
  ],
  resultProcessor: defaultCLIResultProcessor
};