# Print CFG for JavaScript

Produces a representation of a file's Control Flow Graph (CFG) for specified source files.

## Overview

The Control Flow Graph represents the order in which statements and expressions are executed in a program. Each node in the graph represents a control-flow element (statement or expression), and edges represent possible execution paths between them.

This query outputs all CFG nodes and their successor relationships for JavaScript code, which is useful for understanding program execution flow, debugging control flow issues, and analyzing code paths.

## Use Cases

This query is primarily used for:

- Visualizing program execution flow
- Understanding complex branching logic
- Debugging control flow issues
- Analysis of code paths and reachability
- IDE integration for control flow visualization

## Example

The following JavaScript code demonstrates control flow through conditional statements and loops:

```javascript
function example(x) {
  if (x > 0) {
    // Branching creates CFG edges
    console.log('Positive');
  } else {
    console.log('Non-positive');
  }

  for (let i = 0; i < 3; i++) {
    // Loop creates cyclic CFG
    console.log(i);
  }
}
```

In the resulting CFG:

- The `if` condition creates two outgoing edges (true/false branches)
- The `for` loop creates a cycle back to the condition check
- Each statement connects to its successor in execution order

## Output Format

The query produces two relations:

- `nodes(ControlFlowNode, string, string)`: Each CFG node with its label
- `edges(ControlFlowNode, ControlFlowNode)`: Successor relationships between nodes

## References

- [JavaScript Control Flow](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Control_flow_and_error_handling)
- [CodeQL Control Flow Graph](https://codeql.github.com/docs/writing-codeql-queries/about-control-flow-in-codeql/)
