# CallGraphTo for Ruby

Displays calls made to a specified method, showing the call graph inbound to the target method.

## Overview

This query identifies all call sites that invoke a named method, producing an inbound call graph. Given a target method name, it reports each caller and call location, which is useful for understanding how a method is used across the codebase.

The query accepts method names via an external predicate (`targetFunction`).

## Use Cases

This query is primarily used for:

- Finding all callers of a specific method
- Impact analysis before modifying a method signature
- Understanding usage patterns and entry points

## Example

The following Ruby code demonstrates inbound calls to `target_func`:

```ruby
def target_func                   # Target method for analysis
end

def caller1
    target_func
end

def caller2
    target_func
end
```

Running with `targetFunction = "target_func"` produces results showing each call site with the message pattern ``Call to `target_func` from `caller1``.

## Output Format

The query is a `@kind problem` query producing rows of:

- ``select call, "Call to `target` from `caller`"``

## References

- [Ruby Methods](https://ruby-doc.org/core/doc/syntax/methods_rdoc.html)
- [CodeQL Call Graph Analysis](https://codeql.github.com/docs/writing-codeql-queries/about-data-flow-analysis/)
