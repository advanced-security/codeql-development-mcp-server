# `codeql_lsp_diagnostics/valid_query_no_errors`

## PURPOSE

Tests that `codeql_lsp_diagnostics` returns zero diagnostics for a
syntactically and semantically valid QL snippet.

## INPUTS

- **ql_code**: A valid inline QL query (`select 1 + 1`).

## EXPECTED OUTPUTS

- `isValid` is `true`, zero errors/warnings in the summary.
- The `valid_query.ql` file remains unchanged.
- Monitoring state updated to record a successful `codeql_lsp_diagnostics` call.
