# Print CFG for Rust

Produces a representation of a file's Control Flow Graph (CFG) for specified source files.

## Overview

The Control Flow Graph models the runtime execution order of statements and expressions within functions. Nodes represent individual executable elements and edges represent possible transitions between them, including branches, loops, and exceptional control flow.

This query produces the CFG for specified Rust source files, which is useful for understanding execution paths, identifying dead code, and debugging data flow queries that depend on control flow ordering.

## Use Cases

This query is primarily used for:

- Visualizing execution paths through Rust functions
- Understanding how `if`, `match`, `loop`, `while`, and `for` affect control flow
- Debugging data flow queries that depend on CFG structure
- Identifying unreachable code or unexpected control flow edges
- Verifying CFG behavior for Rust-specific constructs like pattern matching

## Example

The following Rust code demonstrates control flow through branching and loops:

```rust
fn example(x: i32) -> i32 {
    if x > 0 {
        return x;
    }

    let mut val = x;
    while val < 10 {
        val += 1;
    }
    val
}
```

In the resulting CFG:

- The `if` condition creates a branch with two successors
- The early `return` creates an edge to the function exit
- The `while` loop creates a back-edge from the loop body to the condition

## Output Format

The query produces a graph with:

- `nodes`: Each CFG node with a `semmle.label` property
- `edges`: Control flow transitions between nodes

## References

- [The Rust Reference - Expressions](https://doc.rust-lang.org/reference/expressions.html)
- [CodeQL Control Flow Analysis](https://codeql.github.com/docs/writing-codeql-queries/about-data-flow-analysis/)
- [CodeQL Library for Rust](https://codeql.github.com/docs/codeql-language-guides/codeql-library-for-rust/)
