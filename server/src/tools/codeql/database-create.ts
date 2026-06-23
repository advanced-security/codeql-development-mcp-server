/**
 * CodeQL database create tool
 */

import { z } from 'zod';
import { CLIToolDefinition, createDatabaseResultProcessor } from '../../lib/cli-tool-registry';

export const codeqlDatabaseCreateTool: CLIToolDefinition = {
  name: 'codeql_database_create',
  description: 'Create a CodeQL database from source code',
  command: 'codeql',
  subcommand: 'database create',
  inputSchema: {
    database: z.string().describe('Database path/name to create'),
    language: z.string().optional().describe('Programming language(s) to extract'),
    'source-root': z.string().optional().describe('Root directory of source code'),
    command: z.string().optional().describe('Build command for compiled languages'),
    'build-mode': z.enum(['none', 'autobuild', 'manual']).optional()
      .describe('Build mode: none (interpreted langs), autobuild, or manual'),
    threads: z.number().optional().describe('Number of threads to use'),
    ram: z.number().optional().describe('Amount of RAM to use (MB)'),
    'overlay-base': z.boolean().optional()
      .describe('[Advanced/experimental] Create the database so that it is usable as an overlay base for diff-informed (incremental) analysis. Combine with --cache-cleanup=overlay to retain only the data useful for later overlay evaluation. Pairs with overlay-changes on a subsequent overlay build.'),
    'overlay-changes': z.string().optional()
      .describe('[Advanced/experimental] Create the database as an overlay on top of an existing overlay base. Path to a JSON file whose top-level object has a "changes" entry: a list of relative paths of files changed since the overlay base was created (e.g. {"changes":["src/app.js"]}). Only those files are extracted into the overlay.'),
    'cache-cleanup': z.enum(['clear', 'trim', 'fit', 'overlay']).optional()
      .describe('How aggressively to trim the evaluation cache: clear, trim (default), fit, or overlay. Use "overlay" when building an overlay base so only data useful for overlay evaluation is retained.'),
    verbose: z.boolean().optional().describe('Enable verbose output'),
    overwrite: z.boolean().optional().describe('Overwrite existing database if it exists'),
    'no-cleanup': z.boolean().optional().describe('Skip database cleanup after finalization'),
    extractorEnv: z.array(z.string()).optional()
      .describe('Extractor environment variables as "KEY=VALUE" strings injected into the extraction process. Only keys beginning with LGTM_ or CODEQL_EXTRACTOR_ are permitted. Required for some framework databases — e.g. SAP UI5 needs "LGTM_INDEX_XML_MODE=ALL" (and often "LGTM_INDEX_FILTERS=include:**/*.json") to extract XML views. Example: ["LGTM_INDEX_XML_MODE=ALL"].'),
    additionalArgs: z.array(z.string()).optional().describe('Additional command-line arguments')
  },
  examples: [
    'codeql database create --language=java --source-root=/path/to/project mydb',
    'codeql database create --language=cpp --command="make all" mydb',
    'codeql database create --language=python,javascript mydb',
    'codeql database create --language=javascript --overlay-base --cache-cleanup=overlay --source-root=/path/to/project base-db',
    'codeql database create --language=javascript --overlay-changes=changes.json --source-root=/path/to/project overlay-db',
    'LGTM_INDEX_XML_MODE=ALL codeql database create --language=javascript --source-root=/path/to/ui5-app ui5-db (set via extractorEnv=["LGTM_INDEX_XML_MODE=ALL"])'
  ],
  resultProcessor: createDatabaseResultProcessor()
};