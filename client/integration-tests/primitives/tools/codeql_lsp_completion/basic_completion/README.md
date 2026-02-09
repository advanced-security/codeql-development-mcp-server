# `codeql_lsp_completion/basic_completion`

## PURPOSE

Tests that `codeql_lsp_completion` returns targeted completion items for a
member-access expression. The cursor is positioned after `f.getBa` so the
language server should return completions matching the prefix (e.g.
`getBaseName`). Uses `file_content` to provide inline query text, which
avoids disk I/O and produces a small, focused result set.

## INPUTS

- **file_content**: Inline QL with cursor after `f.getBa`
- **file_path**: `server/ql/javascript/examples/src/ExampleQuery1/ExampleQuery1.ql`
- **line**: 3 (`where f.getBa`)
- **character**: 13 (end of `getBa` prefix)
- **workspace_uri**: `server/ql/javascript/examples`

## EXPECTED OUTPUTS

- A list of completion items matching the `getBa` prefix (e.g. `getBaseName`).
- Monitoring state updated to record a successful `codeql_lsp_completion` call.
