# `codeql_lsp_completion/basic_completion`

## PURPOSE

Tests that `codeql_lsp_completion` returns completion items when the cursor is
positioned on a type name in a `from` clause of a CodeQL query.

## INPUTS

- **file_path**: `server/ql/javascript/examples/src/ExampleQuery1/ExampleQuery1.ql`
- **line**: 12 (on the type name in the `from` clause)
- **character**: 7 (cursor on the type name)

## EXPECTED OUTPUTS

- A list of completion items (may be empty if no workspace URI is set).
- Monitoring state updated to record a successful `codeql_lsp_completion` call.
