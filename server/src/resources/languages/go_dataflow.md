# Analyzing Data Flow in Go

## Purpose

Use CodeQL's Go data-flow libraries to find how values and taint propagate through Go programs. Cover local flow/taint (intra-procedural) and global flow/taint (inter-procedural), with configurable sources/sinks/barriers.

## Core Concepts

### Data Flow vs Taint Tracking

- **Data Flow**: Tracks exact value preservation through assignments, calls, and returns
- **Taint Tracking**: Tracks influence/contamination, including non-value-preserving operations like concatenation

### Node Hierarchy

- **`Node`** - Base class for data flow nodes
  - **`ExprNode`** - Expression in the AST
  - **`ParameterNode`** - Function parameter
  - **`InstructionNode`** - Intermediate representation instruction

### Node Conversion

- **AST to DataFlow**: `DataFlow::exprNode(expr)`, `DataFlow::parameterNode(param)`
- **DataFlow to AST**: `node.asExpr()`, `node.asParameter()`, `node.asInstruction()`

## Local Data Flow

### Basic Predicates

- **`localFlowStep(Node a, Node b)`** - Direct flow from `a` to `b` within same function
- **`localFlow(Node a, Node b)`** - Transitive closure (`localFlowStep*`)

### Example: Tracking to Function Arguments

```ql
import go
from Function osOpen, CallExpr call, Expr src
where osOpen.hasQualifiedName("os","Open") and
      call.getTarget() = osOpen and
      DataFlow::localFlow(DataFlow::exprNode(src), DataFlow::exprNode(call.getArgument(0)))
select src, "flows to os.Open argument"
```

### Local Flow Patterns

```ql
// Variable assignment flow
from Variable v, Expr source, Expr use
where DataFlow::localFlow(DataFlow::exprNode(source), DataFlow::exprNode(use)) and
      source = v.getAnAssignment() and
      use = v.getARead()
select source, use

// Parameter to return flow
from Function f, Parameter p, ReturnStmt ret
where DataFlow::localFlow(DataFlow::parameterNode(p), DataFlow::exprNode(ret.getAResult()))
select p, ret
```

## Local Taint Tracking

### Basic Predicates

- **`localTaintStep(Node a, Node b)`** - Direct taint from `a` to `b`
- **`localTaint(Node a, Node b)`** - Transitive taint closure

### Taint vs Flow Examples

```ql
// String concatenation - taint but not flow
from Expr source, Expr concat
where concat.(AddExpr).getAnOperand() = source and
      TaintTracking::localTaint(DataFlow::exprNode(source), DataFlow::exprNode(concat))
select source, concat

// Array element access - taint propagation
from Expr array, Expr element
where element.(IndexExpr).getBase() = array and
      TaintTracking::localTaint(DataFlow::exprNode(array), DataFlow::exprNode(element))
select array, element
```

## Global Data Flow

### Configuration Interface

Implement `DataFlow::ConfigSig`:

```ql
module MyConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) {
    // Define where flow starts
  }

  predicate isSink(DataFlow::Node sink) {
    // Define where flow ends
  }

  predicate isBarrier(DataFlow::Node node) {
    // Optional: block flow through certain nodes
  }

  predicate isAdditionalFlowStep(DataFlow::Node node1, DataFlow::Node node2) {
    // Optional: add custom flow edges
  }
}

module MyFlow = DataFlow::Global<MyConfig>;
```

### Usage Pattern

```ql
from DataFlow::Node source, DataFlow::Node sink
where MyFlow::flow(source, sink)
select source, "flows to $@", sink, "sink"
```

### Complete Example: Hard-coded Strings to URL Parse

```ql
module StringToUrlConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) {
    source.asExpr() instanceof StringLit
  }

  predicate isSink(DataFlow::Node sink) {
    exists(CallExpr call |
      call.getTarget().hasQualifiedName("net/url", "Parse") and
      sink.asExpr() = call.getArgument(0)
    )
  }
}

module StringToUrlFlow = DataFlow::Global<StringToUrlConfig>;

from DataFlow::Node source, DataFlow::Node sink
where StringToUrlFlow::flow(source, sink)
select source, "String literal flows to URL parse $@", sink, "here"
```

## Global Taint Tracking

### Configuration Interface

Same as data flow but with taint semantics:

```ql
module MyTaintConfig implements TaintTracking::ConfigSig {
  predicate isSource(DataFlow::Node source) {
    source instanceof RemoteFlowSource  // Built-in remote sources
  }

  predicate isSink(DataFlow::Node sink) {
    exists(CallExpr call |
      call.getTarget().hasQualifiedName("os/exec", "Command") and
      sink.asExpr() = call.getAnArgument()
    )
  }
}

module MyTaintFlow = TaintTracking::Global<MyTaintConfig>;
```

### Built-in Sources

```ql
// RemoteFlowSource covers common user input sources
class MyRemoteSource extends RemoteFlowSource {
  MyRemoteSource() {
    // Additional remote sources beyond built-ins
  }
}
```

## Advanced Flow Configuration

### Custom Flow Steps

```ql
predicate isAdditionalFlowStep(DataFlow::Node node1, DataFlow::Node node2) {
  // Custom builder pattern
  exists(CallExpr call |
    call.getTarget().getName() = "WithValue" and
    node1.asExpr() = call.getReceiver() and
    node2.asExpr() = call
  )
  or
  // Flow through slice append
  exists(CallExpr append |
    append.getTarget().getName() = "append" and
    node1.asExpr() = append.getAnArgument() and
    node2.asExpr() = append
  )
}
```

### Barriers and Sanitizers

```ql
predicate isBarrier(DataFlow::Node node) {
  // Block flow through validation functions
  exists(CallExpr call |
    call.getTarget().getName().matches("%Validate%") and
    node.asExpr() = call
  )
  or
  // Block at error checks
  exists(IfStmt guard, NeqExpr check |
    check.getRightOperand().(Ident).getName() = "nil" and
    guard.getCondition() = check and
    node.asExpr().getParent*() = guard.getThen()
  )
}
```

## Common Data Flow Patterns

### Environment Variables to Sinks

```ql
class GetenvSource extends DataFlow::Node {
  GetenvSource() {
    exists(CallExpr call |
      call.getTarget().hasQualifiedName("os", "Getenv") and
      this.asExpr() = call
    )
  }
}

module EnvToSinkConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) { source instanceof GetenvSource }
  predicate isSink(DataFlow::Node sink) { /* define sinks */ }
}
```

### Command Line Arguments

```ql
class CommandLineArgSource extends DataFlow::Node {
  CommandLineArgSource() {
    exists(IndexExpr access |
      access.getBase().(Ident).getName() = "Args" and
      access.getBase().getType().toString() = "[]string" and
      this.asExpr() = access
    )
  }
}
```

### HTTP Request Data

```ql
class HttpRequestSource extends DataFlow::Node {
  HttpRequestSource() {
    exists(CallExpr call, SelectorExpr sel |
      sel.getBase().getType().toString().matches("%Request%") and
      sel.getSelector().getName() in ["FormValue", "PostFormValue", "Header"] and
      call.getCallee() = sel and
      this.asExpr() = call
    )
  }
}
```

### Database Queries

```ql
predicate isDatabaseQuerySink(DataFlow::Node sink) {
  exists(CallExpr call, Function target |
    call.getTarget() = target and
    target.hasQualifiedName("database/sql", ["Query", "QueryRow", "Exec", "Prepare"]) and
    sink.asExpr() = call.getArgument(0)
  )
}
```

## Path Queries for Better Results

### Basic Path Query Structure

```ql
/**
 * @kind path-problem
 */
import go
import DataFlow::PathGraph

// ... config definition ...

from MyFlow::PathNode source, MyFlow::PathNode sink
where MyFlow::flowPath(source, sink)
select sink.getNode(), source, sink,
       "Value from $@ reaches sink", source.getNode(), "source"
```

### Multi-step Flow Analysis

```ql
// First: literal to getenv parameter
module LiteralToGetenvConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) { source.asExpr() instanceof StringLit }
  predicate isSink(DataFlow::Node sink) {
    exists(CallExpr call |
      call.getTarget().hasQualifiedName("os", "Getenv") and
      sink.asExpr() = call.getArgument(0)
    )
  }
}

// Second: getenv result to url.Parse
module GetenvToUrlConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) {
    exists(CallExpr call |
      call.getTarget().hasQualifiedName("os", "Getenv") and
      source.asExpr() = call
    )
  }
  predicate isSink(DataFlow::Node sink) {
    exists(CallExpr call |
      call.getTarget().hasQualifiedName("net/url", "Parse") and
      sink.asExpr() = call.getArgument(0)
    )
  }
}
```

## Performance and Precision Tips

### Query Optimization

- Start with local flow/taint for better performance
- Use specific predicates rather than broad matching
- Prefer `hasQualifiedName` over string patterns
- Add barriers to reduce false paths

### Debugging Flow

```ql
// Debug: show intermediate flow steps
from DataFlow::Node n1, DataFlow::Node n2
where DataFlow::localFlowStep(n1, n2) and
      n1.getFile().getBaseName() = "target.go"
select n1, n2
```

### Testing Configurations

```ql
// Test source identification
from DataFlow::Node source
where MyConfig::isSource(source)
select source

// Test sink identification
from DataFlow::Node sink
where MyConfig::isSink(sink)
select sink
```

## Integration with Security Queries

### Combining Multiple Configurations

```ql
// Union of different taint sources
predicate isAnyTaintSource(DataFlow::Node source) {
  source instanceof RemoteFlowSource or
  source instanceof GetenvSource or
  source instanceof CommandLineArgSource
}

// Combined configuration
module UnifiedTaintConfig implements TaintTracking::ConfigSig {
  predicate isSource(DataFlow::Node source) { isAnyTaintSource(source) }
  predicate isSink(DataFlow::Node sink) { /* any dangerous sink */ }
}
```

### Framework-specific Flow

```ql
// Framework method chaining
predicate isFrameworkFlowStep(DataFlow::Node node1, DataFlow::Node node2) {
  exists(CallExpr call |
    call.getReceiver() = node1.asExpr() and
    call.getTarget().getName().regexpMatch("With|Set|Add") and
    node2.asExpr() = call
  )
}
```

This provides the foundation for building sophisticated security queries that can track how untrusted data flows through Go programs to reach dangerous operations.
