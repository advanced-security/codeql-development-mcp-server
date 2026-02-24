# Print AST for JavaScript

Outputs a representation of the Abstract Syntax Tree (AST) for specified source files.

## Overview

The Abstract Syntax Tree is a hierarchical representation of source code structure. Each node represents a syntactic construct (declaration, statement, expression, etc.) and edges represent parent-child containment relationships.

This query produces the full AST for specified JavaScript source files, which is useful for understanding code structure, inspecting how the CodeQL extractor parses functions and expressions, and debugging query logic that operates on AST nodes.

## Use Cases

This query is primarily used for:

- Inspecting how CodeQL represents JavaScript functions, classes, and expressions
- Debugging queries that match on AST node types
- Understanding parent-child relationships between modules, declarations, and statements
- Verifying extractor behavior for arrow functions, destructuring, and async/await
- IDE integration for syntax tree visualization

## Example

The following JavaScript code demonstrates AST structure through function and class declarations:

```javascript
class Example {
  constructor(name = 'World') {
    // Constructor in AST
    this.name = name;
  }

  greet() {
    // Method declaration in AST
    console.log(`Hello, ${this.name}!`);
  }
}

const e = new Example();
e.greet();
```

In the resulting AST:

- The class declaration contains method definitions as children
- Each method body contains a block with statement nodes
- Call expressions and template literals reference their components as child nodes

## Output Format

The query produces a graph via the `PrintAstConfiguration` library:

- `nodes`: Each AST node with its type, label, and properties
- `edges`: Parent-child relationships forming the syntax tree

## References

- [JavaScript Language Reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference)
- [CodeQL Abstract Syntax Trees](https://codeql.github.com/docs/writing-codeql-queries/abstract-syntax-tree/)
