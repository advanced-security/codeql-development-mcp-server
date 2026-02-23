# Call Graph To for Java

Displays calls made to a specified method, showing the call graph inbound to the target method.

## Overview

This query identifies all call sites that invoke a named method, producing an inbound call graph. Given a target method name, it reports each caller and call location, which is useful for understanding how a method is used across the codebase.

The query accepts method names via an external predicate (`targetFunction`).

## Use Cases

This query is primarily used for:

- Finding all callers of a specific method
- Impact analysis before modifying a method signature
- Understanding usage patterns and entry points
- IDE integration for call hierarchy navigation

## Example

The following Java code demonstrates inbound calls to `targetMethod`:

```java
void targetMethod() {}            // Target method for analysis

void caller1() { targetMethod(); }
void caller2() { targetMethod(); }
```

Running with `targetFunction = "targetMethod"` produces results showing each call site with the message pattern `Call to 'targetMethod' from 'caller1'`.

## Output Format

The query is a `@kind problem` query producing rows of:

- `select call, "Call to 'target' from 'caller'"`

## References

- [Java Methods](https://docs.oracle.com/javase/tutorial/java/javaOO/methods.html)
- [CodeQL Call Graph Analysis](https://codeql.github.com/docs/writing-codeql-queries/about-data-flow-analysis/)
