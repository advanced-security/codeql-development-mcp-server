# `codeql_lsp_definition/basic_definition`

## PURPOSE

Tests that `codeql_lsp_definition` returns definition locations when the cursor
is on a variable name in a `where` clause of a CodeQL query.

## INPUTS

- **file_path**: `server/ql/javascript/examples/src/ExampleQuery1/ExampleQuery1.ql`
- **line**: 13 (on a variable reference in the `where` clause)
- **character**: 6 (cursor on the variable name)

## EXPECTED OUTPUTS

- One or more definition locations, or an empty list if the symbol is not resolvable.
- Monitoring state updated to record a successful `codeql_lsp_definition` call.
