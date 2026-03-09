# CodeQL JavaScript Security Query Implementation Guide

This document provides specific, actionable instructions for implementing JavaScript security queries in CodeQL, focusing on common vulnerability patterns like XSS, SSRF, SQL Injection, and other security issues.

## Core Concepts for LLM Understanding

### Required Imports and Dependencies

**For Security Query Implementation (.ql/.qll files):**

```ql
// Standard security query imports - USE THESE FOR ALL SECURITY QUERIES
import javascript
import semmle.javascript.dataflow.DataFlow
import semmle.javascript.dataflow.TaintTracking
import semmle.javascript.security.dataflow.RemoteFlowSources
import semmle.javascript.security.dataflow.UntrustedFlowSources

// Optional: Include path graph support for path-problem queries
// import DataFlow::PathGraph
```

**For Framework-Specific Queries:**

```ql
// Framework-specific imports as needed
import semmle.javascript.frameworks.Express
import semmle.javascript.frameworks.React
import semmle.javascript.frameworks.jQuery
import semmle.javascript.NodeJS
```

## Essential Security Patterns for JavaScript

### 1. Remote Flow Sources (User Input)

**Common patterns for detecting user-controlled input:**

```ql
// Express.js request parameters
class ExpressRequestSource extends RemoteFlowSource::Range {
  ExpressRequestSource() {
    this = any(Express::RequestInputAccess ria).getARootSource()
  }

  override string getSourceType() { result = "Express request parameter" }
}

// Generic request object patterns
class RequestInputSource extends RemoteFlowSource::Range {
  RequestInputSource() {
    exists(DataFlow::PropRead pr |
      pr = this.asSource() and
      pr.getBase().asExpr().(VarAccess).getName() = "req" and
      pr.getPropertyName() in ["query", "params", "body", "headers"]
    )
  }

  override string getSourceType() { result = "HTTP request input" }
}
```

### 2. HTTP Client Request Sinks (SSRF)

**Patterns for detecting outgoing HTTP requests:**

```ql
// Axios HTTP requests
class AxiosRequestSink extends DataFlow::Node {
  AxiosRequestSink() {
    exists(DataFlow::CallNode call |
      call = DataFlow::moduleImport("axios").getAMemberCall(["get", "post", "put", "delete", "request"]) and
      this = call.getArgument(0)
    )
  }
}

// Node.js native HTTP requests
class NodeHttpRequestSink extends DataFlow::Node {
  NodeHttpRequestSink() {
    exists(DataFlow::CallNode call |
      call = DataFlow::moduleImport(["http", "https"]).getAMemberCall(["request", "get"]) and
      this = call.getArgument(0)
    )
  }
}

// Fetch API requests
class FetchRequestSink extends DataFlow::Node {
  FetchRequestSink() {
    exists(DataFlow::CallNode call |
      call = DataFlow::globalVarRef("fetch").getACall() and
      this = call.getArgument(0)
    )
  }
}
```

### 3. DOM Manipulation Sinks (XSS)

**Patterns for detecting DOM manipulation that can lead to XSS:**

```ql
// innerHTML and similar dangerous DOM properties
class DOMManipulationSink extends DataFlow::Node {
  DOMManipulationSink() {
    exists(DataFlow::PropWrite pw |
      pw.getPropertyName() in ["innerHTML", "outerHTML"] and
      this = pw.getRhs()
    )
  }
}

// Document write methods
class DocumentWriteSink extends DataFlow::Node {
  DocumentWriteSink() {
    exists(DataFlow::CallNode call |
      call = DataFlow::globalVarRef("document").getAMemberCall(["write", "writeln"]) and
      this = call.getAnArgument()
    )
  }
}
```

### 4. SQL Query Sinks (SQL Injection)

**Patterns for detecting SQL query construction:**

```ql
// Generic database query patterns
class SqlQuerySink extends DataFlow::Node {
  SqlQuerySink() {
    exists(DataFlow::CallNode call |
      call.getCalleeName() in ["query", "execute", "prepare", "run"] and
      this = call.getArgument(0)
    )
  }
}

// String concatenation patterns (common SQL injection vector)
class SqlConcatenationSink extends DataFlow::Node {
  SqlConcatenationSink() {
    exists(DataFlow::CallNode call |
      call.getCalleeName() in ["query", "execute"] and
      this = call.getArgument(0) and
      this.asExpr() instanceof AddExpr
    )
  }
}
```

## Security Query Implementation Guide

### Query Structure: Three-Part Pattern

**ALL security queries follow this exact pattern:**

1. **Source Definition** - Define what constitutes user input
2. **Sink Definition** - Define what constitutes dangerous operations
3. **Flow Configuration** - Define how data flows from sources to sinks

### STEP 1: Create Customizations Module

```ql
/**
 * Provides sources, sinks and sanitizers for detecting [VULNERABILITY_NAME] vulnerabilities.
 */
module VulnerabilityName {
  /** A data flow source for [VULNERABILITY_NAME] vulnerabilities */
  abstract class Source extends DataFlow::Node { }

  /** A data flow sink for [VULNERABILITY_NAME] vulnerabilities */
  abstract class Sink extends DataFlow::Node { }

  /** A sanitizer for [VULNERABILITY_NAME] vulnerabilities */
  abstract class Sanitizer extends DataFlow::Node { }

  // Use existing remote flow sources (PREFERRED)
  private class RemoteFlowSourceAsSource extends Source instanceof RemoteFlowSource { }

  // Define specific sinks based on vulnerability type
  private class SpecificSinkAsSink extends Sink {
    SpecificSinkAsSink() {
      // Define sink patterns here
    }
  }
}
```

### STEP 2: Create Query Configuration Module

```ql
/**
 * Provides a taint-tracking configuration for detecting [VULNERABILITY_NAME] vulnerabilities.
 */
import javascript
import semmle.javascript.dataflow.DataFlow
import semmle.javascript.dataflow.TaintTracking
import VulnerabilityNameCustomizations::VulnerabilityName

module VulnerabilityNameConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) { source instanceof Source }
  predicate isSink(DataFlow::Node sink) { sink instanceof Sink }
  predicate isBarrier(DataFlow::Node node) { node instanceof Sanitizer }

  // Add additional flow steps if needed
  predicate isAdditionalFlowStep(DataFlow::Node node1, DataFlow::Node node2) {
    // Custom flow steps for framework-specific patterns
    none()
  }
}

module VulnerabilityNameFlow = TaintTracking::Global<VulnerabilityNameConfig>;
```

### STEP 3: Create Final Query

```ql
/**
 * @name [Human-readable vulnerability name]
 * @description [Description of the vulnerability and its impact]
 * @kind path-problem
 * @problem.severity [error|warning|recommendation]
 * @security-severity [0.0-10.0]
 * @precision [low|medium|high|very-high]
 * @id [language]/[cwe-category]/[specific-id]
 * @tags security
 *       external/cwe/cwe-[number]
 */

import javascript
import VulnerabilityNameQuery
import DataFlow::PathGraph

from VulnerabilityNameFlow::PathNode source, VulnerabilityNameFlow::PathNode sink
where VulnerabilityNameFlow::flowPath(source, sink)
select sink.getNode(), source, sink, "[Alert message with $@ placeholder]",
  source.getNode(), "[source description]"
```

## Common Security Concepts and Implementation Patterns

### Most Important Security Concepts to Model

1. **RemoteFlowSource** - User-controlled input from HTTP requests
2. **XssSink** - DOM manipulation that can lead to script execution
3. **SqlQuerySink** - Database query execution points
4. **HttpRequestSink** - Outgoing HTTP requests (SSRF)
5. **CommandExecution** - OS command execution
6. **FileSystemAccess** - File read/write operations
7. **PathTraversal** - File path manipulation
8. **CodeInjection** - Dynamic code execution

### Common Sink Patterns by Vulnerability Type

| Vulnerability     | Primary Sinks                                   | Secondary Sinks                    |
| ----------------- | ----------------------------------------------- | ---------------------------------- |
| XSS               | `DOMManipulationSink`, `document.write`         | Template rendering, HTML responses |
| SSRF              | `axios.get()`, `fetch()`, `http.request()`      | URL construction                   |
| SQL Injection     | `db.query()`, `connection.execute()`            | String concatenation patterns      |
| Command Injection | `child_process.exec()`, `eval()`                | Template literal execution         |
| Path Traversal    | `fs.readFile()`, `fs.writeFile()`               | Path construction                  |
| Code Injection    | `eval()`, `Function()`, `vm.runInThisContext()` | Dynamic imports                    |

### Critical Implementation Examples

**SSRF Detection Pattern:**

```ql
module RequestForgeryConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) {
    source instanceof RemoteFlowSource
  }

  predicate isSink(DataFlow::Node sink) {
    // HTTP client requests where URL is controllable
    exists(DataFlow::CallNode call |
      call = DataFlow::moduleImport("axios").getAMemberCall(["get", "post", "put", "delete"]) and
      sink = call.getArgument(0)
    ) or
    exists(DataFlow::CallNode call |
      call = DataFlow::globalVarRef("fetch").getACall() and
      sink = call.getArgument(0)
    ) or
    exists(DataFlow::CallNode call |
      call = DataFlow::moduleImport(["http", "https"]).getAMemberCall(["request", "get"]) and
      sink = call.getArgument(0)
    )
  }
}

module RequestForgeryFlow = TaintTracking::Global<RequestForgeryConfig>;
```

**XSS Detection Pattern:**

```ql
module ReflectedXssConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) {
    source instanceof RemoteFlowSource
  }

  predicate isSink(DataFlow::Node sink) {
    // DOM manipulation sinks
    exists(DataFlow::PropWrite pw |
      pw.getPropertyName() in ["innerHTML", "outerHTML"] and
      sink = pw.getRhs()
    ) or
    // Document write methods
    exists(DataFlow::CallNode call |
      call = DataFlow::globalVarRef("document").getAMemberCall(["write", "writeln"]) and
      sink = call.getAnArgument()
    )
  }
}

module ReflectedXssFlow = TaintTracking::Global<ReflectedXssConfig>;
```

## Testing Patterns

### Test Case Structure for Security Queries

```javascript
// NON_COMPLIANT: [Vulnerability description]
app.get('/vulnerable', (req, res) => {
  const userInput = req.query.param; // Source: user input
  vulnerableFunction(userInput); // Sink: dangerous operation
});

// COMPLIANT: [Safe alternative description]
app.get('/safe', (req, res) => {
  const userInput = req.query.param;
  const sanitized = sanitizeInput(userInput); // Sanitizer
  safeFunction(sanitized); // Safe: input sanitized
});
```

### Expected Results Format

```
| file.js:line:col:line:col | Alert message with $@ | file.js:source_line:source_col:source_line:source_col | source description |
```

## Performance Considerations

- **Use specific call patterns**: Prefer `DataFlow::CallNode` over generic `CallExpr`
- **Leverage framework libraries**: Use Express, React modules for better precision
- **Consider async patterns**: JavaScript's async nature requires careful data flow analysis
- **Handle dynamic property access**: Account for bracket notation and computed properties
- **Framework method chaining**: Track fluent API calls through multiple steps

## CLI References

- [qlt query generate new-query](../../../resources/cli/qlt/qlt_query_generate_new-query.prompt.md)
- [codeql query format](../../../resources/cli/codeql/codeql_query_format.prompt.md)
- [codeql query compile](../../../resources/cli/codeql/codeql_query_compile.prompt.md)
- [codeql query run](../../../resources/cli/codeql/codeql_query_run.prompt.md)
- [codeql test run](../../../resources/cli/codeql/codeql_test_run.prompt.md)
