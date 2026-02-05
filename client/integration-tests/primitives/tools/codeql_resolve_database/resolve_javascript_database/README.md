# `codeql_resolve_database` - resolve_javascript_database

## Purpose

Tests the `codeql_resolve_database` tool by resolving and validating a JavaScript CodeQL database path.

## Inputs

- **database**: Path to the JavaScript example test database
- **format**: Output format (`json`)

## Expected Behavior

The tool should resolve the database path and return information about the database structure.

## Static Files Referenced

- `server/ql/javascript/examples/test/ExampleQuery1/ExampleQuery1.testproj`
