/**
 * CodeQL query format tool
 */

import { z } from 'zod';
import { CLIToolDefinition, createCodeQLSchemas, defaultCLIResultProcessor, CLIExecutionResult } from '../../lib/cli-tool-registry';

/**
 * Custom result processor for codeql query format tool
 * Exit code 1 with --check-only means "file would change" - this is success for format checking
 */
function formatResultProcessor(result: CLIExecutionResult, params: Record<string, unknown>): string {
  const isCheckOnly = params['check-only'];
  const hasFormatChanges = result.exitCode === 1;
  
  if (isCheckOnly && hasFormatChanges) {
    // Mark as success for the CLI tool registry since detecting format changes is the intended behavior
    result.success = true;
    return result.stdout || result.stderr || 'File would change by autoformatting.';
  }
  
  return defaultCLIResultProcessor(result, params);
}

export const codeqlQueryFormatTool: CLIToolDefinition = {
  name: 'codeql_query_format',
  description: 'Automatically format CodeQL source code files',
  command: 'codeql',
  subcommand: 'query format',
  inputSchema: {
    files: z.array(z.string()).describe('One or more .ql or .qll source files to format'),
    output: z.string().optional().describe('Write formatted code to this file instead of stdout'),
    'in-place': z.boolean().optional().describe('Overwrite each input file with formatted version'),
    'check-only': z.boolean().optional().describe('Check formatting without writing output'),
    backup: z.string().optional().describe('Backup extension when overwriting existing files'),
    'no-syntax-errors': z.boolean().optional().describe('Ignore syntax errors and pretend file is formatted'),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    'codeql query format -i -- ExampleQuery.ql',
    'codeql query format --in-place -- queries/*.ql',
    'codeql query format --check-only -- queries/*.ql'
  ],
  resultProcessor: formatResultProcessor
};