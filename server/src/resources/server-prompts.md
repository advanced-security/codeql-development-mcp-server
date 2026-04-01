# MCP Server Prompts

This resource provides a complete reference of the prompts exposed by the CodeQL Development MCP Server. Prompts are reusable workflow templates that guide the LLM through common CodeQL development tasks. Invoke a prompt via the MCP `prompts/get` protocol.

## Prompt Reference

| Prompt                                    | Description                                                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `compare_overlapping_alerts`              | Analyze two CodeQL rules within SARIF data to detect overlapping alerts and classify overlap types            |
| `document_codeql_query`                   | Create or update standardized markdown documentation for a CodeQL query                                       |
| `explain_codeql_query`                    | Generate a detailed explanation of a CodeQL query with Mermaid evaluation diagrams                            |
| `ql_lsp_iterative_development`            | Iterative CodeQL query development using LSP tools for completion, navigation, and validation                 |
| `ql_tdd_advanced`                         | Advanced test-driven CodeQL development with AST visualization, control flow, and call graph analysis         |
| `ql_tdd_basic`                            | Test-driven CodeQL query development checklist — write tests first, implement query, iterate until tests pass |
| `run_query_and_summarize_false_positives` | Run a CodeQL query and summarize its false positives by root cause                                            |
| `sarif_rank_false_positives`              | Analyze SARIF results to identify and rank likely false positives                                             |
| `sarif_rank_true_positives`               | Analyze SARIF results to identify and rank likely true positives                                              |
| `test_driven_development`                 | End-to-end test-driven development workflow for CodeQL queries using MCP tools                                |
| `tools_query_workflow`                    | Guide for using PrintAST, PrintCFG, CallGraphFrom, and CallGraphTo tool queries to understand code structure  |
| `workshop_creation_workflow`              | Guide for creating multi-exercise CodeQL query development workshops from production-grade queries            |

## Prompt Categories

### Test-Driven Development

- **`test_driven_development`** — The primary TDD prompt. Requires a `language` parameter and optionally accepts `queryName`. Loads the `ql-tdd-basic.prompt.md` template and walks through the complete TDD cycle: scaffold → write tests → implement → compile → test → iterate.
- **`ql_tdd_basic`** — A standalone TDD checklist. All parameters are optional. Covers the core loop: write test cases, implement the query, run tests, iterate.
- **`ql_tdd_advanced`** — Extends basic TDD with AST visualization (`PrintAST`), control flow graph analysis (`PrintCFG`), and call graph exploration (`CallGraphFrom`, `CallGraphTo`). Optionally accepts a `database` path for immediate analysis.

### Code Understanding

- **`tools_query_workflow`** — Orchestrates the four built-in tool queries (PrintAST, PrintCFG, CallGraphFrom, CallGraphTo) to explore how source code is represented in a CodeQL database. Requires `language` and `database` parameters.
- **`explain_codeql_query`** — Produces a verbal explanation of a query's logic and generates Mermaid diagrams showing the evaluation flow. Requires `queryPath` and `language`.

### Iterative Development

- **`ql_lsp_iterative_development`** — Combines LSP-based code completions (`codeql_lsp_completion`), go-to-definition (`codeql_lsp_definition`), find-references (`codeql_lsp_references`), and diagnostics (`codeql_lsp_diagnostics`) for an interactive development loop.

### Documentation and Quality

- **`document_codeql_query`** — Generates standardized markdown documentation as a sibling `.md` file to a query. Requires `queryPath` and `language`.
- **`run_query_and_summarize_false_positives`** — Runs a CodeQL query on a database and groups results into false-positive categories by root cause.
- **`sarif_rank_false_positives`** / **`sarif_rank_true_positives`** — Analyze SARIF output to assess query precision by ranking results as likely true or false positives.

### Alert Analysis and Comparison

- **`compare_overlapping_alerts`** — Analyzes two CodeQL rules within the same SARIF data to identify overlapping alerts. Classifies each overlap as redundant, complementary, or false overlap. Uses `sarif_extract_rule`, `sarif_compare_alerts`, and `read_database_source` tools. Requires `sarifPath`, `ruleIdA`, and `ruleIdB`; optionally accepts `databasePath` for source code context.

### Workshop Creation

- **`workshop_creation_workflow`** — Guides the creation of multi-exercise workshops that teach CodeQL query development. Requires `queryPath` and `language`, optionally accepts `workshopName` and `numStages`.

## Related Resources

- `codeql://server/overview` — MCP server orientation guide
- `codeql://server/tools` — Complete tool reference
- `codeql://learning/test-driven-development` — TDD theory and workflow overview
