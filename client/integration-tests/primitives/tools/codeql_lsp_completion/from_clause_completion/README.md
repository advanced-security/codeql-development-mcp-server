# `codeql_lsp_completion/from_clause_completion`

## PURPOSE

Tests that `codeql_lsp_completion` returns completion items when the cursor is
positioned inside a `from` clause after an `import` statement.

## INPUTS

- **file_path**: `server/ql/javascript/examples/src/ExampleQuery1/ExampleQuery1.ql`
- **line**: 11 (inside the `from` clause)
- **character**: 5 (after keyword prefix)

## EXPECTED OUTPUTS

- A non-empty list of completion items with labels, documentation, and kind.
- Monitoring state updated to record a successful `codeql_lsp_completion` call.
