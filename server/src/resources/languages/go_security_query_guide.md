# Go Security Query Development Guide

## Purpose

Comprehensive guide for developing security-focused CodeQL queries for Go, including data flow analysis, taint tracking, and common vulnerability patterns.

## Data Flow Analysis in Go

### Core Import

Use `import go` to bring the standard Go library (go.qll and related modules).

### Local Data Flow

**Node hierarchy**: `Node` (`ExprNode`, `ParameterNode`, `InstructionNode`)

- Map to/from AST/IR via `asExpr`/`asParameter`/`asInstruction` and `exprNode`/`parameterNode`/`instructionNode`
- `localFlowStep(a,b)`: immediate edge; `localFlow(a,b)` is transitive closure (`localFlowStep*`)

**Example**: Find expressions that flow to call argument 0 of `os.Open`:

```ql
import go
from Function osOpen, CallExpr call, Expr src
where osOpen.hasQualifiedName("os","Open") and
      call.getTarget() = osOpen and
      DataFlow::localFlow(DataFlow::exprNode(src), DataFlow::exprNode(call.getArgument(0)))
select src
```

### Local Taint Tracking

`localTaintStep` / `localTaint` analogous to DataFlow but includes non-value-preserving steps (e.g., concatenation).

**Example**: Parameter to sink taint check:

```ql
TaintTracking::localTaint(DataFlow::parameterNode(param), DataFlow::exprNode(sink))
```

### Global Data Flow

Implement `DataFlow::ConfigSig`:

- **`isSource(Node)`**: where flow originates
- **`isSink(Node)`**: where flow ends
- **`isBarrier(Node)`** [optional]: blocks flow
- **`isAdditionalFlowStep(a,b)`** [optional]: add extra edges

**Usage pattern**:

```ql
module MyConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) { /* source definition */ }
  predicate isSink(DataFlow::Node sink) { /* sink definition */ }
}

module MyFlow = DataFlow::Global<MyConfig>;

from DataFlow::Node source, DataFlow::Node sink
where MyFlow::flow(source, sink)
select source, "flows to $@", sink, "sink"
```

### Global Taint Tracking

Same signature as Global data flow; includes taint-style non-value-preserving steps. Good for security queries (untrusted → sink).

```ql
module MyTaintConfig implements TaintTracking::ConfigSig {
  predicate isSource(DataFlow::Node source) { source instanceof RemoteFlowSource }
  predicate isSink(DataFlow::Node sink) { /* dangerous sink */ }
}

module MyTaintFlow = TaintTracking::Global<MyTaintConfig>;
```

## Predefined Sources and Sinks

### Remote Flow Sources

- **`RemoteFlowSource`**: User-controllable inputs; use as source for security findings
- HTTP request parameters, form data, URL parameters
- Command line arguments via `os.Args`
- Environment variables via `os.Getenv`

### Common Source Patterns

```ql
// Environment variables
class GetenvSource extends CallExpr {
  GetenvSource() { getTarget().hasQualifiedName("os", "Getenv") }
}

// HTTP request data
class HttpRequestSource extends DataFlow::Node {
  HttpRequestSource() {
    exists(CallExpr call |
      call.getTarget().hasQualifiedName("net/http", ["FormValue", "PostFormValue"]) and
      this.asExpr() = call
    )
  }
}

// Standard input
class StdinSource extends CallExpr {
  StdinSource() {
    exists(SelectorExpr sel |
      sel.getBase().(Ident).getName() = "bufio" and
      sel.getSelector().getName() = "NewReader" and
      this.getCallee() = sel
    )
  }
}
```

## Go Security Patterns

### Command Injection

**Dangerous sinks**: `os/exec.Command()`, `os/exec.CommandContext()`

```ql
predicate isCommandExecutionSink(DataFlow::Node sink) {
  exists(CallExpr call |
    call.getTarget().hasQualifiedName("os/exec", ["Command", "CommandContext"]) and
    sink.asExpr() = call.getAnArgument()
  )
}
```

### SQL Injection

**Pattern**: Database query methods with user input

```ql
predicate isSqlQuerySink(DataFlow::Node sink) {
  exists(CallExpr call, Function target |
    call.getTarget() = target and
    (
      target.hasQualifiedName("database/sql", ["Query", "QueryRow", "Exec"]) or
      target.hasQualifiedName("github.com/jmoiron/sqlx", ["Query", "QueryRow", "Exec"])
    ) and
    sink.asExpr() = call.getArgument(0)  // SQL query string
  )
}
```

### Path Traversal

**Dangerous sinks**: `os.Open()`, `ioutil.ReadFile()` with unsanitized paths

```ql
predicate isFileSystemSink(DataFlow::Node sink) {
  exists(CallExpr call |
    call.getTarget().hasQualifiedName("os", ["Open", "OpenFile", "Create"]) and
    sink.asExpr() = call.getArgument(0)
  ) or
  exists(CallExpr call |
    call.getTarget().hasQualifiedName("io/ioutil", ["ReadFile", "WriteFile"]) and
    sink.asExpr() = call.getArgument(0)
  )
}
```

### Unsafe Reflection

**Pattern**: `reflect` package misuse

```ql
predicate isUnsafeReflectionSink(DataFlow::Node sink) {
  exists(CallExpr call |
    call.getTarget().getPackage().getPath() = "reflect" and
    call.getTarget().getName() in ["ValueOf", "TypeOf"] and
    sink.asExpr() = call.getArgument(0)
  )
}
```

### Cryptographic Issues

**Weak random number generation**:

```ql
predicate isWeakRandomSource(DataFlow::Node source) {
  exists(CallExpr call |
    call.getTarget().hasQualifiedName("math/rand", ["Int", "Intn", "Float64"]) and
    source.asExpr() = call
  )
}
```

**Deprecated crypto usage**:

```ql
predicate isDeprecatedCrypto(CallExpr call) {
  call.getTarget().hasQualifiedName("crypto/md5", "New") or
  call.getTarget().hasQualifiedName("crypto/sha1", "New")
}
```

## Go-Specific Security Considerations

### Error Handling Patterns

**Ignored errors**:

```ql
from AssignStmt assign
where assign.getRhs().(CallExpr).getType().toString().matches("%error%") and
      assign.getLhs().(Ident).getName() = "_"
select assign, "Error value ignored"
```

**Information leakage through error messages**:

```ql
predicate isErrorExposureSink(DataFlow::Node sink) {
  exists(CallExpr call |
    call.getTarget().hasQualifiedName("net/http", "Error") and
    sink.asExpr() = call.getArgument(1)  // error message
  )
}
```

### Context Usage

**Missing context propagation**:

```ql
from FuncDecl func, Parameter ctx
where ctx.getType().toString().matches("%context.Context%") and
      func.getParameter(0) = ctx and
      not exists(CallExpr call |
        call.getTarget().getName().matches("%Context%") and
        call.getArgument(0) = ctx.getARead()
      )
select func, "Context parameter not propagated"
```

### Resource Cleanup

**Missing defer statements for cleanup**:

```ql
from CallExpr open, VariableName file
where open.getTarget().hasQualifiedName("os", "Open") and
      open.getARead() = file.getARead() and
      not exists(DeferStmt defer, CallExpr close |
        close.getTarget().getName() = "Close" and
        close.getReceiver() = file.getARead() and
        defer.getExpr() = close
      )
select open, "File opened without defer close"
```

### Type Safety Issues

**Unsafe type assertions**:

```ql
from TypeAssertExpr assert
where not exists(VariableName ok |
  assert.getParent().(SimpleAssignStmt).getLhs().(TupleExpr).getElement(1) = ok.getARead()
)
select assert, "Type assertion without ok check"
```

**Nil pointer dereference**:

```ql
from StarExpr deref, VariableName ptr
where deref.getExpr() = ptr.getARead() and
      not exists(IfStmt guard, NeqExpr check |
        check.getLeftOperand() = ptr.getARead() and
        check.getRightOperand().(Ident).getName() = "nil" and
        guard.getCondition() = check
      )
select deref, "Potential nil pointer dereference"
```

### Slice and Array Safety

**Slice bounds checking**:

```ql
from IndexExpr index, VariableName slice
where index.getBase() = slice.getARead() and
      not exists(RelationalComparisonExpr bounds |
        bounds.getLeftOperand() = index.getIndex() and
        bounds.getRightOperand().(CallExpr).getTarget().getName() = "len"
      )
select index, "Unchecked slice bounds"
```

### Channel Safety

**Channel operations on nil channels**:

```ql
from SendStmt send, VariableName ch
where send.getChannel() = ch.getARead() and
      exists(SimpleAssignStmt assign |
        assign.getLhs() = ch and
        assign.getRhs().(Ident).getName() = "nil"
      )
select send, "Send on nil channel"
```

**Potential goroutine leaks**:

```ql
from GoStmt goStmt, FuncLit funcLit
where goStmt.getExpr() = funcLit and
      not exists(SelectStmt select | select.getEnclosingFunction() = funcLit)
select goStmt, "Potential goroutine leak - no termination condition"
```

## Standard Library Security Patterns

### HTTP Handlers

```ql
predicate isHttpHandler(Function func) {
  func.getParameter(0).getType().toString().matches("%ResponseWriter%") and
  func.getParameter(1).getType().toString().matches("%Request%")
}

predicate isHttpRequestSource(DataFlow::Node source) {
  exists(CallExpr call, SelectorExpr sel |
    sel.getBase().getType().toString().matches("%Request%") and
    sel.getSelector().getName() in ["FormValue", "PostFormValue", "Header", "URL"] and
    call.getCallee() = sel and
    source.asExpr() = call
  )
}
```

### JSON Operations

```ql
predicate isJsonUnmarshalSink(DataFlow::Node sink) {
  exists(CallExpr call |
    call.getTarget().hasQualifiedName("encoding/json", "Unmarshal") and
    sink.asExpr() = call.getArgument(0)  // JSON data
  )
}
```

### File Operations

```ql
predicate isFileWriteSink(DataFlow::Node sink) {
  exists(CallExpr call |
    call.getTarget().hasQualifiedName("os", "WriteFile") and
    sink.asExpr() = call.getArgument(1)  // data to write
  )
}
```

## Complete Security Query Examples

### Basic Taint Flow Query

```ql
/**
 * @name User input flows to command execution
 * @description User-controlled input flows to command execution
 * @kind path-problem
 * @id go/command-injection
 */

import go
import DataFlow::PathGraph

module Config implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) {
    source instanceof RemoteFlowSource
  }

  predicate isSink(DataFlow::Node sink) {
    exists(CallExpr call |
      call.getTarget().hasQualifiedName("os/exec", ["Command", "CommandContext"]) and
      sink.asExpr() = call.getAnArgument()
    )
  }
}

module Flow = TaintTracking::Global<Config>;

from Flow::PathNode source, Flow::PathNode sink
where Flow::flowPath(source, sink)
select sink.getNode(), source, sink, "Command execution with user input from $@",
       source.getNode(), "user input"
```

### Environment Variable to SQL Query

```ql
module EnvToSqlConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) {
    exists(CallExpr call |
      call.getTarget().hasQualifiedName("os", "Getenv") and
      source.asExpr() = call
    )
  }

  predicate isSink(DataFlow::Node sink) {
    exists(CallExpr call |
      call.getTarget().hasQualifiedName("database/sql", ["Query", "Exec"]) and
      sink.asExpr() = call.getArgument(0)
    )
  }
}

module EnvToSqlFlow = TaintTracking::Global<EnvToSqlConfig>;

from DataFlow::Node source, DataFlow::Node sink
where EnvToSqlFlow::flow(source, sink)
select sink, "SQL query built from environment variable $@", source, "here"
```

## Best Practices and Tips

### Performance and Precision

- Prefer `DataFlow`/`TaintTracking` APIs over string matching
- Use `.asExpr()` to recover expressions when defined
- Be explicit about package-qualified targets with `hasQualifiedName`
- Start with `localFlow`/`localTaint` and expand to Global only when needed

### Query Construction

- Use `select source, "... $@", sink` to show path endpoints in results
- Add path explanation with path queries for better UX
- Compose flows: define multiple configurations for different vulnerability types
- Use barriers to exclude safe patterns and reduce false positives

### Testing and Validation

- Test with known vulnerable and safe code patterns
- Validate against false positives with realistic codebases
- Use unit tests to verify individual predicates work correctly
- Consider performance implications of complex global flow queries
