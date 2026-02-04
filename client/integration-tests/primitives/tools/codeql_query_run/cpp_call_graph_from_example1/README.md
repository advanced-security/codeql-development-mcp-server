# Integration Test: codeql_query_run/cpp_call_graph_from_example1

## Purpose

Tests the `codeql_query_run` tool with the CallGraphFrom query for cpp language, demonstrating external predicates for source function selection and mermaid diagram generation for call graph visualization.

## Test Scenario

This test validates that the `codeql_query_run` tool can:

1. Accept `queryName` ("CallGraphFrom") and `queryLanguage` ("cpp") parameters
2. Accept `sourceFunction` parameter to specify which function's outbound calls to analyze
3. Resolve the query path using `codeql resolve queries` to find the CallGraphFrom.ql query
4. Automatically provide external predicates for the sourceFunction
5. Execute the resolved query against a test database with external predicate data
6. Process the .bqrs results using the mermaid-graph evaluation function
7. Generate a mermaid diagram representation of the call graph
8. Return enhanced results including the mermaid diagram content

## Required Inputs

The test requires the following inputs in `before/monitoring-state.json`:

- `queryName`: "CallGraphFrom" - Name of the query to resolve and execute
- `queryLanguage`: "cpp" - Programming language for query resolution
- `database`: "server/ql/cpp/tools/test/CallGraphFrom/CallGraphFrom.testproj" - Path to CodeQL test database
- `sourceFunction`: "sourceFunc" - Source function name to analyze (used as external predicate)
- `output`: "query-results.bqrs" - Output file for binary query results
- `evaluationFunction`: "mermaid-graph" - Evaluation function to apply to query results
- `evaluationOutput`: "query-results.md" - Output file for evaluation results (mermaid diagram)
- `timeout`: 300000 - Timeout in milliseconds (5 minutes)

The test database is created by running `codeql test extract server/ql/cpp/tools/test/CallGraphFrom`.

## Expected Outputs

The test expects the following outputs to be generated in the `after/` directory:

- `monitoring-state.json`: Test execution state showing success
- `query-results.bqrs`: Binary query results file containing call graph data (~16KB)
- `query-results.md`: Mermaid diagram markdown file with call graph visualization, containing:
  - Query name and description header
  - Mermaid graph diagram showing calls from sourceFunc
  - Results table with call details
  - Statistics summary (nodes, edges, source function)

## Expected Behavior

The tool should:

1. Resolve "CallGraphFrom" to the absolute path of `server/ql/cpp/tools/src/CallGraphFrom/CallGraphFrom.ql`
2. Automatically add external predicate: `sourceFunction=sourceFunc`
3. Execute the query against the provided database with the external predicate data
4. Generate query results in the specified .bqrs format
5. Process the .bqrs file using the mermaid-graph evaluator
6. Generate a markdown file with a mermaid diagram showing calls from the source function
7. Return enhanced output including the evaluation results

## External Predicates Integration

This test demonstrates the integration between the MCP server's sourceFunction parameter and CodeQL's external predicates system. The CallGraphFrom query uses `external string sourceFunction()` to receive the function name, making it work with any C++ code database.
