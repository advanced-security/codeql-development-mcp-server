/**
 * CodeQL BQRS decode tool
 */

import { z } from 'zod';
import { CLIToolDefinition, createCodeQLSchemas, createBQRSResultProcessor } from '../../lib/cli-tool-registry';

export const codeqlBqrsDecodeTool: CLIToolDefinition = {
  name: 'codeql_bqrs_decode',
  description: 'Decode BQRS result files to human-readable formats',
  command: 'codeql',
  subcommand: 'bqrs decode',
  inputSchema: {
    files: z.array(z.string()).describe('BQRS file(s) to decode'),
    output: createCodeQLSchemas.output(),
    format: z.enum(['csv', 'json']).optional().describe('Output format'),
    'max-paths': z.number().optional().describe('Maximum number of paths to output'),
    'start-at': z.number().optional().describe('Start output at result number'),
    'max-results': z.number().optional().describe('Maximum number of results'),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    'codeql bqrs decode --format=csv --output=results.csv results.bqrs',
    'codeql bqrs decode --format=json --max-results=100 results.bqrs'
  ],
  resultProcessor: createBQRSResultProcessor()
};