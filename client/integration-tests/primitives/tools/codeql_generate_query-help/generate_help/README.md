# `codeql_generate_query-help` - generate_help

## Purpose

Tests the `codeql_generate_query-help` tool by generating help documentation from QLDoc comments.

## Inputs

- **query**: Path to the query file with QLDoc comments
- **format**: Output format (`markdown`)

## Expected Behavior

The tool should generate query help documentation in markdown format from the QLDoc comments in the query file.

## Static Files Referenced

- `server/ql/javascript/examples/src/ExampleQuery1/ExampleQuery1.ql`
