# Integration Test: search_ql_code/search_predicate_name

## Purpose

Tests the `search_ql_code` tool to ensure it can search QL source files for a predicate name pattern and return structured results with file paths and line numbers.

## Test Scenario

This test validates that the `search_ql_code` tool can:

1. Accept a regex pattern for a predicate name
2. Search `.ql` and `.qll` files in a given directory
3. Return structured JSON results with file paths, line numbers, and matching lines
4. Report the correct number of files searched and matches found

## Test Parameters

- `pattern`: "isSource"
- `paths`: ["server/ql/javascript/examples/src"]
- `contextLines`: 1

## Expected Behavior

The tool should:

1. Recursively search `.ql` and `.qll` files in the specified directory
2. Return matches with file paths, line numbers, and context lines
3. Report `filesSearched`, `totalMatches`, `returnedMatches`, and `truncated` fields
