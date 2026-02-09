# `codeql_lsp_diagnostics/syntax_validation`

## PURPOSE

Tests that `codeql_lsp_diagnostics` detects syntax errors in invalid QL code.

## INPUTS

- **ql_code**: Invalid QL snippet with syntax errors (`invalid_type x\nwhere x = "test"\nselect x, "This has syntax errors"`).

## EXPECTED OUTPUTS

- `isValid` is `false` with one or more error diagnostics.
- The `before/test_query.ql` contains the erroneous query; `after/test_query.ql` shows the corrected version after addressing the diagnostics.
- Monitoring state updated to record a successful `codeql_lsp_diagnostics` call.
