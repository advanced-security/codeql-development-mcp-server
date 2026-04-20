# Integration Test: sarif_diff_by_commits - line_level_classification

## Purpose

Validates that the `sarif_diff_by_commits` tool correctly handles
line-level granularity classification. Uses `HEAD..HEAD` (empty diff)
so all results are classified as pre-existing regardless of their
line positions.

## Inputs

- `results.sarif`: SARIF with 3 results across 2 rules in 3 files
- `refRange`: `HEAD..HEAD` (produces an empty diff)
- `granularity`: `line`

## Expected Behavior

Returns structured output with `"granularity": "line"`, all 3 results
in `preExistingResults`, and 0 results in `newResults`, since the
empty diff has no changed files or hunks to match against.
