# Security Query Templates

## SQL Injection Detection (Go)

Based on the real CodeQL query from github/codeql repository:

```ql
/**
 * @name Database query built from user-controlled sources
 * @description Building a database query from user-controlled sources is vulnerable to insertion of
 *              malicious code by the user.
 * @kind path-problem
 * @problem.severity error
 * @security-severity 8.8
 * @precision high
 * @id go/sql-injection
 * @tags security
 *       external/cwe/cwe-089
 */

import go
import semmle.go.security.SqlInjection
import SqlInjection::Flow::PathGraph

from SqlInjection::Flow::PathNode source, SqlInjection::Flow::PathNode sink
where SqlInjection::Flow::flowPath(source, sink)
select sink.getNode(), source, sink, "This query depends on a $@.", source.getNode(),
  "user-provided value"
```

## Cross-Site Scripting (XSS) Template

```ql
/**
 * @name Cross-site scripting
 * @description Writing user input directly to a web page
 *              allows for a cross-site scripting vulnerability.
 * @kind path-problem
 * @problem.severity error
 * @security-severity 6.1
 * @precision high
 * @id js/xss
 * @tags security
 *       external/cwe/cwe-079
 */

import javascript
import semmle.javascript.security.dataflow.DomBasedXss
import DomBasedXss::Flow::PathGraph

from DomBasedXss::Flow::PathNode source, DomBasedXss::Flow::PathNode sink
where DomBasedXss::Flow::flowPath(source, sink)
select sink.getNode(), source, sink, "Cross-site scripting vulnerability due to $@.",
  source.getNode(), "user-provided value"
```
