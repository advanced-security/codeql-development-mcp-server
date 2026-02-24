# Print AST for C++

Outputs a representation of the Abstract Syntax Tree (AST) for specified source files.

## Overview

The Abstract Syntax Tree is a hierarchical representation of source code structure. Each node represents a syntactic construct (declaration, statement, expression, etc.) and edges represent parent-child containment relationships.

This query produces the full AST for specified C++ source files, which is useful for understanding code structure, inspecting how the CodeQL extractor parses declarations and expressions, and debugging query logic that operates on AST nodes.

## Use Cases

This query is primarily used for:

- Inspecting how CodeQL represents C++ declarations and expressions
- Debugging queries that match on AST node types
- Understanding parent-child relationships between classes, functions, and statements
- Verifying extractor behavior for templates, macros, and overloaded operators
- IDE integration for syntax tree visualization

## Example

The following C++ code demonstrates AST structure through declarations and statements:

```cpp
#include <iostream>

class Example {
public:
    void greet(const std::string& name) {  // Function declaration in AST
        std::cout << "Hello, " << name << "!" << std::endl;
    }
};

int main() {  // Top-level declaration
    Example e;
    e.greet("World");
    return 0;
}
```

In the resulting AST:

- The class declaration contains member function declarations as children
- Each function body contains a statement list
- Call expressions reference their target and arguments as child nodes

## Output Format

The query produces a graph via the `PrintAstConfiguration` library:

- `nodes`: Each AST node with its type, label, and properties
- `edges`: Parent-child relationships forming the syntax tree

## References

- [C++ Language Reference](https://en.cppreference.com/w/cpp/language)
- [CodeQL Abstract Syntax Trees](https://codeql.github.com/docs/writing-codeql-queries/abstract-syntax-tree/)
