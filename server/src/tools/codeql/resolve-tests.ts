/**
 * CodeQL resolve tests tool
 */

import { z } from 'zod';
import { CLIToolDefinition, createCodeQLSchemas, defaultCLIResultProcessor } from '../../lib/cli-tool-registry';

export const codeqlResolveTestsTool: CLIToolDefinition = {
  name: 'codeql_resolve_tests',
  description: 'Resolve the local filesystem paths of unit tests and/or queries under some base directory',
  command: 'codeql',
  subcommand: 'resolve tests',
  inputSchema: {
    tests: z.array(z.string()).optional().describe('One or more tests (.ql, .qlref files, or test directories)'),
    format: z.enum(['text', 'json']).optional()
      .describe('Output format for test list'),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    'codeql resolve tests',
    'codeql resolve tests --format=json -- test-directory',
    'codeql resolve tests --format=json -- test1.ql test2.ql'
  ],
  resultProcessor: defaultCLIResultProcessor
};