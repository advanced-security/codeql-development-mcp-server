# CodeQL Development MCP Server — Getting Started

This resource is the primary onboarding guide for LLM clients connecting to the CodeQL Development MCP Server. It explains what the server provides, which tools and prompts are available, and how to orchestrate common workflows.

## What This Server Does

The CodeQL Development MCP Server wraps the CodeQL CLI and supporting utilities behind the Model Context Protocol (MCP). It exposes **tools** (executable actions), **prompts** (reusable workflow templates), and **resources** (reference material) that enable an LLM to develop, test, and analyze CodeQL queries without direct shell access.

## Available Resources

Read these resources via `resources/read` to deepen your understanding:

| URI                                           | Purpose                                             |
| --------------------------------------------- | --------------------------------------------------- |
| `codeql://server/overview`                    | This guide — MCP server orientation                 |
| `codeql://server/queries`                     | Bundled tools queries (PrintAST, PrintCFG, etc.)    |
| `codeql://server/tools`                       | Complete default tool reference                     |
| `codeql://server/prompts`                     | Complete prompt reference                           |
| `codeql://learning/query-basics`              | QL query writing reference (syntax, metadata, etc.) |
| `codeql://learning/test-driven-development`   | TDD theory and workflow for CodeQL                  |
| `codeql://templates/security`                 | Security query templates (multi-language)           |
| `codeql://patterns/performance`               | Performance profiling and optimization              |
| `codeql://guides/query-unit-testing`          | Guide for creating and running CodeQL query tests   |
| `codeql://guides/dataflow-migration-v1-to-v2` | Migrating from v1 to v2 dataflow API                |
| `codeql://languages/{language}/ast`           | Language-specific AST class reference               |
| `codeql://languages/{language}/security`      | Language-specific security patterns                 |

## Quick-Start Workflows

### 1. Create a New Query (TDD Approach)

Use the `test_driven_development` prompt (or `ql_tdd_basic` / `ql_tdd_advanced`):

1. `create_codeql_query` — scaffold query, test files, and `.qlref`
2. `codeql_pack_install` — install pack dependencies
3. Write test code with positive and negative cases
4. `codeql_test_run` — run tests (expect failure initially)
5. Implement query logic
6. `codeql_query_compile` — validate syntax
7. `codeql_test_run` — iterate until tests pass
8. `codeql_test_accept` — accept correct results as baseline

### 2. Understand Code Structure

Use the `tools_query_workflow` prompt:

1. `codeql_query_run` with `queryName="PrintAST"` — visualize the AST
2. `codeql_query_run` with `queryName="PrintCFG"` — visualize control flow
3. `codeql_query_run` with `queryName="CallGraphFrom"` / `"CallGraphTo"` — trace call relationships

### 3. Analyze Query Quality

1. `codeql_database_analyze` — run queries against a database
2. `profile_codeql_query` or `profile_codeql_query_from_logs` — analyze performance
3. `run_query_and_summarize_false_positives` prompt — assess precision
4. `sarif_rank_false_positives` / `sarif_rank_true_positives` prompts — rank results

### 4. Iterative Development with LSP

Use the `ql_lsp_iterative_development` prompt:

1. `codeql_lsp_completion` — get code completions while writing QL
2. `codeql_lsp_definition` — navigate to symbol definitions
3. `codeql_lsp_references` — find all references to a symbol
4. `codeql_lsp_diagnostics` — real-time syntax and semantic validation

## Tool Categories

The server provides default tools across these categories (see `codeql://server/tools` for the full reference):

- **CodeQL CLI tools** — Database creation, query compilation, execution, result decoding, pack management
- **LSP tools** — Code completion, go-to-definition, find references, diagnostics
- **Query development tools** — Scaffolding, validation, profiling, quick evaluation, database registration

## Prompt Categories

The server provides **11 prompts** (see `codeql://server/prompts` for the full reference):

- **Test-driven development** — `test_driven_development`, `ql_tdd_basic`, `ql_tdd_advanced`
- **Code understanding** — `tools_query_workflow`, `explain_codeql_query`
- **Iterative development** — `ql_lsp_iterative_development`
- **Documentation and quality** — `document_codeql_query`, `run_query_and_summarize_false_positives`, `sarif_rank_false_positives`, `sarif_rank_true_positives`
- **Workshop creation** — `workshop_creation_workflow`

## Key Concepts

- **CodeQL database**: A relational representation of source code created by `codeql_database_create`. All queries execute against a database.
- **QL pack**: A directory containing `codeql-pack.yml` with query or library code. Use `codeql_pack_install` to resolve dependencies.
- **`.qlref` file**: A test reference that points from a test directory to the query being tested.
- **`.expected` file**: The expected output of a query test. Use `codeql_test_accept` to update it when results are correct.
- **BQRS**: Binary Query Result Sets — the native output format of `codeql_query_run`. Decode with `codeql_bqrs_decode` or interpret with `codeql_bqrs_interpret`.
- **SARIF**: Static Analysis Results Interchange Format — the standard output format for `codeql_database_analyze`.

## Supported Languages

The server supports CodeQL queries for: `actions`, `cpp`, `csharp`, `go`, `java`, `javascript`, `python`, `ruby`, `swift`.
