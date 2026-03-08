# CodeQL C# Security Query Implementation Guide

This document provides specific, actionable instructions for implementing C# security queries in CodeQL, focusing on common vulnerability patterns like SQL injection, XSS, SSRF, and encoding-related issues.

## Core Concepts for LLM Understanding

### Required Imports and Dependencies

**For Security Query Implementation (.ql/.qll files):**

```ql
// Standard security query imports - USE THESE FOR ALL C# SECURITY QUERIES
import csharp
import semmle.code.csharp.dataflow.DataFlow
import semmle.code.csharp.dataflow.TaintTracking
import semmle.code.csharp.security.dataflow.SqlInjectionQuery
import semmle.code.csharp.security.dataflow.flowsinks.Html
import semmle.code.csharp.security.dataflow.UrlRedirectQuery
import semmle.code.csharp.security.Sanitizers

// Optional: Include path graph support for path-problem queries
import DataFlow::PathGraph
```

**For Framework-Specific Queries:**

```ql
// .NET Framework-specific imports as needed
import semmle.code.csharp.frameworks.System
import semmle.code.csharp.frameworks.system.Net
import semmle.code.csharp.frameworks.system.Web
import semmle.code.csharp.frameworks.system.web.UI
import semmle.code.csharp.frameworks.system.Data
```

## Essential Security Patterns for C#

### 1. Remote Flow Sources (User Input)

**Common patterns for detecting user-controlled input:**

```ql
// ASP.NET request parameters
class AspNetRequestSource extends DataFlow::Node {
  AspNetRequestSource() {
    exists(PropertyCall pc |
      pc = this.asExpr() and
      pc.getTarget().getName() in ["QueryString", "Form", "Headers", "Cookies"] and
      pc.getQualifier().(PropertyCall).getTarget().getName() = "Request"
    )
  }
}

// Generic user input patterns
class UserControlledData extends DataFlow::Node {
  UserControlledData() {
    // HTTP request data
    exists(MethodCall mc |
      mc = this.asExpr() and
      mc.getTarget().getName() in ["GetValues", "Get"] and
      mc.getQualifier() instanceof AspNetRequestSource
    )
    or
    // Console input
    exists(MethodCall mc |
      mc = this.asExpr() and
      mc.getTarget().getDeclaringType().hasName("Console") and
      mc.getTarget().getName() in ["ReadLine", "Read"]
    )
  }
}
```

### 2. SQL Injection Sinks

**Common patterns for SQL injection vulnerability detection:**

```ql
// SQL command construction sinks
class SqlCommandSink extends DataFlow::Node {
  SqlCommandSink() {
    // SqlCommand constructor or CommandText property
    exists(ObjectCreation oc |
      oc = this.asExpr() and
      oc.getType().getName().matches("%SqlCommand%") and
      this.asExpr() = oc.getArgument(0)
    )
    or
    exists(PropertyCall pc |
      pc.getTarget().getName() = "CommandText" and
      this.asExpr() = pc.getArgument(0)
    )
    or
    // SqlDataAdapter constructor
    exists(ObjectCreation oc |
      oc = this.asExpr() and
      oc.getType().getName().matches("%SqlDataAdapter%") and
      this.asExpr() = oc.getArgument(0)
    )
  }
}
```

### 3. HTML/XSS Sinks

**Common patterns for XSS vulnerability detection:**

```ql
// HTML output sinks
class HtmlOutputSink extends DataFlow::Node {
  HtmlOutputSink() {
    // Response.Write calls
    exists(MethodCall mc |
      mc = this.asExpr().getParent*() and
      mc.getTarget().getName() in ["Write", "WriteAsync"] and
      mc.getTarget().getDeclaringType().getName().matches("%HttpResponse%") and
      this.asExpr() = mc.getArgument(0)
    )
    or
    // Label.Text assignments in Web Forms
    exists(AssignExpr ae |
      ae.getLValue().(PropertyCall).getTarget().getName() = "Text" and
      ae.getLValue().(PropertyCall).getTarget().getDeclaringType().getName().matches("%Label%") and
      this.asExpr() = ae.getRValue()
    )
    or
    // HTML element attribute assignments
    exists(MethodCall mc |
      mc.getTarget().getName() = "SetAttribute" and
      this.asExpr() = mc.getArgument(1)
    )
  }
}
```

### 4. URL Redirection Sinks

**Common patterns for URL redirection vulnerability detection:**

```ql
// URL redirect sinks
class UrlRedirectSink extends DataFlow::Node {
  UrlRedirectSink() {
    // Response.Redirect calls
    exists(MethodCall mc |
      mc.getTarget().getName() in ["Redirect", "RedirectPermanent"] and
      mc.getTarget().getDeclaringType().getName().matches("%HttpResponse%") and
      this.asExpr() = mc.getArgument(0)
    )
    or
    // Location header assignments
    exists(AssignExpr ae |
      ae.getLValue().(PropertyCall).getTarget().getName() = "Location" and
      this.asExpr() = ae.getRValue()
    )
  }
}
```

## Common Security Concepts and Implementation Patterns

### Most Important Security Concepts to Model

1. **SQL Injection** - Database query construction with user input
2. **Cross-Site Scripting (XSS)** - HTML output with unescaped user input
3. **URL Redirection** - Redirects to user-controlled URLs
4. **Command Injection** - OS command execution with user input
5. **Path Traversal** - File operations with user-controlled paths
6. **Inappropriate Encoding** - Wrong encoding methods for context
7. **Authentication Bypass** - Missing authentication checks
8. **Authorization Issues** - Insufficient access controls

### Critical Implementation Examples

**Encoding Methods Detection:**

```ql
// .NET encoding methods
class EncodingMethod extends MethodCall {
  string getEncodingType() {
    // HTML encoding methods
    this.getTarget().getDeclaringType().getName() in ["HttpUtility", "WebUtility", "HttpServerUtility"] and
    this.getTarget().getName().matches("%HtmlEncode%") and
    result = "html"
    or
    // URL encoding methods
    this.getTarget().getDeclaringType().getName() in ["HttpUtility", "WebUtility", "HttpServerUtility"] and
    this.getTarget().getName().matches("%UrlEncode%") and
    result = "url"
    or
    // JavaScript encoding methods
    this.getTarget().getDeclaringType().getName() = "HttpUtility" and
    this.getTarget().getName().matches("%JavaScriptEncode%") and
    result = "javascript"
    or
    // Custom encoding (potentially inappropriate)
    this.getTarget().fromSource() and
    this.getTarget().getName().toLowerCase().matches("%encode%") and
    result = "custom"
  }
}
```

**Inappropriate Encoding Detection Pattern:**

```ql
// Configuration for inappropriate encoding detection
private class InappropriateEncodingConfiguration extends TaintTracking::Configuration {
  InappropriateEncodingConfiguration() { this = "InappropriateEncodingConfiguration" }

  override predicate isSource(DataFlow::Node source) {
    // Encoded values that might be inappropriate for their context
    source.asExpr() instanceof EncodingMethod
  }

  override predicate isSink(DataFlow::Node sink) {
    // Sinks that require specific encoding types
    sink instanceof SqlCommandSink or
    sink instanceof HtmlOutputSink or
    sink instanceof UrlRedirectSink
  }

  override predicate isAdditionalTaintStep(DataFlow::Node node1, DataFlow::Node node2) {
    // String concatenation and formatting preserve taint
    exists(AddExpr add |
      add.getAnOperand() = node1.asExpr() and
      node2.asExpr() = add
    )
    or
    exists(MethodCall format |
      format.getTarget().getName() = "Format" and
      format.getTarget().getDeclaringType().getName() = "String" and
      format.getAnArgument() = node1.asExpr() and
      node2.asExpr() = format
    )
  }
}
```

## Security Query Implementation Guide

### STEP 1: Create Query Documentation

Create a `.qhelp` file describing the vulnerability:

```xml
<!DOCTYPE qhelp PUBLIC "-//Semmle//qhelp//EN" "qhelp.dtd">
<qhelp>
<overview>
<p>
[Description of the security vulnerability and its impact]
</p>
</overview>

<recommendation>
<p>
[Recommendations for fixing the vulnerability]
</p>
</recommendation>

<example>
<p>
[Example code showing vulnerable and safe patterns]
</p>
</example>

<references>
<li>OWASP: <a href="[URL]">[Reference title]</a></li>
</references>
</qhelp>
```

### STEP 2: Create Test Cases

Create comprehensive test cases in `.cs` files:

```csharp
using System;
using System.Data.SqlClient;
using System.Web;

public class SecurityTest
{
    public void VulnerableMethod(string userInput)
    {
        // BAD: Vulnerable pattern
        var query = "SELECT * FROM users WHERE name = '" + userInput + "'";
        var cmd = new SqlCommand(query, connection);
    }

    public void SafeMethod(string userInput)
    {
        // GOOD: Safe pattern
        var query = "SELECT * FROM users WHERE name = @name";
        var cmd = new SqlCommand(query, connection);
        cmd.Parameters.AddWithValue("@name", userInput);
    }
}
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

import csharp
import VulnerabilityNameQuery
import DataFlow::PathGraph

from VulnerabilityNameFlow::PathNode source, VulnerabilityNameFlow::PathNode sink
where VulnerabilityNameFlow::flowPath(source, sink)
select sink.getNode(), source, sink, "[Alert message with $@ placeholder]",
  source.getNode(), "[source description]"
```

## Testing Patterns

### Test Case Structure for Security Queries

```csharp
// NON_COMPLIANT: [Vulnerability description]
public void VulnerableMethod(string userInput)
{
    var source = GetUserInput(); // Source: user input
    VulnerableFunction(source); // Sink: dangerous operation
}

// COMPLIANT: [Safe alternative description]
public void SafeMethod(string userInput)
{
    var userInput = GetUserInput();
    var sanitized = SanitizeInput(userInput); // Sanitizer
    SafeFunction(sanitized); // Safe: input sanitized
}
```

### Expected Results Format

```
| file.cs:line:col:line:col | Alert message with $@ | file.cs:source_line:source_col:source_line:source_col | source description |
```

## Framework-Specific Patterns

### ASP.NET Web Applications

```ql
// ASP.NET specific sources and sinks
class AspNetSource extends DataFlow::Node {
  AspNetSource() {
    // Request parameters, headers, cookies, etc.
    exists(PropertyCall pc |
      pc = this.asExpr() and
      pc.getTarget().getDeclaringType().getName() = "HttpRequest" and
      pc.getTarget().getName() in ["QueryString", "Form", "Headers", "Cookies"]
    )
  }
}

class AspNetSink extends DataFlow::Node {
  AspNetSink() {
    // Response output, redirects, etc.
    exists(MethodCall mc |
      mc.getTarget().getDeclaringType().getName() = "HttpResponse" and
      mc.getTarget().getName() in ["Write", "Redirect"] and
      this.asExpr() = mc.getArgument(0)
    )
  }
}
```

### Entity Framework Patterns

```ql
// Entity Framework specific patterns
class EntityFrameworkSink extends DataFlow::Node {
  EntityFrameworkSink() {
    // Raw SQL execution
    exists(MethodCall mc |
      mc.getTarget().getName() in ["ExecuteSqlCommand", "FromSql", "ExecuteSqlRaw"] and
      this.asExpr() = mc.getArgument(0)
    )
  }
}
```

## Performance Considerations

### Optimizing Security Queries

- Use specific type restrictions to limit analysis scope
- Leverage existing security libraries rather than reimplementing
- Use `isAdditionalTaintStep` for custom propagation rules
- Consider using `isBarrier` to stop false positive flows

### Memory and Runtime Optimization

```ql
// Use specific type constraints
predicate isRelevantCall(MethodCall mc) {
  mc.getTarget().getDeclaringType().getNamespace().getName().matches("System.%") and
  mc.getTarget().getName().matches("%Encode%")
}

// Limit scope to security-relevant code
predicate isSecurityRelevantFile(File f) {
  f.getRelativePath().matches("%Controller%") or
  f.getRelativePath().matches("%Service%") or
  f.getRelativePath().matches("%Handler%")
}
```

## CLI References

For C# security query development and testing:

- [codeql query format](../../../../resources/cli/codeql/codeql_query_format.prompt.md)
- [codeql query compile](../../../../resources/cli/codeql/codeql_query_compile.prompt.md)
- [codeql query run](../../../../resources/cli/codeql/codeql_query_run.prompt.md)
- [codeql database analyze](../../../../resources/cli/codeql/codeql_database_analyze.prompt.md)
- [codeql test run](../../../../resources/cli/codeql/codeql_test_run.prompt.md)
- [codeql test extract](../../../../resources/cli/codeql/codeql_test_extract.prompt.md)
