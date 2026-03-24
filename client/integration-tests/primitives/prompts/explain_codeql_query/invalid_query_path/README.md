# Integration Test: explain_codeql_query / invalid_query_path

## Purpose

Verify that the `explain_codeql_query` prompt returns a helpful error message
when the user provides a `queryPath` that does not exist on disk.

## Expected Behavior

- The prompt handler resolves the relative path against the workspace root.
- When the resolved path does not exist, the prompt returns a warning in the
  response messages rather than throwing a raw MCP protocol error.
- The warning message should mention the file was not found so the user can
  correct the path.

## Parameters

| Parameter      | Value                          | Notes              |
| -------------- | ------------------------------ | ------------------ |
| `databasePath` | `nonexistent/path/to/database` | Does **not** exist |
| `queryPath`    | `nonexistent/path/to/query.ql` | Does **not** exist |
| `language`     | `javascript`                   | Valid language     |
