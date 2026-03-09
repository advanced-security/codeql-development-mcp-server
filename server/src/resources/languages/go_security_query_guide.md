# Go Security Query Guide

Language-specific notes for writing Go security queries in CodeQL. For the general taint-tracking template and workflow, see the `security_templates` resource.

## Imports

```ql
import go
```

The `go` top-level import re-exports data flow, taint tracking, and standard library models. For path-problem queries add `import MyFlow::PathGraph` after defining your flow module.

## Sources and Sinks

- **Sources**: Use `RemoteFlowSource` (covers `net/http` handlers, gRPC, and other HTTP frameworks). Also consider `UntrustedFlowSource` for broader input coverage.
- **Sinks**: Model as `DataFlow::Node` subclasses matching dangerous APIs (e.g., `os/exec`, `database/sql`, `html/template`). Existing sink libraries live under `semmle.go.security.*`.
- **Barriers**: Model sanitizers as `DataFlow::Node` subclasses and reference them in `isBarrier`.

## Key Library Modules

| Module                             | Purpose                                  |
| ---------------------------------- | ---------------------------------------- |
| `semmle.go.dataflow.DataFlow`      | Data flow nodes and global analysis      |
| `semmle.go.dataflow.TaintTracking` | Taint tracking analysis                  |
| `semmle.go.security.*`             | Pre-built vulnerability-specific configs |
| `semmle.go.frameworks.*`           | Framework-specific API models            |
