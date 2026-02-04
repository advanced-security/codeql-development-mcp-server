# Print CFG for Ruby

Produces a representation of a file's Control Flow Graph (CFG) for specified source files.

## Overview

The Control Flow Graph represents the order in which statements and expressions are executed in a program. Each node in the graph represents a control-flow element (statement or expression), and edges represent possible execution paths between them.

This query outputs all CFG nodes and their successor relationships for Ruby code, which is useful for understanding program execution flow, debugging control flow issues, and analyzing code paths.

## Use Cases

This query is primarily used for:

- Visualizing program execution flow
- Understanding complex branching logic
- Debugging control flow issues
- Analysis of code paths and reachability
- IDE integration for control flow visualization

## Example

The following Ruby code demonstrates control flow through conditional statements and loops:

```ruby
def example(x)
    if x > 0                      # COMPLIANT - Branching creates CFG edges
        puts "Positive"
    else
        puts "Non-positive"
    end

    (0..2).each do |i|            # COMPLIANT - Iterator creates CFG paths
        puts i
    end
end
```

In the resulting CFG:

- The `if` condition creates two outgoing edges (true/false branches)
- The `each` iterator creates paths through the block
- Each statement connects to its successor in execution order

## Output Format

The query produces two relations:

- `nodes(CfgNode, string, string)`: Each CFG node with its label
- `edges(CfgNode, CfgNode)`: Successor relationships between nodes

## References

- [Ruby Control Structures](https://ruby-doc.org/core/doc/syntax/control_expressions_rdoc.html)
- [CodeQL Control Flow Graph](https://codeql.github.com/docs/writing-codeql-queries/about-control-flow-in-codeql/)
