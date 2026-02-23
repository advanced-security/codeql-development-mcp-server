# `read_database_source` - list_source_files

## Purpose

Tests the `read_database_source` tool in listing mode by omitting `filePath` to list all source files in a CodeQL database source archive.

## Inputs

- **database**: Path to the JavaScript example test database

## Expected Behavior

The tool should return a listing of all source files in the database's `src/` directory, including `totalEntries`, `returnedEntries`, and `truncated` metadata.

## Static Files Referenced

- `server/ql/javascript/examples/test/ExampleQuery1/ExampleQuery1.testproj`
