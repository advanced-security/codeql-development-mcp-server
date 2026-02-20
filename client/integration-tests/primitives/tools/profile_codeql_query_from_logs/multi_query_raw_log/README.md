# `profile_codeql_query_from_logs` - multi_query_raw_log

## Purpose

Tests the `profile_codeql_query_from_logs` tool with a multi-query raw
evaluator log (`evaluator-log.jsonl`) produced by `codeql database analyze`.

This validates that the parser correctly groups predicates by their
`queryCausingWork` event ID reference, producing separate per-query profiles.

## Inputs

- `before/evaluator-log.jsonl` — Raw evaluator log containing two queries
  (QueryA.ql and QueryB.ql) with distinct predicates grouped by
  `queryCausingWork` event ID references.
- `test-config.json` — Specifies `evaluatorLog`, `outputDir`, and `topN=10`.

## Outputs

- `after/query-evaluation-profile.json` — Structured profile with two queries:
  QueryA (2 predicates, 1 cache hit, 200ms) and QueryB (3 predicates, 0 cache
  hits, 300ms).
- `after/query-evaluation-profile.md` — Mermaid diagram with multi-query
  layout showing a root node branching to Q0 (QueryA) and Q1 (QueryB) with
  their respective predicate nodes.
