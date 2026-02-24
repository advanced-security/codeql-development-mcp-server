# CallGraphTo for Python

Displays calls made to a specified function, showing the call graph inbound to the target function.

## Overview

This query identifies all call sites that invoke a named function, producing an inbound call graph. Given a target function name, it reports each caller and call location, which is useful for understanding how a function is used across the codebase.

The query accepts function names via an external predicate (`targetFunction`).

## Use Cases

This query is primarily used for:

- Finding all callers of a specific function
- Impact analysis before modifying a function signature
- Understanding usage patterns and entry points

## Example

The following Python code demonstrates inbound calls to `target_func`:

```python
def target_func():                # Target function for analysis
    pass

def caller1():
    target_func()

def caller2():
    target_func()
```

Running with `targetFunction = "target_func"` produces results showing each call site with the message pattern ``Call to `target_func` from `caller1``.

## Output Format

The query is a `@kind problem` query producing rows of:

- ``select call, "Call to `target` from `caller`"``

## References

- [Python Functions](https://docs.python.org/3/tutorial/controlflow.html#defining-functions)
- [CodeQL Call Graph Analysis](https://codeql.github.com/docs/writing-codeql-queries/about-data-flow-analysis/)
