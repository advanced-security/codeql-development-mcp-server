# Integration Test: codeql_resolve_files/find_ql_files

## Purpose

Tests the `codeql_resolve_files` tool to ensure it can find QL query files by extension within a CodeQL pack directory.

## Test Scenario

This test validates that the `codeql_resolve_files` tool can:

1. Accept a directory path and file extension filter
2. Use the `codeql resolve files` CLI command to find matching files
3. Return a list of file paths matching the specified criteria

## Test Parameters

- `dir`: "server/ql/javascript/examples/src"
- `include-extension`: [".ql"]

## Expected Behavior

The tool should:

1. Invoke `codeql resolve files` with the specified directory and extension filter
2. Return file paths for all `.ql` files found in the directory tree
3. Return a successful result with the file listing
