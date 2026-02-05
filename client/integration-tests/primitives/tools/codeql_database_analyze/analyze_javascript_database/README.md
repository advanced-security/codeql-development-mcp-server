# `codeql_database_analyze` - analyze_javascript_database

## Purpose

Tests the `codeql_database_analyze` tool by running a query against a JavaScript CodeQL database.

## Inputs

- **database**: Path to the CodeQL database to analyze
- **queries**: Path to the query or query suite to run
- **format**: Output format (`sarif-latest`)

## Expected Behavior

The tool should run the specified query against the database and return results in SARIF format.

## Static Files Referenced

- `server/ql/javascript/examples/test/ExampleQuery1/ExampleQuery1.testproj` (database)
- `server/ql/javascript/examples/src/ExampleQuery1/ExampleQuery1.ql` (query)
