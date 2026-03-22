/**
 * CodeQL resolve ql packs tool
 */

import { z } from 'zod';
import { CLIToolDefinition, createCodeQLSchemas, defaultCLIResultProcessor } from '../../lib/cli-tool-registry';

export const codeqlResolvePacksTool: CLIToolDefinition = {
  name: 'codeql_resolve_packs',
  description: 'Resolve packs available within a project directory, provided as a search path, and the source roots of those available packs.',
  command: 'codeql',
  subcommand: 'resolve packs',
  inputSchema: {
    'search-path': z.string().describe('The project root, to search packs available in the project. Typically the ".", or the current working directory.'),
    format: z.enum(['text', 'json', 'betterjson']).optional()
      .describe('Output format for qlref resolution'),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    'codeql resolve packs --search-path=.',
  ],
  resultProcessor: defaultCLIResultProcessor
};