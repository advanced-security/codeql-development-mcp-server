# `read_database_source` - read_source_file

## Purpose

Tests the `read_database_source` tool in file-read mode by requesting a specific source file from a CodeQL database source archive.

## Inputs

- **database**: Path to the JavaScript example test database
- **filePath**: Path to a source file within the database archive

## Expected Behavior

The tool should return the contents of the requested source file along with metadata including `entryPath`, `sourceType`, `totalLines`, `startLine`, and `endLine`.

## Static Files Referenced

- `server/ql/javascript/examples/test/ExampleQuery1/ExampleQuery1.testproj`
