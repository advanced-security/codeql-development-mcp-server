# `codeql_lsp_definition/class_definition`

## PURPOSE

Tests that `codeql_lsp_definition` resolves the definition of the `javascript`
library module from an `import` statement. The cursor is on `javascript`
(line 0, character 10) which should resolve to the library module definition.
Uses `file_content` to provide inline query text.

## INPUTS

- **file_content**: Inline QL with `import javascript` statement
- **file_path**: `server/ql/javascript/examples/src/ExampleQuery1/ExampleQuery1.ql`
- **line**: 0 (on the `import javascript` statement)
- **character**: 10 (cursor on `javascript`)
- **workspace_uri**: `server/ql/javascript/examples`

## EXPECTED OUTPUTS

- One or more definition locations with URIs pointing to `.qll` library files.
- Monitoring state updated to record a successful `codeql_lsp_definition` call.
