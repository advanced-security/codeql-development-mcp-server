# Integration Test: codeql_query_run/javascript_tools_print_ast

## Purpose

Tests the enhanced `codeql_query_run` tool with query name resolution for pre-defined tool queries, external predicates for source file selection, and results interpretation using native CodeQL graphtext format.

## Test Scenario

This test validates that the `codeql_query_run` tool can:

1. Accept `queryName` ("PrintAST") and `queryLanguage` ("javascript") parameters
2. Accept `sourceFiles` parameter to specify which source files to analyze
3. Resolve the query path using `codeql resolve queries` to find the PrintAST.ql query
4. Automatically provide external predicates for the selectedSourceFiles
5. Execute the resolved query against a test database with external predicate data
6. Interpret the .bqrs results using native `codeql bqrs interpret -t kind=graph -t id=javascript/tools/print-ast --format=graphtext`
7. Generate graphtext format output representing the AST graph structure
8. Return enhanced results confirming the interpretation succeeded

## Required Inputs

The test requires the following inputs in `before/monitoring-state.json`:

- `queryName`: "PrintAST" - Name of the query to resolve and execute
- `queryLanguage`: "javascript" - Programming language for query resolution
- `database`: "server/ql/javascript/examples/test/ExampleQuery1/ExampleQuery1.testproj" - Path to CodeQL test database
- `sourceFiles`: "server/ql/javascript/examples/test/ExampleQuery1/ExampleQuery1.js" - Source file(s) to analyze (used as external predicate)
- `output`: "query-results.bqrs" - Output file for binary query results
- `format`: "graphtext" - Native CodeQL format for interpreting @kind graph query results
- `interpretedOutput`: "query-results" - Output directory for graphtext format results

The test database should be pre-created at `server/ql/javascript/examples/test/ExampleQuery1/ExampleQuery1.testproj` by running `codeql test extract server/ql/javascript/examples/test/ExampleQuery1`.

## Expected Outputs

The test expects the following behavior:

- `monitoring-state.json`: Test execution state showing success
- The tool generates `query-results.bqrs` (binary query results, not committed to repo)
- The tool interprets results using `codeql bqrs interpret -t kind=graph -t id=javascript/tools/print-ast --format=graphtext`
- The interpreted output is written to a directory structure at `query-results/` (committed to repo)
- The monitoring state confirms successful execution and interpretation

**Note**: The .bqrs binary files are excluded via .gitignore. The graphtext output directory is committed to demonstrate expected output format. The test verifies correct tool behavior through both the monitoring-state.json file and the generated output files.

## Expected Behavior

The tool should:

1. Resolve "PrintAST" to the absolute path of `server/ql/javascript/tools/src/PrintAST/PrintAST.ql`
2. Automatically add external predicate: `selectedSourceFiles=ExampleQuery1.js`
3. Execute the query against the provided database with the external predicate data
4. Generate query results in BQRS format
5. Call `codeql bqrs interpret` with format=graphtext and appropriate metadata (-t kind=graph -t id=javascript/tools/print-ast)
6. Generate graphtext format output showing the AST structure for the selected source file
7. Return enhanced output confirming the interpretation succeeded

## External Predicates Integration

This test demonstrates the integration between the MCP server's sourceFiles parameter and CodeQL's external predicates system. The PrintAST query uses `external string selectedSourceFiles()` to receive file paths, making it work with any source code database rather than being limited to test directories.

## Format Parameter

This test uses the new `format` parameter instead of the deprecated `evaluationFunction` parameter. The `format` parameter leverages native CodeQL tooling (`codeql bqrs interpret`) to produce properly formatted output based on query metadata, rather than custom post-processing.
