# Integration Test: sarif_extract_rule - extract_sql_injection

## Purpose

Validates that the `sarif_extract_rule` tool correctly extracts results for a
specific rule (`js/sql-injection`) from a multi-rule SARIF file containing
results from two rules (`js/sql-injection` and `js/missing-rate-limiting`).

## Inputs

- `test-input.sarif`: A multi-rule SARIF file with 3 results (2 for
  `js/sql-injection` path-problem, 1 for `js/missing-rate-limiting` problem).

## Expected Behavior

The tool returns a SARIF JSON subset containing only:

- The `js/sql-injection` rule definition
- The 2 results matching that rule ID
- Preserved `codeFlows`, `relatedLocations`, and `partialFingerprints`
- Preserved tool extensions
