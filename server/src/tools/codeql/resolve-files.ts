/**
 * CodeQL resolve files tool
 */

import { z } from 'zod';
import { CLIToolDefinition, createCodeQLSchemas, defaultCLIResultProcessor } from '../../lib/cli-tool-registry';

export const codeqlResolveFilesTool: CLIToolDefinition = {
  name: 'codeql_resolve_files',
  description: 'Find files in a directory tree, filtered by extension and glob patterns. Useful for discovering QL library files, query files, and other CodeQL-related files within packs or workspaces.',
  command: 'codeql',
  subcommand: 'resolve files',
  inputSchema: {
    dir: z.string().describe('The directory to search for files'),
    'include-extension': z.array(z.string()).optional()
      .describe('Include files with given extensions (e.g., [\'.qll\', \'.ql\'])'),
    include: z.array(z.string()).optional()
      .describe('Glob patterns to include (e.g., [\'**/RemoteFlowSource*\'])'),
    exclude: z.array(z.string()).optional()
      .describe('Glob patterns to exclude'),
    prune: z.array(z.string()).optional()
      .describe('Glob patterns for directories to prune from search'),
    'also-match': z.array(z.string()).optional()
      .describe('Additional glob filter all results must match'),
    format: z.enum(['text', 'json']).optional()
      .describe('Output format (default: text)'),
    'follow-symlinks': z.boolean().optional()
      .describe('Follow symlinks when searching'),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    'codeql resolve files --include-extension=.qll --format=json -- /path/to/pack',
    'codeql resolve files --include=**/RemoteFlowSource* -- /path/to/pack',
    'codeql resolve files --include-extension=.ql --include-extension=.qll -- /path/to/pack',
    'codeql resolve files --include-extension=.qll --also-match=**/FlowSource* -- /path/to/pack'
  ],
  resultProcessor: defaultCLIResultProcessor
};
