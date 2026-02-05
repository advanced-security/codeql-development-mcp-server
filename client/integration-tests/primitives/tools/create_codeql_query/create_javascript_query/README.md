# `create_codeql_query` - create_javascript_query

## Purpose

Tests the `create_codeql_query` tool by scaffolding a new JavaScript CodeQL query structure.

## Inputs

- **basePath**: Temporary path for the new query
- **queryName**: Name of the query to create
- **language**: Target language (`javascript`)
- **description**: Query description

## Expected Behavior

The tool should create the standard query directory structure with:

- Query file (`.ql`)
- Test `.qlref` file
- Test code file
