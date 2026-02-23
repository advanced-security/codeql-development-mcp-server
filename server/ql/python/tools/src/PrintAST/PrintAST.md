# Print AST for Python

Outputs a representation of the Abstract Syntax Tree (AST) for specified source files.

## Overview

The Abstract Syntax Tree is a hierarchical representation of source code structure. Each node represents a syntactic construct (declaration, statement, expression, etc.) and edges represent parent-child containment relationships.

This query produces the full AST for specified Python source files, which is useful for understanding code structure, inspecting how the CodeQL extractor parses classes and functions, and debugging query logic that operates on AST nodes.

## Use Cases

This query is primarily used for:

- Inspecting how CodeQL represents Python classes, functions, and expressions
- Debugging queries that match on AST node types
- Understanding parent-child relationships between modules, classes, and statements
- Verifying extractor behavior for decorators, comprehensions, and f-strings
- IDE integration for syntax tree visualization

## Example

The following Python code demonstrates AST structure through class and function declarations:

```python
class Example:
    def __init__(self, name="World"):  # Method definition in AST
        self.name = name

    def greet(self):  # Method definition in AST
        print(f"Hello, {self.name}!")

example = Example()
example.greet()
```

In the resulting AST:

- The class definition contains function definitions as children
- Each function body contains a statement list
- Call expressions and f-strings reference their components as child nodes

## Output Format

The query produces a graph via the `PrintAstConfiguration` library:

- `nodes`: Each AST node with its type, label, and properties
- `edges`: Parent-child relationships forming the syntax tree

## References

- [Python Language Reference](https://docs.python.org/3/reference/)
- [CodeQL Abstract Syntax Trees](https://codeql.github.com/docs/writing-codeql-queries/abstract-syntax-tree/)
