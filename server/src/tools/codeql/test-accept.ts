/**
 * CodeQL test accept tool
 */

import { z } from 'zod';
import { CLIToolDefinition, createCodeQLSchemas, defaultCLIResultProcessor } from '../../lib/cli-tool-registry';

export const codeqlTestAcceptTool: CLIToolDefinition = {
  name: 'codeql_test_accept',
  description: 'Accept new test results as the expected baseline',
  command: 'codeql',
  subcommand: 'test accept',
  inputSchema: {
    tests: z.array(z.string()).describe('One or more tests (.ql, .qlref files, or test directories)'),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    'codeql test accept -- languages/java/test/MyQuery/MyQuery.qlref',
    'codeql test accept -- languages/java/test/MyQuery/',
    'codeql test accept -- languages/java/src/MyQuery/MyQuery.ql'
  ],
  resultProcessor: defaultCLIResultProcessor
};