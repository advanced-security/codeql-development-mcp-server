# CallGraphFromTo for Rust

Displays calls on reachable paths from a source function to a target function, showing transitive call graph connectivity.

## Overview

This query identifies all call sites on paths that transitively connect a source function to a target function. It uses the `calls*` transitive closure to find functions reachable from the source that can also reach the target, then reports calls within those functions.

The query accepts both source and target function names via external predicates (`sourceFunction` and `targetFunction`).

## Use Cases

This query is primarily used for:

- Understanding transitive call chains between two functions
- Analyzing reachability in the call graph
- Identifying intermediate functions on critical paths
- Security analysis of data flow through function boundaries

## Example

The following Rust code demonstrates a transitive call chain:

```rust
fn target() {}

fn intermediate() {
    target();
}

fn source() {
    intermediate();
}
```

Running with `sourceFunction = "source"` and `targetFunction = "target"` produces results showing each call site on the path with the message pattern ``Reachable call from `intermediate` to `target` ``.

## Output Format

The query is a `@kind problem` query producing rows of:

- ``select call, "Reachable call from `caller` to `callee`"``

## References

- [Rust Functions](https://doc.rust-lang.org/book/ch03-03-how-functions-work.html)
- [CodeQL Call Graph Analysis](https://codeql.github.com/docs/writing-codeql-queries/about-data-flow-analysis/)
- [CodeQL Library for Rust](https://codeql.github.com/docs/codeql-language-guides/codeql-library-for-rust/)
