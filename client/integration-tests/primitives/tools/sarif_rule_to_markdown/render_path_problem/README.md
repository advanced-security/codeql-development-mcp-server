# Integration Test: sarif_rule_to_markdown - render_path_problem

## Purpose

Validates that the `sarif_rule_to_markdown` tool converts SARIF path-problem
results into a structured markdown report containing Mermaid dataflow diagrams.

## Inputs

- `test-input.sarif`: A multi-rule SARIF file with 2 path-problem results for
  `js/sql-injection` (each with codeFlows/threadFlows/locations).

## Expected Behavior

The tool returns a markdown document containing:

- Rule summary header with ID, name, severity, precision, and tags
- Query help markdown (from `rule.help.markdown`)
- Results table with file, line, and message for each result
- Mermaid `flowchart LR` diagrams for each dataflow path
- Source nodes styled green (`fill:#d4edda`) and sink nodes red (`fill:#f8d7da`)
