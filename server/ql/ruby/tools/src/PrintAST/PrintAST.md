# Print AST for Ruby

Outputs a representation of the Abstract Syntax Tree (AST) for specified source files.

## Overview

The Abstract Syntax Tree is a hierarchical representation of source code structure. Each node represents a syntactic construct (declaration, statement, expression, etc.) and edges represent parent-child containment relationships.

This query produces the full AST for specified Ruby source files, which is useful for understanding code structure, inspecting how the CodeQL extractor parses classes and methods, and debugging query logic that operates on AST nodes.

## Use Cases

This query is primarily used for:

- Inspecting how CodeQL represents Ruby classes, methods, and expressions
- Debugging queries that match on AST node types
- Understanding parent-child relationships between modules, classes, and methods
- Verifying extractor behavior for blocks, procs, and metaprogramming constructs
- IDE integration for syntax tree visualization

## Example

The following Ruby code demonstrates AST structure through class and method definitions:

```ruby
class Example
    def initialize(name = "World")  # Method definition in AST
        @name = name
    end

    def greet  # Method definition in AST
        puts "Hello, #{@name}!"
    end
end

e = Example.new
e.greet
```

In the resulting AST:

- The class definition contains method definitions as children
- Each method body contains a statement list
- Method calls and string interpolations reference their components as child nodes

## Output Format

The query produces a graph via the `PrintAstConfiguration` library:

- `nodes`: Each AST node with its type, label, and properties
- `edges`: Parent-child relationships forming the syntax tree

## References

- [Ruby Language Documentation](https://ruby-doc.org/core/)
- [CodeQL Abstract Syntax Trees](https://codeql.github.com/docs/writing-codeql-queries/abstract-syntax-tree/)
