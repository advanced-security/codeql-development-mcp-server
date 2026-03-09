# JavaScript Security Query Guide

Language-specific notes for writing JavaScript/TypeScript security queries in CodeQL. For the general taint-tracking template and workflow, see the `security_templates` resource.

## Imports

```ql
import javascript
```

The `javascript` top-level import re-exports data flow, taint tracking, and framework models. For path-problem queries add `import MyFlow::PathGraph` after defining your flow module.

## Sources and Sinks

- **Sources**: Use `RemoteFlowSource` (covers Express, Koa, Hapi, Fastify, and other HTTP frameworks automatically).
- **Sinks**: Use or extend existing sink classes from `semmle.javascript.security.dataflow.*` (e.g., `DomBasedXss`, `SqlInjection`, `ServerSideUrlRedirect`), or model custom sinks as `DataFlow::Node` subclasses.
- **Sanitizers**: Extend `Sanitizer` classes in the relevant `semmle.javascript.security.dataflow.*` module.

## Key Library Modules

| Module                                     | Purpose                                  |
| ------------------------------------------ | ---------------------------------------- |
| `semmle.javascript.dataflow.DataFlow`      | Data flow nodes and global analysis      |
| `semmle.javascript.dataflow.TaintTracking` | Taint tracking analysis                  |
| `semmle.javascript.security.dataflow.*`    | Pre-built vulnerability-specific configs |
| `semmle.javascript.frameworks.*`           | Framework-specific API models            |
