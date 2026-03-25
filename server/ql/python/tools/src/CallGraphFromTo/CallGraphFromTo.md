# CallGraphFromTo for Python

Displays calls on reachable paths from a source function to a target function, showing transitive call graph connectivity.

## Overview

This query identifies all function calls that lie on any transitive call path from a specified source function to a specified target function. Given both a source and target function name, it reports each call site along the connecting paths, which is useful for understanding indirect call chains, security-relevant data flow paths, and function reachability.

The query uses transitive closure (`calls*`) to determine reachability, then reports only the direct call sites that contribute to paths between the source and target. It accepts function names via external predicates (`sourceFunction` and `targetFunction`).

## Use Cases

This query is primarily used for:

- Determining if a call path exists between two functions
- Mapping indirect call chains from a source to a target function
- Analyzing security-relevant paths (e.g., from user input handlers to sensitive operations)
- Understanding transitive dependencies between functions

## Example

The following Python code demonstrates a transitive call chain from `source` through `intermediate` to `target`:

```python
def target():
    pass

def intermediate():
    target()

def source():
    intermediate()
```

Running with `sourceFunction = "source"` and `targetFunction = "target"` produces results showing each call site on the path with the message pattern ``Reachable call from `source`to`intermediate```.

## Output Format

The query is a `@kind problem` query producing rows of:

- ``select call, "Reachable call from `caller` to `callee`"``

## References

- [Python Functions](https://docs.python.org/3/tutorial/controlflow.html#defining-functions)
- [CodeQL Call Graph Analysis](https://codeql.github.com/docs/writing-codeql-queries/about-data-flow-analysis/)
