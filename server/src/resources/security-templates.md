# Security Query Templates

This resource provides actionable security query templates for multiple languages and vulnerability classes. Each template shows the recommended query structure, explains how to adapt it, and references the MCP tools and TDD workflow to use during development.

## General Workflow for Security Queries

1. **Scaffold**: Use `create_codeql_query` to generate the query, test, and `.qlref` files
2. **Write tests**: Create test source code with vulnerable (positive) and safe (negative) examples
3. **Analyze AST**: Use `codeql_query_run` with `queryName="PrintAST"` to understand code representation
4. **Implement**: Write the query using the taint tracking / data flow template below
5. **Compile**: Use `codeql_query_compile` to validate syntax
6. **Test**: Use `codeql_test_run` to run tests; iterate until all pass
7. **Accept**: Use `codeql_test_accept` to baseline correct results

See the `test_driven_development` or `ql_tdd_basic` prompts for guided step-by-step workflows.

## Taint Tracking Template (v2 API)

Most security queries use taint tracking to find data flowing from untrusted sources to dangerous sinks. The standard template structure for all languages is:

```ql
/**
 * @name <Vulnerability Name>
 * @description <Description of the vulnerability>
 * @kind path-problem
 * @problem.severity error
 * @security-severity <CVSS score>
 * @precision high
 * @id <lang>/<vulnerability-id>
 * @tags security
 *       external/cwe/cwe-<NNN>
 */

import <language>

module MyFlowConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) {
    // Define untrusted input sources
  }

  predicate isSink(DataFlow::Node sink) {
    // Define dangerous sinks
  }

  predicate isBarrier(DataFlow::Node node) {
    // Define sanitizers that make data safe (optional)
  }
}

module MyFlow = TaintTracking::Global<MyFlowConfig>;

import MyFlow::PathGraph

from MyFlow::PathNode source, MyFlow::PathNode sink
where MyFlow::flowPath(source, sink)
select sink.getNode(), source, sink, "Tainted data from $@ reaches this sink.",
  source.getNode(), "user-provided value"
```

### Adapting the Template

1. **Choose sources**: Identify where untrusted data enters (HTTP parameters, file reads, environment variables)
2. **Choose sinks**: Identify where data becomes dangerous (SQL queries, command execution, HTML output)
3. **Add sanitizers**: Identify validation or encoding functions that neutralize the threat
4. **Adjust metadata**: Set appropriate `@security-severity`, `@id`, and CWE tags

## Source, Sink, and Sanitizer Patterns

### Defining Sources

Sources represent entry points for untrusted data. The most common pattern uses `RemoteFlowSource`:

```ql
predicate isSource(DataFlow::Node source) {
  source instanceof RemoteFlowSource
}
```

### Defining Sinks

Sinks are locations where untrusted data causes harm. Identify the dangerous API call and pin the taint to the relevant argument position:

```ql
predicate isSink(DataFlow::Node sink) {
  exists(CallExpr dangerousCall |
    dangerousCall.getTarget().hasName("vulnerableFunction") and
    sink.asExpr() = dangerousCall.getArgument(0)
  )
}
```

### Defining Sanitizers (Barriers)

Sanitizers stop taint propagation when data is validated or encoded. Return `true` for nodes where the taint is neutralized:

```ql
predicate isBarrier(DataFlow::Node node) {
  exists(CallExpr validationCall |
    validationCall.getTarget().hasName("sanitize") and
    node.asExpr() = validationCall
  )
}
```

## Language-Specific Guidance

Each language has pre-built security libraries in the CodeQL standard library. Import these instead of writing source/sink definitions from scratch when possible.

### Go

- **SQL Injection**: Import `semmle.go.security.SqlInjection` — provides `SqlInjection::Flow` module with pre-defined sources and sinks. Tag with CWE-089, severity 8.8.
- **Command Injection**: Import `semmle.go.security.CommandInjection`.
- See `codeql://languages/go/security` for Go-specific framework modeling.

### JavaScript / TypeScript

- **DOM-based XSS**: Import `semmle.javascript.security.dataflow.DomBasedXss` — provides `DomBasedXss::Flow` module. Tag with CWE-079, severity 6.1.
- **SQL Injection**: Import `semmle.javascript.security.dataflow.SqlInjection`.
- See `codeql://languages/javascript/security` for JavaScript-specific patterns.

### Python

- **Command Injection**: Import `semmle.python.security.dataflow.CommandInjection`. Tag with CWE-078, severity 9.8.
- **SQL Injection**: Import `semmle.python.security.dataflow.SqlInjection`.
- See `codeql://languages/python/security` for Python-specific patterns.

### Java / Kotlin

- **SQL Injection**: Import `semmle.java.security.SqlInjectionQuery` — provides `SqlInjectionFlow` module. Tag with CWE-089, severity 8.8.
- **SSRF**: Import `semmle.java.security.RequestForgery`.

### C# (.NET)

- **Path Traversal**: Import `semmle.csharp.security.dataflow.PathInjection`. Tag with CWE-022, severity 7.5.
- **SQL Injection**: Import `semmle.csharp.security.dataflow.SqlInjection`.
- See `codeql://languages/csharp/security` for C#-specific patterns.

### C / C++

- **Buffer Overflow**: Import `semmle.code.cpp.security.BufferAccess`. Tag with CWE-120, severity 9.8.
- See `codeql://languages/cpp/security` for C/C++-specific patterns.

## Vulnerability Classes Reference

| Vulnerability     | CWE     | Typical Sources                    | Typical Sinks                 |
| ----------------- | ------- | ---------------------------------- | ----------------------------- |
| SQL Injection     | CWE-089 | HTTP parameters, form data         | Database query functions      |
| XSS               | CWE-079 | HTTP parameters, URL data          | HTML output, DOM writes       |
| Command Injection | CWE-078 | HTTP parameters, config files      | `exec`, `system`, `popen`     |
| Path Traversal    | CWE-022 | HTTP parameters, file names        | File system access functions  |
| SSRF              | CWE-918 | HTTP parameters, user URLs         | HTTP client request functions |
| Code Injection    | CWE-094 | HTTP parameters, deserialized data | `eval`, template engines      |
| LDAP Injection    | CWE-090 | HTTP parameters                    | LDAP query functions          |
| XML Injection     | CWE-091 | HTTP parameters                    | XML parsers, XPath queries    |

## Related Resources

- `codeql://server/queries` — Query structure and metadata reference
- `codeql://learning/test-driven-development` — TDD workflow for developing queries
- `codeql://patterns/performance` — Performance optimization guidance
- `codeql://languages/{language}/security` — Language-specific security patterns and framework modeling
