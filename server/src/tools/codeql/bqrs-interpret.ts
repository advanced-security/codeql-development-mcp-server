/**
 * CodeQL BQRS interpret tool
 */

import { z } from 'zod';
import { CLIToolDefinition, createCodeQLSchemas, createBQRSResultProcessor } from '../../lib/cli-tool-registry';

export const codeqlBqrsInterpretTool: CLIToolDefinition = {
  name: 'codeql_bqrs_interpret',
  description: 'Interpret BQRS result files according to query metadata and generate output in specified formats (CSV, SARIF, graph formats)',
  command: 'codeql',
  subcommand: 'bqrs interpret',
  inputSchema: {
    file: z.string().describe('The BQRS file to interpret'),
    format: z.enum(['csv', 'sarif-latest', 'sarifv2.1.0', 'graphtext', 'dgml', 'dot'])
      .describe('Output format: csv (comma-separated), sarif-latest/sarifv2.1.0 (SARIF), graphtext/dgml/dot (graph formats, only for @kind graph queries)'),
    output: createCodeQLSchemas.output(),
    t: z.array(z.string())
      .describe('Query metadata key=value pairs. At least "kind" and "id" must be specified (e.g., ["kind=graph", "id=js/print-ast"])'),
    'max-paths': z.number().optional()
      .describe('Maximum number of paths to produce for each alert with paths (default: 4)'),
    'sarif-add-file-contents': z.boolean().optional()
      .describe('[SARIF only] Include full file contents for all files referenced in results'),
    'sarif-add-snippets': z.boolean().optional()
      .describe('[SARIF only] Include code snippets for each location with context'),
    'sarif-group-rules-by-pack': z.boolean().optional()
      .describe('[SARIF only] Place rule objects under their QL pack in tool.extensions property'),
    'sarif-multicause-markdown': z.boolean().optional()
      .describe('[SARIF only] Include multi-cause alerts as Markdown-formatted lists'),
    'sarif-category': z.string().optional()
      .describe('[SARIF only] Category for this analysis (distinguishes multiple analyses on same code)'),
    'csv-location-format': z.enum(['uri', 'line-column', 'offset-length']).optional()
      .describe('[CSV only] Format for locations in CSV output (default: line-column)'),
    'dot-location-url-format': z.string().optional()
      .describe('[DOT only] Format string for file location URLs (placeholders: {path}, {start:line}, {start:column}, {end:line}, {end:column}, {offset}, {length})'),
    threads: z.number().optional()
      .describe('Number of threads for computing paths (0 = one per core, -N = leave N cores unused)'),
    'column-kind': z.enum(['utf8', 'utf16', 'utf32', 'bytes']).optional()
      .describe('[SARIF only] Column kind for interpreting location columns'),
    'unicode-new-lines': z.boolean().optional()
      .describe('[SARIF only] Whether unicode newlines (U+2028, U+2029) are considered as newlines'),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    'codeql bqrs interpret --format=sarif-latest --output=results.sarif -t kind=problem -t id=js/sql-injection results.bqrs',
    'codeql bqrs interpret --format=graphtext --output=ast.txt -t kind=graph -t id=js/print-ast results.bqrs',
    'codeql bqrs interpret --format=csv --csv-location-format=line-column --output=results.csv -t kind=problem -t id=js/xss results.bqrs',
    'codeql bqrs interpret --format=dot --output=graph.dot -t kind=graph -t id=java/call-graph results.bqrs',
    'codeql bqrs interpret --format=sarif-latest --sarif-add-snippets --sarif-category=security --output=results.sarif -t kind=path-problem -t id=go/path-injection results.bqrs'
  ],
  resultProcessor: createBQRSResultProcessor()
};
