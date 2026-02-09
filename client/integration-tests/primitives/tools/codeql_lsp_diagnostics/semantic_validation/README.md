# `codeql_lsp_diagnostics/semantic_validation`

## PURPOSE

Tests that `codeql_lsp_diagnostics` detects semantic errors in QL code that
references undefined types (e.g., `UndefinedType`).

## INPUTS

- **ql_code**: A QL query fragment referencing `UndefinedType` which does not
  exist, triggering a semantic "could not resolve type" diagnostic.

## EXPECTED OUTPUTS

- `isValid` is `false` with semantic diagnostics about unresolvable types.
- The `before/semantic_query.ql` contains the erroneous query; `after/semantic_query.ql` shows the corrected version after addressing the diagnostics.
- Monitoring state updated to record a successful `codeql_lsp_diagnostics` call.
