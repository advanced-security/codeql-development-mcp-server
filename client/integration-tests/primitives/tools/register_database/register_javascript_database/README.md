# `register_database` - register_javascript_database

## Purpose

Tests the `register_database` tool by registering a CodeQL database given a local path.

## Inputs

- **db_path**: Path to the CodeQL database directory

## Expected Behavior

The tool should validate and register the database, confirming it exists and has the required structure.

## Static Files Referenced

- `server/ql/javascript/examples/test/ExampleQuery1/ExampleQuery1.testproj` (database)
