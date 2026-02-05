# `codeql_resolve_qlref` - resolve_javascript_qlref

## Purpose

Tests the `codeql_resolve_qlref` tool by resolving a `.qlref` file to its corresponding `.ql` query file.

## Inputs

- **qlref**: Path to the `.qlref` file in the JavaScript examples directory
- **format**: Output format (`json`)

## Expected Behavior

The tool should resolve the `.qlref` file path to the actual `.ql` query file path it references.

## Static Files Referenced

- `server/ql/javascript/examples/test/ExampleQuery1/ExampleQuery1.qlref`
- Resolves to: `server/ql/javascript/examples/src/ExampleQuery1/ExampleQuery1.ql`
