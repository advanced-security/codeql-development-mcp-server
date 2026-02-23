# CallGraphFrom for `csharp` Source Files

Displays calls made from a specified method, showing the call graph outbound from the source method.

## Overview

This query identifies all method calls made within the body of a named method, producing an outbound call graph. Given a source method name, it reports each call site and the callee, which is useful for understanding method dependencies and call chains.

The query accepts method names via an external predicate (`sourceFunction`).

## Use Cases

This query is primarily used for:

- Mapping outbound dependencies of a specific method
- Understanding what a method calls and in what order
- Analyzing call chains for refactoring or security review
- IDE integration for call hierarchy navigation

## Example

The following C# code demonstrates outbound calls from `SourceMethod`:

```csharp
void Helper1() {}
void Helper2() { Helper1(); }

void SourceMethod() {  // Source method for analysis
    Helper1();
    Helper2();
}
```

Running with `sourceFunction = "SourceMethod"` produces results showing each call site with the message pattern `Call from 'SourceMethod' to 'Helper1'`.

## Output Format

The query is a `@kind problem` query producing rows of:

- `select call, "Call from 'source' to 'callee'"`

## References

- [C# Methods](https://learn.microsoft.com/en-us/dotnet/csharp/methods)
- [CodeQL Call Graph Analysis](https://codeql.github.com/docs/writing-codeql-queries/about-data-flow-analysis/)
