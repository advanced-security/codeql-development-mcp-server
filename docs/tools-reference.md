# Tools Reference

This document provides a comprehensive reference for all tools available in the CodeQL Development MCP Server.

## Overview

The MCP server provides tools that wrap CodeQL CLI commands and helper utilities for CodeQL development workflows. Tools are organized into the following categories:

- **Query Development** - Create, compile, and format queries
- **Query Execution** - Run queries and process results
- **Validation & LSP** - Validate QL code and navigate symbols via LSP
- **Testing** - Run and manage CodeQL tests
- **Database Operations** - Create and analyze databases
- **Resolution** - Resolve paths, dependencies, and metadata
- **BQRS Processing** - Work with query result files
- **Utility** - Helper tools for common workflows

## Query Development Tools

### codeql_query_compile

Compile CodeQL queries to check for errors.

**Parameters:**

| Parameter  | Type   | Required | Description                           |
| ---------- | ------ | -------- | ------------------------------------- |
| `query`    | string | Yes      | Path to the query file to compile     |
| `database` | string | No       | Database to compile against           |
| `library`  | string | No       | Additional search paths for libraries |

**Example:**

```text
Compile a query:
- query: /path/to/MyQuery.ql
- database: /path/to/database
```

### codeql_query_format

Format CodeQL queries according to standard conventions.

**Parameters:**

| Parameter  | Type     | Required | Description                                |
| ---------- | -------- | -------- | ------------------------------------------ |
| `files`    | string[] | Yes      | Paths to the query files to format         |
| `in-place` | boolean  | No       | Whether to modify the query files in place |

**Example:**

```text
Format queries in place:
- files:
  - /path/to/MyQuery.ql
- in-place: true
```

### create_codeql_query

Create a new CodeQL query with proper directory structure and test scaffolding.

**Parameters:**

| Parameter     | Type   | Required | Description                                    |
| ------------- | ------ | -------- | ---------------------------------------------- |
| `queryName`   | string | Yes      | Name of the query to create                    |
| `language`    | string | Yes      | Target language (e.g., `python`, `javascript`) |
| `basePath`    | string | Yes      | Base path for the query                        |
| `description` | string | No       | Query description                              |

**Example:**

```text
Create a new query:
- queryName: SqlInjection
- language: python
- basePath: /path/to/queries
```

## Query Execution Tools

### codeql_query_run

Execute a CodeQL query against a database.

**Parameters:**

| Parameter  | Type   | Required | Description                  |
| ---------- | ------ | -------- | ---------------------------- |
| `query`    | string | Yes      | Path to the query file       |
| `database` | string | Yes      | Path to the CodeQL database  |
| `output`   | string | No       | Output file path for results |
| `timeout`  | number | No       | Execution timeout in seconds |

**Example:**

```text
Run a query:
- query: /path/to/MyQuery.ql
- database: /path/to/database
- output: /path/to/results.bqrs
```

### codeql_execute_query_server2

Execute queries using the CodeQL query server for improved performance.

**Parameters:**

| Parameter  | Type   | Required | Description                 |
| ---------- | ------ | -------- | --------------------------- |
| `query`    | string | Yes      | Path to the query file      |
| `database` | string | Yes      | Path to the CodeQL database |

**Example:**

```text
Execute with query server:
- query: /path/to/MyQuery.ql
- database: /path/to/database
```

### codeql_database_analyze

Run analysis queries against a CodeQL database.

**Parameters:**

| Parameter  | Type   | Required | Description                      |
| ---------- | ------ | -------- | -------------------------------- |
| `database` | string | Yes      | Path to the CodeQL database      |
| `queries`  | string | No       | Query suite or pack to run       |
| `format`   | string | No       | Output format (sarif, csv, etc.) |
| `output`   | string | No       | Output file path                 |

**Example:**

```text
Analyze a database:
- database: /path/to/database
- queries: codeql/python-queries
- format: sarif
- output: /path/to/results.sarif
```

## Validation & LSP Tools

### validate_codeql_query

Quick heuristic validation for CodeQL query structure. Checks for common patterns like `from`/`where`/`select` clauses and metadata presence. Does **not** compile the query.

**Parameters:**

| Parameter  | Type   | Required | Description                       |
| ---------- | ------ | -------- | --------------------------------- |
| `query`    | string | Yes      | The CodeQL query text to validate |
| `language` | string | No       | Target programming language       |

### codeql_lsp_diagnostics

Authoritative syntax and semantic validation of CodeQL (QL) code via the CodeQL Language Server. Compiles the query and provides real-time diagnostics with precise error locations.

> **Note**: Inline `ql_code` is evaluated as a virtual document and cannot resolve pack imports (e.g., `import javascript`). For validating queries with imports, use `codeql_query_compile` on the actual file instead. This tool is best for syntax validation and checking QL code fragments that don't depend on external libraries.

**Parameters:**

| Parameter       | Type   | Required | Description                                          |
| --------------- | ------ | -------- | ---------------------------------------------------- |
| `ql_code`       | string | Yes      | The CodeQL code to evaluate                          |
| `workspace_uri` | string | No       | Workspace URI for context (defaults to `./ql`)       |
| `search_path`   | string | No       | Search path for CodeQL libraries                     |
| `log_level`     | string | No       | Log level: OFF, ERROR, WARN, INFO, DEBUG, TRACE, ALL |

### codeql_lsp_completion

Get code completions at a cursor position in a CodeQL file.

> **Important**: Set `workspace_uri` to the pack or workspace root directory (as a `file://` URI) for dependency resolution. Without it, completions for imported library types will be empty.

**Parameters:**

| Parameter       | Type   | Required | Description                                                                    |
| --------------- | ------ | -------- | ------------------------------------------------------------------------------ |
| `file_path`     | string | Yes      | Path to the `.ql`/`.qll` file (relative paths resolved against user workspace) |
| `line`          | number | Yes      | 0-based line number                                                            |
| `character`     | number | Yes      | 0-based character offset                                                       |
| `file_content`  | string | No       | File content override (reads disk if omitted)                                  |
| `search_path`   | string | No       | Search path for CodeQL libraries                                               |
| `workspace_uri` | string | No       | Workspace URI for context                                                      |

### codeql_lsp_definition

Go to the definition of a CodeQL symbol at a given position.

**Parameters:**

| Parameter       | Type   | Required | Description                                                                    |
| --------------- | ------ | -------- | ------------------------------------------------------------------------------ |
| `file_path`     | string | Yes      | Path to the `.ql`/`.qll` file (relative paths resolved against user workspace) |
| `line`          | number | Yes      | 0-based line number                                                            |
| `character`     | number | Yes      | 0-based character offset                                                       |
| `file_content`  | string | No       | File content override (reads disk if omitted)                                  |
| `search_path`   | string | No       | Search path for CodeQL libraries                                               |
| `workspace_uri` | string | No       | Workspace URI for context                                                      |

### codeql_lsp_references

Find all references to a CodeQL symbol at a given position.

**Parameters:**

| Parameter       | Type   | Required | Description                                                                    |
| --------------- | ------ | -------- | ------------------------------------------------------------------------------ |
| `file_path`     | string | Yes      | Path to the `.ql`/`.qll` file (relative paths resolved against user workspace) |
| `line`          | number | Yes      | 0-based line number                                                            |
| `character`     | number | Yes      | 0-based character offset                                                       |
| `file_content`  | string | No       | File content override (reads disk if omitted)                                  |
| `search_path`   | string | No       | Search path for CodeQL libraries                                               |
| `workspace_uri` | string | No       | Workspace URI for context                                                      |

## Testing Tools

### codeql_test_run

Run CodeQL unit tests.

**Parameters:**

| Parameter | Type   | Required | Description                         |
| --------- | ------ | -------- | ----------------------------------- |
| `path`    | string | Yes      | Path to test directory or test file |
| `threads` | number | No       | Number of threads to use            |

**Example:**

```text
Run tests:
- path: /path/to/tests
- threads: 4
```

### codeql_test_accept

Accept test results as expected output.

**Parameters:**

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `path`    | string | Yes      | Path to test directory |

**Example:**

```text
Accept test results:
- path: /path/to/test
```

### codeql_test_extract

Extract test databases from test source files.

**Parameters:**

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `path`    | string | Yes      | Path to test directory |

**Example:**

```text
Extract test database:
- path: /path/to/test
```

## Database Operations

### codeql_database_create

Create a CodeQL database from source code.

**Parameters:**

| Parameter  | Type   | Required | Description                 |
| ---------- | ------ | -------- | --------------------------- |
| `source`   | string | Yes      | Path to source code         |
| `language` | string | Yes      | Programming language        |
| `database` | string | Yes      | Output database path        |
| `command`  | string | No       | Build command (if required) |

**Example:**

```text
Create a database:
- source: /path/to/source
- language: python
- database: /path/to/database
```

## Resolution Tools

### codeql_resolve_database

Get information about a CodeQL database.

**Parameters:**

| Parameter  | Type   | Required | Description          |
| ---------- | ------ | -------- | -------------------- |
| `database` | string | Yes      | Path to the database |

**Example:**

```text
Resolve database info:
- database: /path/to/database
```

### codeql_resolve_languages

List available CodeQL languages.

**Parameters:** None

**Example:**

```text
List supported languages
```

### codeql_resolve_library_path

Resolve library search paths for a query.

**Parameters:**

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `query`   | string | Yes      | Path to the query file |

**Example:**

```text
Resolve library paths:
- query: /path/to/MyQuery.ql
```

### codeql_resolve_metadata

Get metadata for a query.

**Parameters:**

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `query`   | string | Yes      | Path to the query file |

**Example:**

```text
Get query metadata:
- query: /path/to/MyQuery.ql
```

### codeql_resolve_qlref

Resolve a `.qlref` file to its target query.

**Parameters:**

| Parameter | Type   | Required | Description               |
| --------- | ------ | -------- | ------------------------- |
| `qlref`   | string | Yes      | Path to the `.qlref` file |

**Example:**

```text
Resolve qlref:
- qlref: /path/to/test/MyQuery.qlref
```

### codeql_resolve_queries

Resolve a query suite to individual queries.

**Parameters:**

| Parameter | Type   | Required | Description               |
| --------- | ------ | -------- | ------------------------- |
| `suite`   | string | Yes      | Query suite specification |

**Example:**

```text
Resolve query suite:
- suite: codeql/python-queries
```

### codeql_resolve_tests

Find all tests in a directory.

**Parameters:**

| Parameter | Type   | Required | Description              |
| --------- | ------ | -------- | ------------------------ |
| `path`    | string | Yes      | Path to search for tests |

**Example:**

```text
Find tests:
- path: /path/to/tests
```

## BQRS Processing Tools

### codeql_bqrs_decode

Decode a BQRS (Binary Query Result Set) file.

**Parameters:**

| Parameter | Type   | Required | Description                     |
| --------- | ------ | -------- | ------------------------------- |
| `bqrs`    | string | Yes      | Path to the BQRS file           |
| `format`  | string | No       | Output format (json, csv, etc.) |
| `output`  | string | No       | Output file path                |

**Example:**

```text
Decode BQRS file:
- bqrs: /path/to/results.bqrs
- format: json
```

### codeql_bqrs_info

Get information about a BQRS file.

**Parameters:**

| Parameter | Type   | Required | Description           |
| --------- | ------ | -------- | --------------------- |
| `bqrs`    | string | Yes      | Path to the BQRS file |

**Example:**

```text
Get BQRS info:
- bqrs: /path/to/results.bqrs
```

### codeql_bqrs_interpret

Interpret BQRS results as SARIF or other formats.

**Parameters:**

| Parameter | Type   | Required | Description           |
| --------- | ------ | -------- | --------------------- |
| `bqrs`    | string | Yes      | Path to the BQRS file |
| `format`  | string | No       | Output format         |
| `output`  | string | No       | Output file path      |

**Example:**

```text
Interpret as SARIF:
- bqrs: /path/to/results.bqrs
- format: sarif
- output: /path/to/results.sarif
```

## Utility Tools

### find_codeql_query_files

Find all files related to a CodeQL query.

**Parameters:**

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `query`   | string | Yes      | Path to the query file |

**Example:**

```text
Find related files:
- query: /path/to/MyQuery.ql
```

### codeql_pack_install

Install CodeQL pack dependencies.

**Parameters:**

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `path`    | string | Yes      | Path to pack directory |

**Example:**

```text
Install dependencies:
- path: /path/to/pack
```

### codeql_pack_ls

List contents of a CodeQL pack.

**Parameters:**

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `path`    | string | Yes      | Path to pack directory |

**Example:**

```text
List pack contents:
- path: /path/to/pack
```

### codeql_generate_log_summary

Generate a summary of CodeQL evaluator logs.

**Parameters:**

| Parameter | Type   | Required | Description                |
| --------- | ------ | -------- | -------------------------- |
| `log`     | string | Yes      | Path to evaluator log file |

**Example:**

```text
Summarize log:
- log: /path/to/evaluator-log.json
```

### codeql_generate_query_help

Generate documentation for a query.

**Parameters:**

| Parameter | Type   | Required | Description            |
| --------- | ------ | -------- | ---------------------- |
| `query`   | string | Yes      | Path to the query file |
| `output`  | string | No       | Output file path       |

**Example:**

```text
Generate help:
- query: /path/to/MyQuery.ql
- output: /path/to/MyQuery.md
```

### rank_sarif_results

Rank SARIF results to identify likely true positives and false positives.

**Parameters:**

| Parameter | Type   | Required | Description        |
| --------- | ------ | -------- | ------------------ |
| `sarif`   | string | Yes      | Path to SARIF file |

**Example:**

```text
Rank results:
- sarif: /path/to/results.sarif
```

## Common Workflows

### Creating and Testing a New Query

1. Use `create_codeql_query` to scaffold the query structure
2. Edit the generated query file
3. Use `codeql_query_compile` to check for errors
4. Use `codeql_test_run` to run tests
5. Use `codeql_test_accept` to accept correct results

### Running Analysis on a Codebase

1. Use `codeql_database_create` to build a database
2. Use `codeql_query_run` or `codeql_database_analyze` to run queries
3. Use `codeql_bqrs_decode` or `codeql_bqrs_interpret` to process results

### Debugging Query Issues

1. Use `codeql_resolve_library_path` to check library resolution
2. Use `codeql_resolve_metadata` to verify query metadata
3. Use `codeql_generate_log_summary` to analyze performance

## Related Documentation

- [Getting Started Guide](./getting-started.md)
