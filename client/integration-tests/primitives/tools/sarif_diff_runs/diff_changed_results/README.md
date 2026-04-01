# Integration Test: sarif_diff_runs - diff_changed_results

## Purpose

Validates that the `sarif_diff_runs` tool detects result count changes
between two SARIF analysis runs of the same query pack.

## Inputs

- `baseline.sarif`: 3 results (2 sql-injection + 1 rate-limiting)
- `comparison.sarif`: 2 results (1 sql-injection + 1 rate-limiting)

## Expected Behavior

Returns a diff showing `js/sql-injection` in `changedRules` with
`countA: 2`, `countB: 1`, `delta: -1`, and `js/missing-rate-limiting`
in `unchangedRules`.
