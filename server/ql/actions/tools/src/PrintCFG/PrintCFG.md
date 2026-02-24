# Print CFG for GitHub Actions

Produces a representation of a file's Control Flow Graph (CFG) for GitHub Actions workflows and composite actions.

## Overview

The Control Flow Graph represents the order in which steps and jobs are executed in a GitHub Actions workflow. Each node in the graph represents a control-flow element (job, step, or action component), and edges represent possible execution paths between them.

This query outputs all CFG nodes and their successor relationships for GitHub Actions YAML files, which is useful for understanding workflow execution flow and analyzing action dependencies.

## Use Cases

This query is primarily used for:

- Visualizing workflow execution flow
- Understanding job and step dependencies
- Debugging workflow execution issues
- Analysis of action execution paths
- IDE integration for workflow visualization

## Example

The following GitHub Actions workflow demonstrates control flow through jobs and steps:

```yaml
name: Example Workflow
on: [push]
jobs:
  test: # Job creates CFG node
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2 # Step creates CFG node
      - name: Run tests # Steps execute sequentially
        run: echo "Testing"
```

In the resulting CFG:

- Each job creates a CFG scope
- Steps within a job execute sequentially
- Actions and run commands create control flow nodes

## Output Format

The query produces two relations:

- `nodes(Node, string, string)`: Each CFG node with its label
- `edges(Node, Node)`: Successor relationships between nodes

## References

- [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [CodeQL Control Flow Graph](https://codeql.github.com/docs/writing-codeql-queries/about-control-flow-in-codeql/)
