/**
 * CodeQL test run tool
 */

import { CLIToolDefinition, createCodeQLSchemas } from '../../lib/cli-tool-registry';
import { z } from 'zod';

export const codeqlTestRunTool: CLIToolDefinition = {
  name: 'codeql_test_run',
  description: 'Run CodeQL query tests',
  command: 'codeql',
  subcommand: 'test run',
  inputSchema: {
    tests: z.array(z.string()).describe('One or more tests (.ql, .qlref files, or test directories)'),
    'show-extractor-output': z.boolean().optional()
      .describe('Show output from extractors during test execution'),
    'keep-databases': z.boolean().optional()
      .describe('Keep test databases after running tests'),
    'learn': z.boolean().optional()
      .describe('Accept current output as expected for failing tests'),
    logDir: z.string().optional()
      .describe('Custom directory for test execution logs (overrides CODEQL_QUERY_LOG_DIR environment variable). If not provided, uses CODEQL_QUERY_LOG_DIR or defaults to /tmp/codeql-development-mcp-server/query-logs/<unique-id>'),
    threads: createCodeQLSchemas.threads(),
    ram: createCodeQLSchemas.ram(),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    'codeql test run /path/to/tests',
    'codeql test run --learn /path/to/failing/tests',
    'codeql test run --threads=4 --keep-databases /path/to/tests',
    'codeql test run --log-dir=/custom/log/path /path/to/tests'
  ]
};