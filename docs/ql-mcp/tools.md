# Tools

> Complete reference of MCP tools provided by the CodeQL Development MCP Server.

## Overview

The server exposes **34 always-on tools** and **11 optional monitoring tools**. Always-on tools are available in every session; monitoring tools require explicit opt-in (see [Monitoring and Reporting](../mcp-server-monitoring-and-reporting.md)).

## Always-On Tools

### CodeQL CLI Tools

| Tool                          | Description                                                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `codeql_bqrs_decode`          | Decode BQRS result files to human-readable formats                                                                           |
| `codeql_bqrs_info`            | Get metadata and information about BQRS result files                                                                         |
| `codeql_bqrs_interpret`       | Interpret BQRS result files according to query metadata and generate output in specified formats (CSV, SARIF, graph formats) |
| `codeql_database_analyze`     | Run queries or query suites against CodeQL databases                                                                         |
| `codeql_database_create`      | Create a CodeQL database from source code                                                                                    |
| `codeql_generate_log-summary` | Create a summary of a structured JSON evaluator event log file                                                               |
| `codeql_generate_query-help`  | Generate query help documentation from QLDoc comments                                                                        |
| `codeql_pack_install`         | Install CodeQL pack dependencies                                                                                             |
| `codeql_pack_ls`              | List CodeQL packs under some local directory path                                                                            |
| `codeql_query_compile`        | Compile and validate CodeQL queries                                                                                          |
| `codeql_query_format`         | Automatically format CodeQL source code files                                                                                |
| `codeql_query_run`            | Execute a CodeQL query against a database                                                                                    |
| `codeql_resolve_database`     | Resolve database path and validate database structure                                                                        |
| `codeql_resolve_languages`    | List installed CodeQL extractor packs                                                                                        |
| `codeql_resolve_library-path` | Resolve library path for CodeQL queries and libraries                                                                        |
| `codeql_resolve_metadata`     | Resolve and return the key-value metadata pairs from a CodeQL query source file                                              |
| `codeql_resolve_qlref`        | Resolve qlref files to their corresponding query files                                                                       |
| `codeql_resolve_queries`      | List available CodeQL queries found on the local filesystem                                                                  |
| `codeql_resolve_tests`        | Resolve the local filesystem paths of unit tests and/or queries under some base directory                                    |
| `codeql_test_accept`          | Accept new test results as the expected baseline                                                                             |
| `codeql_test_extract`         | Extract test databases for CodeQL query tests                                                                                |
| `codeql_test_run`             | Run CodeQL query tests                                                                                                       |

### Language Server Protocol (LSP) Tools

| Tool                     | Description                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| `codeql_lsp_completion`  | Get code completions at a cursor position in a CodeQL file                                      |
| `codeql_lsp_definition`  | Go to the definition of a CodeQL symbol at a given position                                     |
| `codeql_lsp_diagnostics` | Authoritative syntax and semantic validation of CodeQL (QL) code via the CodeQL Language Server |
| `codeql_lsp_references`  | Find all references to a CodeQL symbol at a given position                                      |

### Query Development Tools

| Tool                      | Description                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `create_codeql_query`     | Create directory structure and files for a new CodeQL query with tests                                             |
| `find_class_position`     | Find the start/end line and column of a class for quick evaluation                                                 |
| `find_codeql_query_files` | Find and track all files and directories related to a CodeQL query, including resolved metadata                    |
| `find_predicate_position` | Find the start/end line and column of a predicate for quick evaluation                                             |
| `profile_codeql_query`    | Profile the performance of a CodeQL query run against a specific database by analyzing the evaluator log JSON file |
| `quick_evaluate`          | Quick evaluate either a class or a predicate in a CodeQL query for debugging                                       |
| `register_database`       | Register a CodeQL database given a local path to the database directory                                            |
| `validate_codeql_query`   | Quick heuristic validation for CodeQL query structure (does not compile the query)                                 |

## Optional Monitoring Tools

These tools are disabled by default and require opt-in. See [Monitoring and Reporting](../mcp-server-monitoring-and-reporting.md) for details.

### Session Management

| Tool                   | Description                                                  |
| ---------------------- | ------------------------------------------------------------ |
| `session_end`          | End a query development session with final status            |
| `session_get`          | Get complete details of a specific query development session |
| `session_list`         | List query development sessions with optional filtering      |
| `session_update_state` | Update the current state of a query development session      |

### Session Analytics

| Tool                              | Description                                                      |
| --------------------------------- | ---------------------------------------------------------------- |
| `session_calculate_current_score` | Calculate current quality score for a session based on its state |
| `session_get_call_history`        | Get MCP call history for a specific session                      |
| `session_get_score_history`       | Get quality score history for a specific session                 |
| `session_get_test_history`        | Get test execution history for a specific session                |

### Batch Operations

| Tool                 | Description                                                             |
| -------------------- | ----------------------------------------------------------------------- |
| `sessions_aggregate` | Generate aggregate insights from multiple sessions based on filters     |
| `sessions_compare`   | Compare multiple query development sessions across specified dimensions |
| `sessions_export`    | Export session data in specified format for external analysis           |
