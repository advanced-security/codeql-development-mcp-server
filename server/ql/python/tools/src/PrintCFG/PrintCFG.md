# Print CFG for Python

Produces a representation of a file's Control Flow Graph (CFG) for specified source files.

## Overview

The Control Flow Graph represents the order in which statements and expressions are executed in a program. Each node in the graph represents a control-flow element (statement or expression), and edges represent possible execution paths between them.

This query outputs all CFG nodes and their successor relationships for Python code, which is useful for understanding program execution flow, debugging control flow issues, and analyzing code paths.

## Use Cases

This query is primarily used for:

- Visualizing program execution flow
- Understanding complex branching logic
- Debugging control flow issues
- Analysis of code paths and reachability
- IDE integration for control flow visualization

## Example

The following Python code demonstrates control flow through conditional statements and loops:

```python
def example(x):
    if x > 0:                      # COMPLIANT - Branching creates CFG edges
        print("Positive")
    else:
        print("Non-positive")

    for i in range(3):             # COMPLIANT - Loop creates cyclic CFG
        print(i)
```

In the resulting CFG:

- The `if` condition creates two outgoing edges (true/false branches)
- The `for` loop creates a cycle back to the iterator
- Each statement connects to its successor in execution order

## Output Format

The query produces two relations:

- `nodes(ControlFlowNode, string, string)`: Each CFG node with its label
- `edges(ControlFlowNode, ControlFlowNode)`: Successor relationships between nodes

## References

- [Python Control Flow](https://docs.python.org/3/tutorial/controlflow.html)
- [CodeQL Control Flow Graph](https://codeql.github.com/docs/writing-codeql-queries/about-control-flow-in-codeql/)
