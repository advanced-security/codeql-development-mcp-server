# `codeql_bqrs_decode` - decode_with_result_set

## Purpose

Tests the `codeql_bqrs_decode` tool with the `result-set` parameter to decode
a specific result set from a BQRS file. This test exercises the `--result-set`,
`--format`, and `--no-titles` CLI options which were previously untested,
allowing non-existent options like `--max-results` to go undetected.

## Inputs

- `before/results.bqrs` — BQRS file with a `#select` result set (1 row, 2 columns).
- `test-config.json` — Specifies `result-set`, `format`, and `no-titles` arguments.

## Outputs

- Tool returns decoded CSV output for the `#select` result set without column headers.
