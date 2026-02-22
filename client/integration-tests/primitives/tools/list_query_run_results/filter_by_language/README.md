# `list_query_run_results` - filter_by_language

## Purpose

Tests the `list_query_run_results` tool with the `language` filter parameter.
This parameter was added to enable filtering query run results by the CodeQL
language of the database they were run against.

This test validates that the `language` parameter is accepted by the tool
schema. The language is extracted from `query.log` files in each query run
directory using the `db-<language>/` segment or `semmlecode.<language>.dbscheme`
filename pattern.
