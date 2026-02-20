# `profile_codeql_query_from_logs` - single_query_raw_log

## Purpose

Tests the `profile_codeql_query_from_logs` tool with a single-query raw
evaluator log (`evaluator-log.jsonl`) produced by `codeql query run`.

## Inputs

- `before/evaluator-log.jsonl` — Raw evaluator log from a single
  `codeql query run` execution (ExampleQuery1.ql against a JavaScript database).
- `test-config.json` — Specifies `evaluatorLog`, `outputDir`, and `topN=10`.

## Outputs

- `after/query-evaluation-profile.json` — Structured profile with one query,
  9 predicates, 1 cache hit, and 203.81ms total duration.
- `after/query-evaluation-profile.md` — Mermaid diagram with single-query
  layout showing top 9 predicates.
