# Integration Test: `profile_codeql_query/javascript_example1_with_log`

## PURPOSE

This test validates that the `profile_codeql_query` MCP server tool correctly profiles a CodeQL query when an existing evaluator log is provided. This tests the deterministic conversion from evaluator-log.jsonl to profile outputs without running the query.

## INPUTS

The following static files are used as inputs for this test:

- `./test-config.json`: Configuration file specifying the parameters for the test.
- `./before/evaluator-log.jsonl`: Pre-existing evaluator log from a previous query run.

## OUTPUTS

Integration testing of the `profile_codeql_query` MCP server tool will generate the following files:

- `query-evaluation-profile.json`: JSON formatted profile with complete performance metrics and data.
- `query-evaluation-profile.md`: Mermaid diagram showing the query evaluation graph/tree.
