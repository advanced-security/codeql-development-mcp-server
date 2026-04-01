# Integration Test: sarif_list_rules - list_multi_rule

## Purpose

Validates that the `sarif_list_rules` tool lists all rules in a SARIF file
with result counts, severity, precision, and tags.

## Inputs

- `test-input.sarif`: Multi-rule SARIF with 2 rules and 3 results.

## Expected Behavior

Returns a JSON summary with `totalRules: 2`, `totalResults: 3`, and
metadata for each rule including `ruleId`, `resultCount`, `kind`,
`precision`, `severity`, and `tags`.
