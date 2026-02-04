/**
 * CodeQL query run tool
 */

import { z } from 'zod';
import { CLIToolDefinition, createCodeQLSchemas } from '../../lib/cli-tool-registry';

export const codeqlQueryRunTool: CLIToolDefinition = {
  name: 'codeql_query_run',
  description: 'Execute a CodeQL query against a database. Use either "query" parameter for direct file path OR "queryName" + "queryLanguage" for pre-defined tool queries.',
  command: 'codeql',
  subcommand: 'query run',
  inputSchema: {
    query: z.string().optional().describe('Path to the CodeQL query file (.ql) - cannot be used with queryName'),
    queryName: z.string().optional().describe('Name of pre-defined query to run (e.g., "PrintAST", "CallGraphFrom", "CallGraphTo") - requires queryLanguage'),
    queryLanguage: z.string().optional().describe('Programming language for tools queries (e.g., "javascript", "java", "python") - required when using queryName'),
    queryPack: z.string().optional().describe('Query pack path (defaults to server/ql/<language>/tools/src/ for tool queries)'),
    sourceFiles: z.string().optional().describe('Comma-separated list of source file paths for PrintAST queries (e.g., "src/main.js,src/utils.js" or just "main.js")'),
    sourceFunction: z.string().optional().describe('Comma-separated list of source function names for CallGraphFrom queries (e.g., "main,processData")'),
    targetFunction: z.string().optional().describe('Comma-separated list of target function names for CallGraphTo queries (e.g., "helper,validateInput")'),
    database: createCodeQLSchemas.database(),
    output: createCodeQLSchemas.output(),
    external: z.array(z.string()).optional()
      .describe('External predicate data: predicate=file.csv'),
    timeout: createCodeQLSchemas.timeout(),
    logDir: z.string().optional()
      .describe('Custom directory for query execution logs (overrides CODEQL_QUERY_LOG_DIR environment variable). If not provided, uses CODEQL_QUERY_LOG_DIR or defaults to /tmp/codeql-development-mcp-server/query-logs/<unique-id>'),
    'evaluator-log': z.string().optional().describe('Path to save evaluator log (deprecated: use logDir instead)'),
    'evaluator-log-minify': z.boolean().optional()
      .describe('Minimize evaluator log for smaller size'),
    'evaluator-log-level': z.number().min(1).max(5).optional()
      .describe('Evaluator log verbosity level (1-5, default 5)'),
    'tuple-counting': z.boolean().optional()
      .describe('Display tuple counts for each evaluation step in evaluator logs'),
    format: z.enum(['sarif-latest', 'sarifv2.1.0', 'csv', 'graphtext', 'dgml', 'dot']).optional()
      .describe('Output format for query results via codeql bqrs interpret. Defaults to sarif-latest for @kind problem/path-problem queries, graphtext for @kind graph queries. Graph formats (graphtext, dgml, dot) only work with @kind graph queries.'),
    interpretedOutput: z.string().optional()
      .describe('Output file for interpreted results (e.g., results.sarif, results.txt). If not provided, defaults based on format: .sarif for SARIF, .txt for graphtext/csv, .dgml for dgml, .dot for dot'),
    evaluationFunction: z.string().optional()
      .describe('[DEPRECATED - use format parameter instead] Built-in function for query results evaluation (e.g., "mermaid-graph", "json-decode", "csv-decode") or path to custom evaluation script'),
    evaluationOutput: z.string().optional()
      .describe('[DEPRECATED - use interpretedOutput parameter instead] Output file for evaluation results'),
    verbose: createCodeQLSchemas.verbose(),
    additionalArgs: createCodeQLSchemas.additionalArgs()
  },
  examples: [
    'codeql query run --database=mydb --output=results.bqrs MyQuery.ql',
    'codeql query run --database=mydb --query-name=PrintAST --query-language=javascript --source-files=src/index.js --output=results.bqrs --format=graphtext --interpreted-output=results.txt',
    'codeql query run --database=mydb --external=data=input.csv --output=results.bqrs MyQuery.ql --format=sarif-latest --interpreted-output=results.sarif',
    'codeql query run --database=mydb --evaluator-log=eval.log --tuple-counting --evaluator-log-level=5 --output=results.bqrs MyQuery.ql',
    'codeql query run --database=mydb --query-name=PrintAST --query-language=javascript --source-files="main.js,utils.js" --format=graphtext',
    'codeql query run --database=mydb --log-dir=/custom/log/path --tuple-counting --output=results.bqrs MyQuery.ql'
  ]
};