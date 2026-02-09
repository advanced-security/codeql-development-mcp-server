# `codeql_lsp_definition/basic_definition`

## PURPOSE

Tests that `codeql_lsp_definition` resolves the definition of a type used in a
`from` clause. The cursor is on `File` (line 2, character 7) which should
resolve to the `File` class definition in the JavaScript CodeQL library.
Uses `file_content` to provide inline query text.

## INPUTS

- **file_content**: Inline QL with `from File f` clause
- **file_path**: `server/ql/javascript/examples/src/ExampleQuery1/ExampleQuery1.ql`
- **line**: 2 (on the `File` type in `from File f`)
- **character**: 7 (cursor on `File`)
- **workspace_uri**: `server/ql/javascript/examples`

## EXPECTED OUTPUTS

- One or more definition locations with URIs pointing to `.qll` library files.
- Monitoring state updated to record a successful `codeql_lsp_definition` call.
