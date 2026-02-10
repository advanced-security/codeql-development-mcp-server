# Print CFG for `csharp` Source Files

Produces a representation of a file's Control Flow Graph (CFG) for specified source files.

## Overview

The Control Flow Graph represents the order in which statements and expressions are executed in a program. Each node in the graph represents a control-flow element (statement or expression), and edges represent possible execution paths between them.

This query outputs all CFG nodes and their successor relationships for C# code, which is useful for understanding program execution flow, debugging control flow issues, and analyzing code paths.

## Use Cases

This query is primarily used for:

- Visualizing program execution flow
- Understanding complex branching logic
- Debugging control flow issues
- Analysis of code paths and reachability
- IDE integration for control flow visualization

## Example

The following C# code demonstrates control flow through conditional statements and loops:

```csharp
public void Example(int x) {
    if (x > 0) {                     // COMPLIANT - Branching creates CFG edges
        Console.WriteLine("Positive");
    } else {
        Console.WriteLine("Non-positive");
    }

    for (int i = 0; i < 3; i++) {    // COMPLIANT - Loop creates cyclic CFG
        Console.WriteLine(i);
    }
}
```

In the resulting CFG:

- The `if` condition creates two outgoing edges (true/false branches)
- The `for` loop creates a cycle back to the condition check
- Each statement connects to its successor in execution order

## Output Format

The query produces two relations:

- `nodes(ControlFlow::Node, string, string)`: Each CFG node with its label
- `edges(ControlFlow::Node, ControlFlow::Node)`: Successor relationships between nodes

## References

- [C# Control Flow](https://learn.microsoft.com/en-us/dotnet/csharp/language-reference/statements/selection-statements)
- [CodeQL Control Flow Graph](https://codeql.github.com/docs/writing-codeql-queries/about-control-flow-in-codeql/)
