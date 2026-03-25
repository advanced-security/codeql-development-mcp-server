# CallGraphFromTo for C# Source Files

Displays calls on reachable paths from a source method to a target method, showing transitive call graph connectivity.

## Overview

This query identifies all method calls that lie on any transitive call path from a specified source method to a specified target method. Given both a source and target method name, it reports each call site along the connecting paths, which is useful for understanding indirect call chains, security-relevant data flow paths, and method reachability.

The query uses transitive closure (`calls*`) to determine reachability, then reports only the direct call sites that contribute to paths between the source and target. It accepts method names via external predicates (`sourceFunction` and `targetFunction`).

## Use Cases

This query is primarily used for:

- Determining if a call path exists between two methods
- Mapping indirect call chains from a source to a target method
- Analyzing security-relevant paths (e.g., from user input handlers to sensitive operations)
- Understanding transitive dependencies between methods

## Example

The following C# code demonstrates a transitive call chain from `Source` through `Intermediate` to `Target`:

```csharp
class Example {
    void Target() {}

    void Intermediate() {
        Target();
    }

    void Source() {
        Intermediate();
    }
}
```

Running with `sourceFunction = "Source"` and `targetFunction = "Target"` produces results showing each call site on the path with a message like: "Reachable call from `Source` to `Intermediate`".

## Output Format

The query is a `@kind problem` query producing rows of:

- ``select call, "Reachable call from `caller` to `callee`"``

## References

- [C# Methods](https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/methods)
- [CodeQL Call Graph Analysis](https://codeql.github.com/docs/writing-codeql-queries/about-data-flow-analysis/)
