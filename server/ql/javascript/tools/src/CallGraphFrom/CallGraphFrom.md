# Call Graph From for JavaScript

Displays calls made from a specified function, showing the call graph outbound from the source function.

## Overview

This query identifies all function calls made within the body of a named function, producing an outbound call graph. Given a source function name, it reports each call site and the callee, which is useful for understanding function dependencies and call chains.

The query accepts function names via an external predicate (`sourceFunction`).

## Use Cases

This query is primarily used for:

- Mapping outbound dependencies of a specific function
- Understanding what a function calls and in what order
- Analyzing call chains for refactoring or security review
- IDE integration for call hierarchy navigation

## Example

The following JavaScript code demonstrates outbound calls from `sourceFunc`:

```javascript
function helper1() {}
function helper2() {
  helper1();
}

function sourceFunc() {
  // Source function for analysis
  helper1();
  helper2();
}
```

Running with `sourceFunction = "sourceFunc"` produces results showing each call site with the message pattern `Call from 'sourceFunc' to 'helper1'`.

## Output Format

The query is a `@kind problem` query producing rows of:

- `select call, "Call from 'source' to 'callee'"`

## References

- [JavaScript Functions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions)
- [CodeQL Call Graph Analysis](https://codeql.github.com/docs/writing-codeql-queries/about-data-flow-analysis/)
