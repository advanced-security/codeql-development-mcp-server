# C++ Security Query Guide

Language-specific notes for writing C++ security queries in CodeQL. For the general taint-tracking template and workflow, see the `security_templates` resource.

## Imports

```ql
import cpp
import semmle.code.cpp.dataflow.new.DataFlow
import semmle.code.cpp.dataflow.new.TaintTracking
```

For path-problem queries add `import MyFlow::PathGraph` after defining your flow module.

## Sources and Sinks

- **Sources**: Use the `RemoteFlowSource` class from `semmle.code.cpp.security.FlowSources`, or model custom sources as `DataFlow::Node` subclasses.
- **Sinks**: Model as `DataFlow::Node` subclasses matching the dangerous API (e.g., buffer writes, system calls, SQL execution).
- **Barriers**: Use `semmle.code.cpp.controlflow.Guards` to model guard conditions that sanitize tainted data.

## Key Library Modules

| Module                                       | Purpose                               |
| -------------------------------------------- | ------------------------------------- |
| `semmle.code.cpp.dataflow.new.DataFlow`      | Data flow nodes and global analysis   |
| `semmle.code.cpp.dataflow.new.TaintTracking` | Taint tracking analysis               |
| `semmle.code.cpp.controlflow.Guards`         | Guard-condition analysis for barriers |
| `semmle.code.cpp.security.BufferWrite`       | Buffer-write sink modeling            |
| `semmle.code.cpp.security.FlowSources`       | Remote and local flow sources         |
