/**
 * CodeQL pack ls tool
 */

import { z } from 'zod';
import { CLIToolDefinition, createCodeQLSchemas, defaultCLIResultProcessor } from '../../lib/cli-tool-registry';

export const codeqlPackLsTool: CLIToolDefinition = {
  name: 'codeql_pack_ls',
  description: 'List CodeQL packs under some local directory path',
  command: 'codeql',
  subcommand: 'pack ls',
  inputSchema: {
    dir: z.string().optional().describe('The root directory of the package or workspace, defaults to the current working directory'),
    format: z.enum(['text', 'json']).optional()
      .describe('Output format: text (default) or json'),
    groups: z.string().optional()
      .describe('List of CodeQL pack groups to include or exclude'),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    'codeql pack ls -- .',
    'codeql pack ls --format=json -- /path/to/pack-directory',
    'codeql pack ls --format=json --groups=queries,tests -- .'
  ],
  resultProcessor: defaultCLIResultProcessor
};