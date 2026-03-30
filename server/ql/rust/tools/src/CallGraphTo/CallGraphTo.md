# CallGraphTo for Rust

Displays calls made to a specified function, showing the call graph inbound to the target function.

## Overview

This query identifies all call sites that invoke a named function, producing an inbound call graph. Given a target function name, it reports each call site and the enclosing caller, which is useful for understanding how a function is used throughout the codebase.

The query accepts function names via an external predicate (`targetFunction`).

## Use Cases

This query is primarily used for:

- Finding all callers of a specific function
- Understanding how a function is used across modules
- Impact analysis when modifying or deprecating a function

## Example

The following Rust code demonstrates inbound calls to `target_func`:

```rust
fn target_func() {}  // Target function for analysis

fn caller1() {
    target_func();
}

fn caller2() {
    target_func();
}
```

Running with `targetFunction = "target_func"` produces results showing each call site with the message pattern ``Call to `target_func`from`caller1```.

## Output Format

The query is a `@kind problem` query producing rows of:

- ``select call, "Call to `callee` from `caller`"``

## References

- [Rust Functions](https://doc.rust-lang.org/book/ch03-03-how-functions-work.html)
- [CodeQL Call Graph Analysis](https://codeql.github.com/docs/writing-codeql-queries/about-data-flow-analysis/)
- [CodeQL Library for Rust](https://codeql.github.com/docs/codeql-language-guides/codeql-library-for-rust/)
