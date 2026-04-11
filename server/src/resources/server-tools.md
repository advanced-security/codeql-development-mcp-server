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
| `codeql_resolve_files`        | Find files in a directory tree, filtered by extension and glob patterns. Useful for discovering QL library files             |
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
| `profile_codeql_query_from_logs` | Parse evaluator logs into a compact profile with line-indexed detail file for targeted read_file access      |
| `quick_evaluate`                 | Quick evaluate either a class or a predicate in a CodeQL query for debugging                                 |
| `read_database_source`           | Read source file contents from a CodeQL database source archive. Omit `filePath` to list all files           |
| `register_database`              | Register a CodeQL database given a local path to the database directory                                      |
| `search_ql_code`                 | Search QL source files for text or regex patterns with structured results (replaces grep for QL code)        |
| `validate_codeql_query`          | Quick heuristic validation for CodeQL query structure (does not compile the query)                           |

## SARIF Analysis Tools

| Tool                     | Description                                                                                          |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `sarif_compare_alerts`   | Compare code locations of two SARIF alerts for overlap (sink, source, any-location, full-path modes) |
| `sarif_diff_by_commits`  | Correlate SARIF results with a git diff to classify findings as "new" or "pre-existing"              |
| `sarif_diff_runs`        | Diff two SARIF files to find added, removed, and changed rules/results across analysis runs          |
| `sarif_extract_rule`     | Extract all data for a specific rule from multi-rule SARIF. Returns a valid SARIF JSON subset        |
| `sarif_list_rules`       | List all rules in a SARIF file with result counts, severity, precision, and tags                     |
| `sarif_rule_to_markdown` | Convert per-rule SARIF data to markdown with Mermaid dataflow diagrams                               |

### `sarif_list_rules` Response Format

Returns a JSON object with per-rule result counts and metadata:

```json
{
  "totalRules": 3,
  "totalResults": 15,
  "rules": [
    {
      "ruleId": "js/sql-injection",
      "resultCount": 8,
      "name": "Database query built from user-controlled sources",
      "kind": "path-problem",
      "precision": "high",
      "severity": "8.8",
      "tags": ["security", "external/cwe/cwe-089"],
      "tool": "CodeQL",
      "toolVersion": "2.20.4"
    }
  ]
}
```

| Field          | Type   | Description                                      |
| -------------- | ------ | ------------------------------------------------ |
| `totalRules`   | number | Total number of distinct rules in the SARIF file |
| `totalResults` | number | Sum of `resultCount` across all rules            |
| `rules[]`      | array  | Per-rule summaries (see below)                   |

Each rule object:

| Field         | Type     | Required | Description                                                                  |
| ------------- | -------- | -------- | ---------------------------------------------------------------------------- |
| `ruleId`      | string   | yes      | Rule identifier (matches the CodeQL query `@id`)                             |
| `resultCount` | number   | yes      | Number of results (findings) for this rule; `0` if defined but not triggered |
| `name`        | string   | no       | Display name (from `shortDescription.text`, `name`, or `id`)                 |
| `kind`        | string   | no       | Query kind (`path-problem`, `problem`, etc.)                                 |
| `precision`   | string   | no       | Precision level (`high`, `medium`, `low`, `very-high`)                       |
| `severity`    | string   | no       | Security severity score (from `security-severity` property)                  |
| `tags`        | string[] | no       | Rule tags (e.g., `security`, `external/cwe/cwe-089`)                         |
| `tool`        | string   | no       | Tool driver name (e.g., `CodeQL`)                                            |
| `toolVersion` | string   | no       | Tool driver version                                                          |

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
4. `codeql_query_run` with `queryName="CallGraphFromTo"` — verify source-to-sink call paths

### Profile Query Performance

1. `codeql_query_run` with `evaluationOutput` — run query and capture evaluator logs
2. `profile_codeql_query_from_logs` — analyze evaluator logs: slowest predicates, RA operations, tuple count progressions, dependencies

### Discover and Search QL Code

1. `codeql_resolve_files` — find QL files by extension and glob patterns in library packs
2. `search_ql_code` — search QL source files for classes, predicates, or patterns by text/regex
3. `codeql_lsp_definition` — navigate to the definition of a discovered symbol
4. `codeql_lsp_references` — find all usages of a symbol across a pack

### Interactive Development

1. `codeql_lsp_completion` — get QL code completions
2. `codeql_lsp_definition` — navigate to definitions
3. `codeql_lsp_references` — find all references
4. `codeql_lsp_diagnostics` — real-time validation

### Analyze and Compare Results

1. `codeql_database_analyze` — run query packs and produce SARIF
2. `sarif_list_rules` — discover rules and result counts in the SARIF
3. `query_results_cache_lookup` with `ruleId` — find cached results by CodeQL query `@id`
4. `sarif_extract_rule` — extract results for a specific rule from multi-rule SARIF
5. `sarif_rule_to_markdown` — generate markdown report with Mermaid dataflow diagrams
6. `sarif_compare_alerts` — compare two alerts for location overlap
7. `sarif_diff_runs` — diff two SARIF files to detect behavioral changes across runs
8. `sarif_diff_by_commits` — correlate SARIF results with git diff to triage new vs pre-existing
9. `query_results_cache_compare` with `ruleId` — compare results across databases

## Tool Input Conventions

- **LSP tools** use **0-based** line and column positions for input. Output uses 1-based `startLine`/`endLine`.
- **`find_predicate_position`** and **`find_class_position`** return **1-based** positions.
- **`workspace_uri`** for LSP tools must be a **plain directory path** to the pack root containing `codeql-pack.yml`, not a `file://` URI.

## Related Resources

- `codeql://server/overview` — MCP server orientation guide
- `codeql://server/prompts` — Complete prompt reference
- `codeql://learning/query-basics` — Query writing reference
- `codeql://patterns/performance` — Performance profiling guide
