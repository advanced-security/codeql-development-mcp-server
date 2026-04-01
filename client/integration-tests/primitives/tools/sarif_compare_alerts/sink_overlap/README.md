# Integration Test: sarif_compare_alerts - sink_overlap

## Purpose

Validates that the `sarif_compare_alerts` tool correctly compares code locations
between two SARIF alerts from different rules to detect sink-level overlap.

## Inputs

- `test-input.sarif`: A multi-rule SARIF file where `js/sql-injection` result 0
  and `js/missing-rate-limiting` result 0 both reference `src/routes/users.js`
  but at different line ranges — so they should NOT have sink overlap.

## Expected Behavior

The tool returns a comparison result with:

- `overlaps`: false (the two alerts are at different lines in the same file)
- `overlapMode`: "sink"
- Alert details for both A and B (ruleId, location, message)
- Empty `sharedLocations` array
