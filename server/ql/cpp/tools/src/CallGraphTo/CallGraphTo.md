# CallGraphTo for C++

Displays calls made to a specified function, showing the call graph inbound to the target function.

## Overview

This query identifies all call sites that invoke a named function, producing an inbound call graph. Given a target function name, it reports each caller and call location, which is useful for understanding how a function is used across the codebase.

The query accepts function names via an external predicate (`targetFunction`) and supports both simple and qualified name matching.

## Use Cases

This query is primarily used for:

- Finding all callers of a specific function
- Impact analysis before modifying a function signature
- Understanding usage patterns and entry points
- IDE integration for call hierarchy navigation

## Example

The following C++ code demonstrates inbound calls to `targetFunc`:

```cpp
void targetFunc() {}              // Target function for analysis

void caller1() { targetFunc(); }
void caller2() { targetFunc(); }
```

Running with `targetFunction = "targetFunc"` produces results showing each call site with the message pattern `Call to 'targetFunc' from 'caller1'`.

## Output Format

The query is a `@kind problem` query producing rows of:

- `select call, "Call to 'target' from 'caller'"`

## References

- [C++ Functions](https://en.cppreference.com/w/cpp/language/functions)
- [CodeQL Call Graph Analysis](https://codeql.github.com/docs/writing-codeql-queries/about-data-flow-analysis/)
