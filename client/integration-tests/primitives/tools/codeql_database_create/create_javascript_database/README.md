# `codeql_database_create` - create_javascript_database

## Purpose

Tests the `codeql_database_create` tool by creating a CodeQL database from JavaScript source code.

## Inputs

- **database**: Path where the new database will be created
- **language**: Target language (`javascript`)
- **source-root**: Path to the source code

## Expected Behavior

The tool should create a new CodeQL database at the specified path from the JavaScript source code.

## Static Files Referenced

- `server/ql/javascript/examples/test/ExampleQuery1/` (source directory)
