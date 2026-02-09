# `codeql_lsp_definition/class_definition`

## PURPOSE

Tests that `codeql_lsp_definition` returns definition locations when the cursor
is on a class name used in a `from` clause.

## INPUTS

- **file_path**: `server/ql/javascript/examples/src/ExampleQuery1/ExampleQuery1.ql`
- **line**: 12 (on the class name in the `from` clause)
- **character**: 5 (cursor on the class name)

## EXPECTED OUTPUTS

- One or more definition locations with URIs pointing to `.qll` library files.
- Monitoring state updated to record a successful `codeql_lsp_definition` call.
