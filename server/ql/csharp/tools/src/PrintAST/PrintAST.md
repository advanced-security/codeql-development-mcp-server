# Print AST for `csharp` Source Files

Outputs a representation of the Abstract Syntax Tree (AST) for specified source files.

## Overview

The Abstract Syntax Tree is a hierarchical representation of source code structure. Each node represents a syntactic construct (declaration, statement, expression, etc.) and edges represent parent-child containment relationships.

This query produces the full AST for specified C# source files, which is useful for understanding code structure, inspecting how the CodeQL extractor parses classes and methods, and debugging query logic that operates on AST nodes.

## Use Cases

This query is primarily used for:

- Inspecting how CodeQL represents C# classes, methods, and expressions
- Debugging queries that match on AST node types
- Understanding parent-child relationships between namespaces, types, and members
- Verifying extractor behavior for generics, LINQ, and async/await patterns
- IDE integration for syntax tree visualization

## Example

The following C# code demonstrates AST structure through class and method declarations:

```csharp
using System;

public class Example {
    public void Greet(string name) {  // Method declaration in AST
        Console.WriteLine($"Hello, {name}!");
    }

    public static void Main(string[] args) {  // Entry point declaration
        var e = new Example();
        e.Greet("World");
    }
}
```

In the resulting AST:

- The class declaration contains method declarations as children
- Each method body contains a block with statement nodes
- Call expressions reference their target and arguments as child nodes

## Output Format

The query produces a graph via the `PrintAstConfiguration` library:

- `nodes`: Each AST node with its type, label, and properties
- `edges`: Parent-child relationships forming the syntax tree

## References

- [C# Language Reference](https://learn.microsoft.com/en-us/dotnet/csharp/)
- [CodeQL Abstract Syntax Trees](https://codeql.github.com/docs/writing-codeql-queries/abstract-syntax-tree/)
