/**
 * CodeQL resolve queries tool
 */

import { z } from 'zod';
import { CLIToolDefinition, createCodeQLSchemas, CLIExecutionResult } from '../../lib/cli-tool-registry';

/**
 * Result processor that only returns stdout for JSON formats
 * This prevents warnings/info from stderr from corrupting JSON output
 */
const jsonOnlyResultProcessor = (
  result: CLIExecutionResult,
  params: Record<string, unknown>
): string => {
  if (!result.success) {
    return `Command failed (exit code ${result.exitCode || 'unknown'}):\n${result.error || result.stderr}`;
  }

  // For JSON formats (including bylanguage), only return stdout to avoid mixing warnings with JSON
  if (params.format === 'json' || params.format === 'betterjson' || params.format === 'bylanguage') {
    return result.stdout || '[]';
  }

  // For text format, include warnings
  let output = '';

  if (result.stdout) {
    output += result.stdout;
  }

  if (result.stderr) {
    if (output) {
      output += '\n\nWarnings/Info:\n';
    }
    output += result.stderr;
  }

  if (!output) {
    output = 'Command executed successfully (no output)';
  }

  return output;
};

export const codeqlResolveQueriesTool: CLIToolDefinition = {
  name: 'codeql_resolve_queries',
  description: 'List available CodeQL queries found on the local filesystem',
  command: 'codeql',
  subcommand: 'resolve queries',
  inputSchema: {
    directory: z.string().optional().describe('Directory to search for queries'),
    language: z.string().optional().describe('Filter queries by programming language'),
    format: z.enum(['text', 'json', 'betterjson', 'bylanguage']).optional()
      .describe('Output format for query list'),
    'additional-packs': z.union([z.string(), z.array(z.string())]).optional()
      .describe('Additional pack directories to search for CodeQL packs'),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    'codeql resolve queries',
    'codeql resolve queries --language=java --format=json',
    'codeql resolve queries --format=betterjson -- /path/to/queries',
    'codeql resolve queries --additional-packs=/path/to/packs codeql/java-queries'
  ],
  resultProcessor: jsonOnlyResultProcessor
};