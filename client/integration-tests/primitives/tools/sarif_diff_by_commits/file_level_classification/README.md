# Integration Test: sarif_diff_by_commits - file_level_classification

## Purpose

Validates that the `sarif_diff_by_commits` tool correctly partitions
SARIF results into "new" vs "pre-existing" based on file-level overlap
with a git diff. Uses `HEAD..HEAD` (empty diff) so all results are
classified as pre-existing.

## Inputs

- `results.sarif`: SARIF with 3 results across 2 rules in 3 files
- `refRange`: `HEAD..HEAD` (produces an empty diff)
- `granularity`: `file`

## Expected Behavior

Returns structured output with all 3 results in `preExistingResults`
and 0 results in `newResults`, since the empty diff has no changed files.
