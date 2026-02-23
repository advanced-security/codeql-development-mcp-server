# Call Graph From for Java

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

The following Java code demonstrates outbound calls from `sourceMethod`:

```java
void helper1() {}
void helper2() { helper1(); }

void sourceMethod() {  // Source method for analysis
    helper1();
    helper2();
}
```

Running with `sourceFunction = "sourceMethod"` produces results showing each call site with the message pattern `Call from 'sourceMethod' to 'helper1'`.

## Output Format

The query is a `@kind problem` query producing rows of:

- `select call, "Call from 'source' to 'callee'"`

## References

- [Java Methods](https://docs.oracle.com/javase/tutorial/java/javaOO/methods.html)
- [CodeQL Call Graph Analysis](https://codeql.github.com/docs/writing-codeql-queries/about-data-flow-analysis/)
