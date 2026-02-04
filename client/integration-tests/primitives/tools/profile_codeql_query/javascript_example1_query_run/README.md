# Integration Test: `profile_codeql_query/javascript_example1_query_run`

## PURPOSE

This test validates that the `profile_codeql_query` MCP server tool correctly profiles a CodeQL query execution when no evaluator log is provided. The tool should run the query and generate both JSON and Mermaid diagram outputs.

## INPUTS

The following static files are used as inputs for this test:

- `./test-config.json`: Configuration file specifying the parameters for the test.
- `server/ql/javascript/examples/src/ExampleQuery1/ExampleQuery1.ql`: CodeQL query to be profiled.
- `server/ql/javascript/examples/test/ExampleQuery1/ExampleQuery1.testproj`: Test database for the query.

## OUTPUTS

Integration testing of the `profile_codeql_query` MCP server tool will generate the following files:

- `evaluator-log.jsonl`: Raw evaluator log file containing detailed profiling events.
- `query-evaluation-profile.json`: JSON formatted profile with complete performance metrics and data.
- `query-evaluation-profile.md`: Mermaid diagram showing the query evaluation graph/tree.
- `query-results.bqrs`: Binary query results file.
