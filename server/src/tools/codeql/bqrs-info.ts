/**
 * CodeQL BQRS info tool
 */

import { z } from 'zod';
import { CLIToolDefinition, createCodeQLSchemas, createBQRSResultProcessor } from '../../lib/cli-tool-registry';

export const codeqlBqrsInfoTool: CLIToolDefinition = {
  name: 'codeql_bqrs_info',
  description: 'Get metadata and information about BQRS result files',
  command: 'codeql',
  subcommand: 'bqrs info',
  inputSchema: {
    files: z.array(z.string()).describe('BQRS file(s) to examine'),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    'codeql bqrs info results.bqrs',
    'codeql bqrs info --verbose results.bqrs'
  ],
  resultProcessor: createBQRSResultProcessor()
};