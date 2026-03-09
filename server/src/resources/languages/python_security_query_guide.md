# Python Security Query Guide

Language-specific notes for writing Python security queries in CodeQL. For the general taint-tracking template and workflow, see the `security_templates` resource.

## Imports

```ql
import python
import semmle.python.dataflow.new.DataFlow
import semmle.python.dataflow.new.TaintTracking
import semmle.python.Concepts
import semmle.python.ApiGraphs
```

For path-problem queries add `import MyFlow::PathGraph` after defining your flow module.

## Sources and Sinks

- **Sources**: Use `RemoteFlowSource` from `semmle.python.dataflow.new.RemoteFlowSources` (covers Flask, Django, FastAPI, and other HTTP frameworks).
- **Sinks**: Use the `Concepts` module (e.g., `SqlExecution`, `SystemCommandExecution`, `FileSystemAccess`) or model custom sinks as `DataFlow::Node` subclasses.
- **Barriers**: Use `semmle.python.dataflow.new.BarrierGuards` for common sanitizer patterns.

## ApiGraph Navigation (Framework Modeling)

Use `API::moduleImport("pkg")` to get a reference to an imported module, then chain `.getMember()`, `.getACall()`, `.getReturn()`, `.getParameter()`, and `.getASubclass()` to navigate the API surface. Convert to data flow nodes via `.asSource()` / `.asSink()`.

## Key Library Modules

| Module                                         | Purpose                                     |
| ---------------------------------------------- | ------------------------------------------- |
| `semmle.python.dataflow.new.DataFlow`          | Data flow nodes and global analysis         |
| `semmle.python.dataflow.new.TaintTracking`     | Taint tracking analysis                     |
| `semmle.python.Concepts`                       | Abstract security concepts (sinks)          |
| `semmle.python.ApiGraphs`                      | API-graph navigation for framework modeling |
| `semmle.python.dataflow.new.RemoteFlowSources` | Remote flow source definitions              |
