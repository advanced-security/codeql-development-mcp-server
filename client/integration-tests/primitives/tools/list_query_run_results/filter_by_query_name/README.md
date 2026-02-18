# `list_query_run_results` - filter_by_query_name

## Purpose

Tests the `list_query_run_results` tool with the `queryName` filter parameter.
When `CODEQL_QUERY_RUN_RESULTS_DIRS` is not set, the tool should return a
helpful message regardless of the filter value.

This test validates that the `queryName` parameter is accepted by the tool
schema without causing a validation error.
