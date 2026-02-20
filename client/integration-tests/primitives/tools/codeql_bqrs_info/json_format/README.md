# `codeql_bqrs_info` - json_format

## Purpose

Tests the `codeql_bqrs_info` tool with `format=json` to get machine-readable
output. This test exercises the `--format` CLI option being passed through to
the CLI correctly — previously `format` was silently swallowed by the tool
registry and not passed to `codeql bqrs info`, causing quiet fallback to text
format.
