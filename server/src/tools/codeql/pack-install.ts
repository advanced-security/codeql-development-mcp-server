/**
 * CodeQL pack install tool
 */

import { z } from 'zod';
import { CLIToolDefinition, createCodeQLSchemas } from '../../lib/cli-tool-registry';

export const codeqlPackInstallTool: CLIToolDefinition = {
  name: 'codeql_pack_install',
  description: 'Install CodeQL pack dependencies',
  command: 'codeql',
  subcommand: 'pack install',
  inputSchema: {
    packDir: z.string().optional().describe('Directory containing qlpack.yml (default: current)'),
    force: z.boolean().optional().describe('Force reinstall of dependencies'),
    'no-strict-mode': z.boolean().optional()
      .describe('Allow non-strict dependency resolution'),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    'codeql pack install',
    'codeql pack install --force /path/to/pack',
    'codeql pack install --no-strict-mode'
  ]
};