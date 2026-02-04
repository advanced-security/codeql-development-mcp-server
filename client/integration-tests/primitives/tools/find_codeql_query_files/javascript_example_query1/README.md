# Integration Test: find_codeql_query_files/javascript_example_query1

## Purpose

Tests the `find_codeql_query_files` tool to ensure it can successfully find and track all files related to the ExampleQuery1.ql query in the JavaScript examples pack.

## Test Scenario

This test validates that the `find_codeql_query_files` tool can:

1. Find the query file at `server/ql/javascript/examples/src/ExampleQuery1/ExampleQuery1.ql`
2. Detect associated files (documentation, test files, etc.)
3. Return a comprehensive JSON structure with file paths and existence status
4. Identify missing files that should exist for a complete query

## Test Parameters

- `queryPath`: "server/ql/javascript/examples/src/ExampleQuery1/ExampleQuery1.ql"
- `language`: "javascript" (optional - should be auto-inferred)

## Expected Behavior

The tool should:

1. Find the query file and its directory
2. Detect the documentation file (ExampleQuery1.md)
3. Identify the test directory and .qlref file
4. Find test code files
5. Detect expected results file
6. List any missing files (e.g., .qspec if not present)
7. Return comprehensive status information

## Files

- `before/monitoring-state.json`: Initial monitoring state
- `after/monitoring-state.json`: Expected final monitoring state with file discovery results
