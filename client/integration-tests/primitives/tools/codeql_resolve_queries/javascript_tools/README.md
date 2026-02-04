# Integration Test: codeql_resolve_queries/javascript_tools

## Purpose

Tests the `codeql_resolve_queries` tool to ensure it can successfully resolve the PrintAST.ql query path in the JavaScript tools pack.

## Test Scenario

This test validates that the `codeql_resolve_queries` tool can:

1. Search for queries in the JavaScript tools directory (`server/ql/javascript/tools/src/`)
2. Return the absolute path to the PrintAST.ql query
3. Use JSON format for machine-readable output

## Test Parameters

- `directory`: "server/ql/javascript/tools/src/"
- `format`: "json"

## Expected Behavior

The tool should:

1. Find the PrintAST.ql query in the specified directory
2. Return the absolute path in JSON format
3. Include the PrintAST query in the results

## Files

- `before/monitoring-state.json`: Initial monitoring state
- `after/monitoring-state.json`: Expected final monitoring state with resolved query paths
