# Print AST for Go

Outputs a representation of the Abstract Syntax Tree (AST) for specified source files.

## Overview

The Abstract Syntax Tree is a hierarchical representation of source code structure. Each node represents a syntactic construct (declaration, statement, expression, etc.) and edges represent parent-child containment relationships.

This query produces the full AST for specified Go source files, which is useful for understanding code structure, inspecting how the CodeQL extractor parses packages and functions, and debugging query logic that operates on AST nodes.

## Use Cases

This query is primarily used for:

- Inspecting how CodeQL represents Go packages, functions, and expressions
- Debugging queries that match on AST node types
- Understanding parent-child relationships between declarations and statements
- Verifying extractor behavior for goroutines, channels, and interfaces
- IDE integration for syntax tree visualization

## Example

The following Go code demonstrates AST structure through function declarations and control flow:

```go
package main

import "fmt"

func greet(name string) {  // Function declaration in AST
    fmt.Println("Hello, " + name + "!")
}

func main() {  // Entry point declaration
    greet("World")
}
```

In the resulting AST:

- The package declaration contains function declarations as children
- Each function body contains a block with statement nodes
- Call expressions reference their target and arguments as child nodes

## Output Format

The query produces a graph via the `PrintAstConfiguration` library:

- `nodes`: Each AST node with its type, label, and properties
- `edges`: Parent-child relationships forming the syntax tree

## References

- [Go Language Specification](https://go.dev/ref/spec)
- [CodeQL Abstract Syntax Trees](https://codeql.github.com/docs/writing-codeql-queries/abstract-syntax-tree/)
