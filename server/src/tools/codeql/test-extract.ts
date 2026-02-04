/**
 * CodeQL test extract tool
 */

import { z } from 'zod';
import { CLIToolDefinition, createCodeQLSchemas, defaultCLIResultProcessor } from '../../lib/cli-tool-registry';

export const codeqlTestExtractTool: CLIToolDefinition = {
  name: 'codeql_test_extract',
  description: 'Extract test databases for CodeQL query tests',
  command: 'codeql',
  subcommand: 'test extract',
  inputSchema: {
    tests: z.array(z.string()).describe('One or more test directories or files'),
    language: z.string().optional().describe('Programming language for extraction'),
    threads: createCodeQLSchemas.threads(),
    ram: createCodeQLSchemas.ram(),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    'codeql test extract -- languages/java/test/MyQuery/',
    'codeql test extract --language=java --threads=4 -- test-directory',
    'codeql test extract --threads=2 --ram=2048 -- multiple/test/directories'
  ],
  resultProcessor: defaultCLIResultProcessor
};