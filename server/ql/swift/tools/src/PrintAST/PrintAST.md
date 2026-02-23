# Print AST for Swift

Outputs a representation of the Abstract Syntax Tree (AST) for specified source files.

## Overview

The Abstract Syntax Tree is a hierarchical representation of source code structure. Each node represents a syntactic construct (declaration, statement, expression, etc.) and edges represent parent-child containment relationships.

This query produces the full AST for specified Swift source files, which is useful for understanding code structure, inspecting how the CodeQL extractor parses types and functions, and debugging query logic that operates on AST nodes.

## Use Cases

This query is primarily used for:

- Inspecting how CodeQL represents Swift structs, classes, and functions
- Debugging queries that match on AST node types
- Understanding parent-child relationships between declarations and expressions
- Verifying extractor behavior for closures, optionals, and protocol conformances
- IDE integration for syntax tree visualization

## Example

The following Swift code demonstrates AST structure through struct and function declarations:

```swift
struct Example {
    let name: String

    func greet() {  // Function declaration in AST
        print("Hello, \(name)!")
    }
}

let e = Example(name: "World")  // Initializer call in AST
e.greet()
```

In the resulting AST:

- The struct declaration contains property and function declarations as children
- Each function body contains a brace statement with expression nodes
- Call expressions and string interpolations reference their components as child nodes

## Output Format

The query produces a graph via the `PrintAstConfiguration` library:

- `nodes`: Each AST node with its type, label, and properties
- `edges`: Parent-child relationships forming the syntax tree

## References

- [Swift Language Guide](https://docs.swift.org/swift-book/)
- [CodeQL Abstract Syntax Trees](https://codeql.github.com/docs/writing-codeql-queries/abstract-syntax-tree/)
