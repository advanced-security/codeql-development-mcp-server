# `codeql_lsp_references/predicate_references`

## PURPOSE

Tests that `codeql_lsp_references` returns reference locations when the cursor
is on a predicate name that is used in a `where` or `select` clause.

## INPUTS

- **file_path**: `server/ql/javascript/examples/src/ExampleQuery1/ExampleQuery1.ql`
- **line**: 14 (on a predicate call in the `where` clause)
- **character**: 4 (cursor on the predicate name)

## EXPECTED OUTPUTS

- One or more reference locations, including the declaration itself.
- Monitoring state updated to record a successful `codeql_lsp_references` call.
