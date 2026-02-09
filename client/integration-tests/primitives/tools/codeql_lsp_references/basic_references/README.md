# `codeql_lsp_references/basic_references`

## PURPOSE

Tests that `codeql_lsp_references` returns reference locations when the cursor
is on a variable name used in a `where` clause of a CodeQL query.

## INPUTS

- **file_path**: `server/ql/javascript/examples/src/ExampleQuery1/ExampleQuery1.ql`
- **line**: 13 (on a variable reference in the `where` clause)
- **character**: 6 (cursor on the variable name)

## EXPECTED OUTPUTS

- One or more reference locations, including the declaration.
- Monitoring state updated to record a successful `codeql_lsp_references` call.
