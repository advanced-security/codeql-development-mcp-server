# Print AST for Rust

Outputs a representation of the Abstract Syntax Tree (AST) for specified source files.

## Overview

The Abstract Syntax Tree is a hierarchical representation of source code structure. Each node represents a syntactic construct (declaration, statement, expression, etc.) and edges represent parent-child containment relationships.

This query produces the full AST for specified Rust source files, which is useful for understanding code structure, inspecting how the CodeQL extractor parses modules and functions, and debugging query logic that operates on AST nodes.

## Use Cases

This query is primarily used for:

- Inspecting how CodeQL represents Rust functions, structs, and expressions
- Debugging queries that match on AST node types
- Understanding parent-child relationships between items and statements
- Verifying extractor behavior for ownership, borrowing, and pattern matching
- IDE integration for syntax tree visualization

## Example

The following Rust code demonstrates AST structure through function declarations and control flow:

```rust
struct Greeter {
    name: String,
}

impl Greeter {
    fn greet(&self) {
        println!("Hello, {}!", self.name);
    }
}

fn main() {
    let g = Greeter { name: "World".to_string() };
    g.greet();
}
```

In the resulting AST:

- The module contains struct and function declarations as children
- Each function body contains a block expression with statement nodes
- Call expressions reference their target and arguments as child nodes

## Output Format

The query produces a graph via the parameterized `PrintAst` library module:

- `nodes`: Each AST node with its type, label, and properties
- `edges`: Parent-child relationships forming the syntax tree

## References

- [The Rust Reference](https://doc.rust-lang.org/reference/)
- [CodeQL Abstract Syntax Trees](https://codeql.github.com/docs/writing-codeql-queries/abstract-syntax-tree/)
- [CodeQL Library for Rust](https://codeql.github.com/docs/codeql-language-guides/codeql-library-for-rust/)
