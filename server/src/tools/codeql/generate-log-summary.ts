/**
 * CodeQL generate log-summary tool
 */

import { z } from 'zod';
import { CLIToolDefinition, createCodeQLSchemas, defaultCLIResultProcessor } from '../../lib/cli-tool-registry';

export const codeqlGenerateLogSummaryTool: CLIToolDefinition = {
  name: 'codeql_generate_log-summary',
  description: 'Create a summary of a structured JSON evaluator event log file',
  command: 'codeql',
  subcommand: 'generate log-summary',
  inputSchema: {
    inputLog: z.string().describe('Path to the evaluator log file to summarize'),
    outputFile: z.string().optional().describe('Path to write the summary (optional, defaults to stdout)'),
    format: z.enum(['text', 'predicates', 'overall']).optional()
      .describe('Output format: text (human-readable), predicates (JSON), or overall (stats)'),
    'minify-output': z.boolean().optional().describe('Minify JSON output'),
    utc: z.boolean().optional().describe('Force UTC timestamps'),
    'deduplicate-stage-summaries': z.boolean().optional().describe('Deduplicate stage summaries'),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    'codeql generate log-summary --format=text -- evaluator-log.json.txt summary.txt',
    'codeql generate log-summary --format=predicates --minify-output -- evaluator-log.json.txt',
    'codeql generate log-summary --format=overall -- evaluator-log.json.txt overall-stats.json'
  ],
  resultProcessor: defaultCLIResultProcessor
};