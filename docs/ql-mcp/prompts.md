# Prompts

> MCP prompts provided by the CodeQL Development MCP Server.

## Overview

The server provides **10 prompts** that guide AI assistants through common CodeQL development workflows. Each prompt is backed by a `*.prompt.md` file containing structured instructions.

## Prompt Reference

| Prompt                         | Description                                                                                                          |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `document_codeql_query`        | Create or update documentation for a CodeQL query                                                                    |
| `explain_codeql_query`         | Generate a detailed explanation of a CodeQL query for workshop learning content                                      |
| `ql_lsp_iterative_development` | Iterative CodeQL query development using LSP tools for completion, navigation, and validation                        |
| `ql_tdd_advanced`              | Advanced test-driven CodeQL development with AST visualization, control flow, and call graph analysis                |
| `ql_tdd_basic`                 | Test-driven CodeQL query development checklist — write tests first, implement query, iterate until tests pass        |
| `sarif_rank_false_positives`   | Analyze SARIF results to identify likely false positives in CodeQL query results                                     |
| `sarif_rank_true_positives`    | Analyze SARIF results to identify likely true positives in CodeQL query results                                      |
| `test_driven_development`      | Test-driven development workflow for CodeQL queries using MCP tools                                                  |
| `tools_query_workflow`         | Guide for using built-in tools queries (PrintAST, PrintCFG, CallGraphFrom, CallGraphTo) to understand code structure |
| `workshop_creation_workflow`   | Guide for creating CodeQL query development workshops from production-grade queries                                  |

## Prompt Categories

### Test-Driven Development

- **`ql_tdd_basic`** — Covers the core TDD loop: write test cases, implement the query, run tests, iterate.
- **`ql_tdd_advanced`** — Extends basic TDD with AST visualization, control flow graph analysis, and call graph exploration.
- **`test_driven_development`** — End-to-end TDD workflow using MCP tools for each step.

### Code Understanding

- **`tools_query_workflow`** — Uses PrintAST, PrintCFG, CallGraphFrom, and CallGraphTo tool queries to explore how source code is represented in a CodeQL database.
- **`explain_codeql_query`** — Produces verbal explanations and Mermaid evaluation diagrams for a given query.

### Iterative Development

- **`ql_lsp_iterative_development`** — Combines LSP completions, go-to-definition, and diagnostics for an interactive development loop.

### Documentation and Quality

- **`document_codeql_query`** — Generates standardized markdown documentation as a sibling file to a query.
- **`sarif_rank_false_positives`** / **`sarif_rank_true_positives`** — Help assess query precision by ranking SARIF results.

### Workshop Creation

- **`workshop_creation_workflow`** — Guides the creation of multi-exercise workshops that teach CodeQL query development.
