# Print AST for GitHub Actions

Outputs a representation of the Abstract Syntax Tree (AST) for GitHub Actions workflows, composite actions, and `actions.lock` files.

## Overview

The Abstract Syntax Tree is a hierarchical representation of source code structure. Each node represents a syntactic construct (job, step, expression, etc.) and edges represent parent-child containment relationships.

This query produces the full AST for specified GitHub Actions YAML files, which is useful for understanding workflow structure, inspecting how the CodeQL extractor parses action definitions, and debugging query logic that operates on AST nodes.

## Actions Lockfiles

Invoke `codeql_query_run` with `queryName: "PrintAST"`, `queryLanguage: "actions"`, and `sourceFiles: ".github/workflows/actions.lock"`. Comma-separated selections can include workflows alongside the lockfile.

The tree shows an `ActionsLock` root, YAML keys and values, and complete dependency references and commit digests. It displays recorded data without validating pins.

Normal Actions database creation extracts the lockfile. Query tests need `semmle-extractor-options: --file-type YAML .github/workflows/actions.lock` in their `options` file, as in the `ActionsLock` fixture.

## Use Cases

This query is primarily used for:

- Inspecting how CodeQL represents workflow structure
- Debugging queries that match on AST node types
- Understanding parent-child relationships between jobs, steps, and expressions
- Verifying extractor behavior for composite actions and reusable workflows
- IDE integration for syntax tree visualization

## Example

The following GitHub Actions workflow demonstrates AST structure through jobs and steps:

```yaml
name: Example Workflow
on: [push]
jobs:
  build: # Job node in AST
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2 # Step node in AST
      - name: Build
        run: make build # Run step with expression
```

In the resulting AST:

- The workflow root contains job definitions as children
- Each job contains step nodes
- `uses` and `run` steps produce distinct AST node types

## Output Format

The query produces a graph using `PrintAstConfiguration` for Actions syntax and the upstream YAML model for lockfiles:

- `nodes`: Each AST node with its type, label, and properties
- `edges`: Parent-child relationships forming the syntax tree

## References

- [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [CodeQL Abstract Syntax Trees](https://codeql.github.com/docs/writing-codeql-queries/abstract-syntax-tree/)
