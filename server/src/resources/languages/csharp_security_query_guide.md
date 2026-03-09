# C# Security Query Guide

Language-specific notes for writing C# security queries in CodeQL. For the general taint-tracking template and workflow, see the `security_templates` resource.

## Imports

```ql
import csharp
import semmle.code.csharp.dataflow.DataFlow
import semmle.code.csharp.dataflow.TaintTracking
```

For path-problem queries add `import MyFlow::PathGraph` after defining your flow module.

## Sources and Sinks

- **Sources**: Use `RemoteFlowSource` from `semmle.code.csharp.security.dataflow.flowsources.Remote`, or model custom sources as `DataFlow::Node` subclasses.
- **Sinks**: Use or extend existing sink libraries under `semmle.code.csharp.security.dataflow` (e.g., `SqlInjectionQuery`, `flowsinks.Html`, `UrlRedirectQuery`), or model custom sinks as `DataFlow::Node` subclasses.
- **Sanitizers**: Use `semmle.code.csharp.security.Sanitizers` for common encoding and validation barriers.

## Key Library Modules

| Module                                      | Purpose                                  |
| ------------------------------------------- | ---------------------------------------- |
| `semmle.code.csharp.dataflow.DataFlow`      | Data flow nodes and global analysis      |
| `semmle.code.csharp.dataflow.TaintTracking` | Taint tracking analysis                  |
| `semmle.code.csharp.security.Sanitizers`    | Common sanitizer predicates              |
| `semmle.code.csharp.security.dataflow.*`    | Pre-built vulnerability-specific configs |
| `semmle.code.csharp.frameworks.system.*`    | .NET framework API models                |
