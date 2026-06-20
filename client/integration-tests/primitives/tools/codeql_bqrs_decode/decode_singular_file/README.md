# `codeql_bqrs_decode` - decode_singular_file

## Purpose

Regression test for [#302](https://github.com/advanced-security/codeql-development-mcp-server/issues/302):
the `codeql_bqrs_decode` tool must accept a singular `file` (string) argument,
not only the plural `files` (array) form. Automated/LLM clients naturally try
`file` first, and it previously failed schema validation with
`must have required property 'files'`.

This test invokes `codeql_bqrs_decode` with a singular `file` argument and
verifies that the BQRS file is decoded successfully.

## Inputs

- `before/results.bqrs` — BQRS file with a `#select` result set.
- `test-config.json` — Specifies the singular `file`, `format`, and `no-titles` arguments.

## Outputs

- Tool returns decoded CSV output for the BQRS file without column headers.
