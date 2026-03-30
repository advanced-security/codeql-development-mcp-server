# Integration Test: codeql_query_run/rust_call_graph_from_example1

## Purpose

Tests the `codeql_query_run` tool with the CallGraphFrom query for Rust language, demonstrating external predicates for source function selection and SARIF format interpretation for call graph visualization.

## Test Scenario

This test validates that the `codeql_query_run` tool can:

1. Accept `queryName` ("CallGraphFrom") and `queryLanguage` ("rust") parameters
2. Accept `sourceFunction` parameter to specify which function's outbound calls to analyze
3. Resolve the query path using `codeql resolve queries` to find the CallGraphFrom.ql query
4. Automatically provide external predicates for the sourceFunction
5. Execute the resolved query against a Rust test database with external predicate data
6. Interpret the .bqrs results using native `codeql bqrs interpret --format=sarif-latest`
7. Generate SARIF format output containing call graph results
8. Return enhanced results confirming the interpretation succeeded

## Required Inputs

The test requires the following inputs in `before/monitoring-state.json`:

- `queryName`: "CallGraphFrom" - Name of the query to resolve and execute
- `queryLanguage`: "rust" - Programming language for query resolution
- `database`: "server/ql/rust/tools/test/CallGraphFrom/CallGraphFrom.testproj" - Path to CodeQL test database
- `sourceFunction`: "source_func" - Source function name to analyze (used as external predicate)
- `output`: "query-results.bqrs" - Output file for binary query results
- `format`: "sarif-latest" - SARIF format for interpreting @kind problem query results
- `interpretedOutput`: "query-results.sarif" - Output file for SARIF format results
- `timeout`: 300000 - Timeout in milliseconds (5 minutes)

The test database is created by running `codeql test extract server/ql/rust/tools/test/CallGraphFrom`.

## Expected Outputs

The test expects the following behavior:

- `monitoring-state.json`: Test execution state showing success
- The tool generates `query-results.bqrs` (binary query results, not committed to repo)
- The tool interprets results using `codeql bqrs interpret --format=sarif-latest`
- The SARIF output contains call graph entries showing calls from `source_func` to `unrelated1` and `unrelated2`
- The monitoring state confirms successful execution and interpretation

## Expected Behavior

The tool should:

1. Resolve "CallGraphFrom" to the absolute path of `server/ql/rust/tools/src/CallGraphFrom/CallGraphFrom.ql`
2. Automatically add external predicate: `sourceFunction=source_func`
3. Execute the query against the provided database with the external predicate data
4. Generate query results in BQRS format
5. Call `codeql bqrs interpret` with format=sarif-latest
6. Generate SARIF output showing calls from the source function
7. Return enhanced output confirming the interpretation succeeded

## External Predicates Integration

This test demonstrates the integration between the MCP server's sourceFunction parameter and CodeQL's external predicates system. The CallGraphFrom query uses `external string sourceFunction()` to receive the function name, making it work with any Rust code database.

## Format Parameter

This test uses the `format` parameter which leverages native CodeQL tooling (`codeql bqrs interpret`) to produce SARIF output based on query metadata.
