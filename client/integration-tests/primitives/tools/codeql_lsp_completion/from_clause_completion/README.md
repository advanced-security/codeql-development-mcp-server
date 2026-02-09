# `codeql_lsp_completion/from_clause_completion`

## PURPOSE

Tests that `codeql_lsp_completion` returns keyword completions when the cursor
is positioned after a partial keyword `wh` following a `from` clause. Uses
`file_content` to provide inline query text, producing a small set of
completions (e.g. `where`) rather than an exhaustive type list.

## INPUTS

- **file_content**: Inline QL with cursor after `wh` prefix
- **file_path**: `server/ql/javascript/examples/src/ExampleQuery1/ExampleQuery1.ql`
- **line**: 3 (after `wh`)
- **character**: 2 (end of `wh` prefix)
- **workspace_uri**: `server/ql/javascript/examples`

## EXPECTED OUTPUTS

- A list of completion items matching the `wh` prefix (e.g. `where`).
- Monitoring state updated to record a successful `codeql_lsp_completion` call.
