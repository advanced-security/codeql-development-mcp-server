# MCP Server Tools

This resource provides a complete reference of the default tools exposed by the CodeQL Development MCP Server. These tools wrap the CodeQL CLI and supporting utilities, enabling an LLM to develop, test, and analyze CodeQL queries programmatically.

## CodeQL CLI Tools

| Tool                          | Description                                                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `codeql_bqrs_decode`          | Decode BQRS result files to human-readable formats (text, csv, json). Supports `--result-set` and `--rows` for pagination    |
| `codeql_bqrs_info`            | Get metadata about BQRS result files: result sets, column types, row counts                                                  |
| `codeql_bqrs_interpret`       | Interpret BQRS result files according to query metadata and generate output in specified formats (CSV, SARIF, graph formats) |
| `codeql_database_analyze`     | Run queries or query suites against CodeQL databases. Produces evaluator logs, BQRS, and SARIF output                        |
| `codeql_database_create`      | Create a CodeQL database from source code                                                                                    |
| `codeql_generate_log-summary` | Create a summary of a structured JSON evaluator event log file                                                               |
| `codeql_generate_query-help`  | Generate query help documentation from QLDoc comments                                                                        |
| `codeql_pack_install`         | Install CodeQL pack dependencies                                                                                             |
| `codeql_pack_ls`              | List CodeQL packs under a local directory path                                                                               |
| `codeql_query_compile`        | Compile and validate CodeQL queries                                                                                          |
| `codeql_query_format`         | Automatically format CodeQL source code files                                                                                |
| `codeql_query_run`            | Execute a CodeQL query against a database                                                                                    |
| `codeql_resolve_database`     | Resolve database path and validate database structure                                                                        |
| `codeql_resolve_languages`    | List installed CodeQL extractor packs                                                                                        |
| `codeql_resolve_library-path` | Resolve library path for CodeQL queries and libraries                                                                        |
| `codeql_resolve_metadata`     | Resolve and return key-value metadata pairs from a CodeQL query source file                                                  |
| `codeql_resolve_qlref`        | Resolve `.qlref` files to their corresponding query files                                                                    |
| `codeql_resolve_queries`      | List available CodeQL queries found on the local filesystem                                                                  |
| `codeql_resolve_tests`        | Resolve the local filesystem paths of unit tests and/or queries under a base directory                                       |
| `codeql_test_accept`          | Accept new test results as the expected baseline                                                                             |
| `codeql_test_extract`         | Extract test databases for CodeQL query tests                                                                                |
| `codeql_test_run`             | Run CodeQL query tests                                                                                                       |

## Language Server Protocol (LSP) Tools

| Tool                     | Description                                                                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `codeql_lsp_completion`  | Get code completions at a cursor position in a CodeQL file                                                                                                                   |
| `codeql_lsp_definition`  | Go to the definition of a CodeQL symbol at a given position                                                                                                                  |
| `codeql_lsp_diagnostics` | Syntax and semantic validation of CodeQL code via the Language Server. Note: inline `ql_code` cannot resolve pack imports; use `codeql_query_compile` for files with imports |
| `codeql_lsp_references`  | Find all references to a CodeQL symbol at a given position                                                                                                                   |

## Query Development Tools

| Tool                             | Description                                                                                                  |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `create_codeql_query`            | Create directory structure and files for a new CodeQL query with tests                                       |
| `find_class_position`            | Find the start/end line and column of a class for quick evaluation                                           |
| `find_codeql_query_files`        | Find and track all files and directories related to a CodeQL query, including resolved metadata              |
| `find_predicate_position`        | Find the start/end line and column of a predicate for quick evaluation                                       |
| `list_codeql_databases`          | List CodeQL databases discovered in configured base directories                                              |
| `list_mrva_run_results`          | List MRVA (Multi-Repository Variant Analysis) run results with per-repo details                              |
| `list_query_run_results`         | List query run result directories with artifact inventory. Filter by `queryName`, `language`, or `queryPath` |
| `profile_codeql_query`           | Profile the performance of a CodeQL query run against a specific database by analyzing the evaluator log     |
| `profile_codeql_query_from_logs` | Parse existing CodeQL evaluator logs into a performance profile without re-running the query                 |
| `quick_evaluate`                 | Quick evaluate either a class or a predicate in a CodeQL query for debugging                                 |
| `read_database_source`           | Read source file contents from a CodeQL database source archive. Omit `filePath` to list all files           |
| `register_database`              | Register a CodeQL database given a local path to the database directory                                      |
| `validate_codeql_query`          | Quick heuristic validation for CodeQL query structure (does not compile the query)                           |

## Common Tool Workflows

### Create and Test a Query

1. `create_codeql_query` — scaffold files
2. `codeql_pack_install` — install dependencies
3. `codeql_query_compile` — validate syntax
4. `codeql_test_run` — run tests
5. `codeql_test_accept` — accept correct results

### Understand Code Structure

1. `codeql_query_run` with `queryName="PrintAST"` — visualize the AST
2. `codeql_query_run` with `queryName="PrintCFG"` — visualize control flow
3. `codeql_query_run` with `queryName="CallGraphFrom"` / `"CallGraphTo"` — trace call relationships

### Profile Query Performance

1. `codeql_query_run` with `evaluationOutput` — run query and capture evaluator logs
2. `profile_codeql_query_from_logs` — analyze evaluator logs for bottlenecks
3. `codeql_generate_log-summary` — generate a human-readable log summary

### Interactive Development

1. `codeql_lsp_completion` — get QL code completions
2. `codeql_lsp_definition` — navigate to definitions
3. `codeql_lsp_references` — find all references
4. `codeql_lsp_diagnostics` — real-time validation

## Tool Input Conventions

- **LSP tools** use **0-based** line and column positions for input. Output uses 1-based `startLine`/`endLine`.
- **`find_predicate_position`** and **`find_class_position`** return **1-based** positions.
- **`workspace_uri`** for LSP tools must be a **plain directory path** to the pack root containing `codeql-pack.yml`, not a `file://` URI.

## Related Resources

- `codeql://server/overview` — MCP server orientation guide
- `codeql://server/prompts` — Complete prompt reference
- `codeql://learning/query-basics` — Query writing reference
- `codeql://patterns/performance` — Performance profiling guide
