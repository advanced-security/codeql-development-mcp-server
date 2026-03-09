# CodeQL Python Framework and Query Implementation Guide

This document provides specific, actionable instructions for implementing Python framework models and security queries in CodeQL using the ApiGraph library.

## Core Concepts for LLM Understanding

### Required Imports and Dependencies

**For Framework Modeling (.qll files):**

```ql
// Standard framework modeling imports - USE THESE FOR ALL FRAMEWORK MODELS
private import python
private import semmle.python.dataflow.new.DataFlow
private import semmle.python.Concepts
private import semmle.python.ApiGraphs
private import semmle.python.frameworks.internal.InstanceTaintStepsHelper
private import semmle.python.frameworks.data.ModelsAsData

// Optional: Include if framework has existing PEP249 database compliance
// private import semmle.python.frameworks.PEP249
```

**For Security Query Implementation (.ql/.qll files):**

```ql
// Standard security query imports - USE THESE FOR ALL SECURITY QUERIES
import python
import semmle.python.dataflow.new.DataFlow
import semmle.python.dataflow.new.TaintTracking
import semmle.python.Concepts
import semmle.python.dataflow.new.RemoteFlowSources
import semmle.python.dataflow.new.BarrierGuards

// Optional: Include path graph support for path-problem queries
// import DataFlow::PathGraph
```

## Essential ApiGraph Navigation Patterns

**Critical patterns that LLMs must understand for proper implementation:**

### 1. Framework Module Access Patterns (Required Foundation)

```ql
// STEP 1: Create base module reference - ALWAYS start here
API::Node frameworkRef() { result = API::moduleImport("framework_name") }

// STEP 2: Create submodule references if framework has submodules
API::Node submoduleRef() { result = frameworkRef().getMember("submodule_name") }

// STEP 3: Create class references for important security-relevant classes
API::Node classRef() { result = frameworkRef().getMember("ImportantClass") }

// STEP 4: Create function references for security-relevant functions
API::Node functionRef() { result = frameworkRef().getMember("important_function") }

// STEP 5: Handle aliased imports if framework commonly uses them
API::Node aliasedRef() {
  result = frameworkRef() or
  result = API::moduleImport("framework_alias")
}
```

### 2. Navigation Predicates (Chain these systematically)

```ql
// BASIC NAVIGATION - Learn these patterns first
node.getMember("member_name")              // Access any attribute/method/class
node.getACall()                            // Get all calls to this function/method
node.getReturn()                           // Get return value from function/method
node.getParameter(0)                       // Get 1st parameter (0-based indexing)
node.getParameter(n)                       // Get nth parameter where n is integer
node.getKeywordParameter("param_name")     // Get named/keyword parameter
node.getSelfParameter()                    // Get "self" parameter (for methods)

// ADVANCED NAVIGATION - Use for complex frameworks
node.getASubclass()                        // Direct subclasses only
node.getASubclass*()                       // All subclasses (transitive closure)
node.getAnInstance()                       // Instances of this class

// DATA FLOW INTEGRATION - Connect to data flow analysis
node.asSource()                            // Create DataFlow::Node as source
node.asSink()                              // Create DataFlow::Node as sink

// ARGUMENT ACCESS PATTERNS - Critical for sink modeling
call.getArg(0)                             // First positional argument
call.getArg(n)                             // nth positional argument
call.getArgByName("param")                 // Named argument by parameter name
call.getAnArg()                            // Any argument (positional or named)
```

### 3. Security-Relevant API Pattern Templates

**Template A: Direct Function Call Sinks**

```ql
// For functions that directly execute dangerous operations
// Pattern: framework.dangerous_function(user_input)
this = API::moduleImport("framework_name").getMember("execute_sql").getACall()
this = API::moduleImport("subprocess").getMember(["run", "call", "Popen"]).getACall()
this = API::moduleImport("os").getMember(["system", "popen"]).getACall()
```

**Template B: Method Call on Instance Sinks**

```ql
// For methods called on framework instances
// Pattern: instance.method(user_input)
exists(DataFlow::AttrRead ar |
  ar.getObject() = /* instance reference */ and
  ar.getAttributeName() in ["execute", "query", "run"] and
  this = ar.getACall()
)
```

**Template C: Constructor with Dangerous Parameters**

```ql
// For class constructors that create dangerous objects
// Pattern: FrameworkClass(dangerous_param=user_input)
this = API::moduleImport("framework").getMember("DangerousClass").getACall()
```

**Template D: Chained API Calls**

```ql
// For frameworks with fluent/builder APIs
// Pattern: framework.builder().set_param(user_input).execute()
this = API::moduleImport("framework")
       .getMember("QueryBuilder")
       .getACall()  // get builder instance
       .getMember("where")  // call where method
       .getACall()  // get result of where call
```

## Step-by-Step Framework Implementation

### STEP 1: Create Framework Module Structure (EXACT Template - Do Not Modify)

```ql
/**
 * Provides classes modeling security-relevant aspects of the `FRAMEWORK_NAME` PyPI package.
 * See FRAMEWORK_DOCUMENTATION_URL
 */

private import python
private import semmle.python.dataflow.new.DataFlow
private import semmle.python.Concepts
private import semmle.python.ApiGraphs
private import semmle.python.frameworks.internal.InstanceTaintStepsHelper
private import semmle.python.frameworks.data.ModelsAsData

/**
 * Provides models for the `FRAMEWORK_NAME` PyPI package.
 * See FRAMEWORK_DOCUMENTATION_URL
 */
module FRAMEWORK_MODULE_NAME {
  // Replace with actual implementation based on framework analysis
}
```

**LLM Implementation Guidance:**

1. Replace `FRAMEWORK_NAME` with actual PyPI package name (e.g., "flask", "django")
2. Replace `FRAMEWORK_DOCUMENTATION_URL` with actual framework docs URL
3. Replace `FRAMEWORK_MODULE_NAME` with PascalCase module name (e.g., Flask, Django)
4. Keep ALL imports exactly as shown - they provide essential functionality
5. Use `private import` for all imports in framework files

### STEP 2: Implement Basic API Access Points

**Critical: Always start with these fundamental access patterns**

```ql
/** Gets a reference to the core module */
API::Node moduleRef() { result = API::moduleImport("framework_name") }

/** Gets a reference to important classes */
API::Node classRef(string className) {
  result = moduleRef().getMember(className)
}

/** Gets a reference to important functions */
API::Node functionRef(string functionName) {
  result = moduleRef().getMember(functionName)
}
```

### STEP 3: Model Class Instances with Type Tracking

**For classes that need instance tracking, use this exact pattern:**

```ql
/**
 * A source of instances of `framework_name.ClassName`.
 * Include direct instantiation, factory functions, and callback parameters.
 */
abstract class ClassInstanceSource extends DataFlow::LocalSourceNode { }

/** Direct class instantiation */
private class DirectInstantiation extends ClassInstanceSource, DataFlow::CallCfgNode {
  DirectInstantiation() { this = classRef("ClassName").getACall() }
}

/** Factory function that returns an instance */
private class FactoryInstantiation extends ClassInstanceSource, DataFlow::CallCfgNode {
  FactoryInstantiation() { this = functionRef("create_instance").getACall() }
}

/** Type tracking for instances */
private DataFlow::TypeTrackingNode instanceTracking(DataFlow::TypeTracker t) {
  t.start() and result instanceof ClassInstanceSource
  or
  exists(DataFlow::TypeTracker t2 | result = instanceTracking(t2).track(t2, t))
}

/** Gets a reference to a tracked instance */
DataFlow::Node instance() { instanceTracking(DataFlow::TypeTracker::end()).flowsTo(result) }
```

### STEP 4: Model Instance Methods and Properties

**Use InstanceTaintStepsHelper for automatic taint propagation:**

```ql
/**
 * Taint propagation for `framework_name.ClassName`.
 * This automatically handles method calls and attribute access on instances.
 */
private class InstanceTaintSteps extends InstanceTaintStepsHelper {
  InstanceTaintSteps() { this = "framework_name.ClassName" }

  override DataFlow::Node getInstance() { result = instance() }

  override string getAttributeName() {
    // List attributes that should propagate taint
    result in ["data", "content", "body", "text", "value"]
  }

  override string getMethodName() {
    // List methods that should propagate taint from self to return value
    result in ["get_data", "read", "decode", "format"]
  }

  override string getAsyncMethodName() {
    // List async methods that should propagate taint
    result in ["aread", "aformat"]
  }
}
```

### STEP 5: Implement Security Concept Extensions

**Extend existing security concepts rather than creating new ones:**

```ql
/** SQL execution using this framework */
private class FrameworkSqlExecution extends SqlExecution::Range, DataFlow::CallCfgNode {
  FrameworkSqlExecution() {
    // Pattern: instance.method_name(sql_query, ...)
    this = any(DataFlow::AttrRead ar |
      ar.getObject() = instance() and ar.getAttributeName() = "execute"
    ).getACall()
  }

  override DataFlow::Node getSql() {
    // SQL is typically the first argument
    result in [this.getArg(0), this.getArgByName("query"), this.getArgByName("sql")]
  }
}

/** HTTP client request using this framework */
private class FrameworkHttpRequest extends Http::Client::Request::Range, DataFlow::CallCfgNode {
  FrameworkHttpRequest() {
    this = functionRef(["get", "post", "put", "delete", "request"]).getACall()
  }

  override DataFlow::Node getUrl() { result = this.getArg(0) }

  override string getFramework() { result = "framework_name" }

  override DataFlow::Node getResponseBody() { result = this.getReturn() }
}

/** Remote flow source from framework request objects */
private class FrameworkRemoteFlowSource extends RemoteFlowSource::Range {
  FrameworkRemoteFlowSource() {
    // Pattern: request.attribute_name
    exists(DataFlow::AttrRead ar |
      ar.getObject().asExpr().(Name).getId() = "request" and
      ar.getAttributeName() in ["data", "json", "form", "args", "values"] and
      this = ar
    )
  }

  override string getSourceType() { result = "framework_name request data" }
}
```

### STEP 6: Handle Multiple Import Patterns

**Account for different ways frameworks can be imported:**

```ql
/** Gets references accounting for various import patterns */
API::Node frameworkRef() {
  // Direct import: import framework_name
  result = API::moduleImport("framework_name")
  or
  // Submodule import: from framework_name import submodule
  result = API::moduleImport("framework_name").getMember("submodule")
  or
  // Alias import: import framework_name as fn
  result = API::moduleImport("framework_name").getMember("submodule").getMember("ClassName")
}
```

## Security Query Implementation Guide

### Query Structure: Three-Part Pattern

**ALL security queries follow this exact pattern:**

1. **Customizations Module** (`*Customizations.qll`) - Defines Sources, Sinks, Sanitizers
2. **Query Module** (`*Query.qll`) - Defines flow configuration
3. **Final Query** (`*.ql`) - Implements path-problem query

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

  // Use existing threat-model sources (PREFERRED)
  private class ActiveThreatModelSourceAsSource extends Source, ActiveThreatModelSource { }

  // OR define specific sources
  private class SpecificSourceAsSource extends Source {
    SpecificSourceAsSource() {
      // Define specific source patterns
      this = API::moduleImport("framework").getMember("get_user_input").getACall()
    }
  }

  // Define sinks based on security concepts
  private class ConceptSinkAsSink extends Sink {
    ConceptSinkAsSink() {
      this = any(SqlExecution e).getSql()  // SQL injection
      // OR this = any(SystemCommandExecution e).getCommand()  // Command injection
      // OR this = any(Http::Client::Request e).getUrl()  // SSRF
    }
  }

  // Define sanitizers (validation, escaping, etc.)
  private class ValidationSanitizer extends Sanitizer {
    ValidationSanitizer() {
      // Pattern: validation function calls
      exists(DataFlow::CallCfgNode call |
        call.getFunction().asExpr().(Name).getId() = "validate_input" and
        this = call
      )
    }
  }
}
```

### STEP 2: Create Query Configuration Module

```ql
/**
 * Provides a taint-tracking configuration for detecting [VULNERABILITY_NAME] vulnerabilities.
 */
import python
import semmle.python.dataflow.new.DataFlow
import semmle.python.dataflow.new.TaintTracking
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

import python
import VulnerabilityNameQuery
import DataFlow::PathGraph

from VulnerabilityNameFlow::PathNode source, VulnerabilityNameFlow::PathNode sink
where VulnerabilityNameFlow::flowPath(source, sink)
select sink.getNode(), source, sink, "[Alert message with $@ placeholder]",
  source.getNode(), "[source description]"
```

## Testing

All tests should be stored in the `languages/python/<framework-name>/test/<QueryBasename>/` directory.
Each test should be stored in its own folder, named after the framework or module being tested.
Tests should contain a `${frameworkName}.ql` file that contains the test cases for the framework or module.
Test file should be written in the language it is testing (e.g., Python, JavaScript, etc.).

The test file should import the necessary classes and predicates from the framework or module being tested.
Use inline queries to test the functionality of the framework or module being tested.

**Running the Tests:**

```bash
codeql test run --show-extractor-output -- languages/python/<framework-name>/test/
```

Once run check the output of the command to ensure that all tests have passed.
If the test has failed, check the test file and the implementation of the class to ensure that the test is correct.
Iterate on the implementation of the class and the test until the test passes.

Reference the `codeql_test_run` tool for more details on how to use the `codeql test run` command.

### Inline Tests

Inline tests are used to test specific functionality of the library.
Inline tests should be stored in the `Inline${TestName}.ql` file.
For testing AST, CFG, or DataFlow the query should tests the functionality being implemented.
For queries, the inline test should be a query that tests sources, sinks, and sanitizers are inplace.
There should only be one inline test per file.
Multiple tests can be true on the same line, each test is seperated by a space.
Example: `// $ Source1 Source2=source

The inline test `hasActualResult` predicate has the following parameters:

- `Location location`: The location of the element being tested.
- `string element`: The name of the element being tested.
- `string tag`: The tag used to identify the test (e.g., `${Test1}`, `${Test2}`, etc.).
- `string value`: The expected value of the element being tested.
  - Value is set to the expected value of the element being tested and requires the inline test to check the value.
  - Example: `// ${Test1}=${ExpectedValue}`

**Example template:**

```codeql
import utils.InlineExpectationsTest

module InlineTest implements TestSig {
  string getARelevantTag() { result = ["${test1}", "${test2}"] }

  predicate hasActualResult(Location location, string element, string tag, string value) {
    tag = "${Test1}" and
    exists(Variable var |
      element = var.getName() and
      value = typedecl.toString() and
      location = typedecl.getLocation()
    )
    or
    tag = "${Test2}" and
    exists(Variable var |
      element = var.getName() and
      value = typedecl.toString() and
      location = typedecl.getLocation()
    )
    // Add more tests as needed
  }
}

import MakeTest<InlineTest>
```

Check other inline tests in the `languages/python/*/test/` directories for examples of how to implement inline tests.
The inline test `.expected` file should be empty which means that the inline test is expected to pass.
If a test is expected to fail, the `.expected` file should contain the expected output of the test.

## Common Security Concepts and Implementation Patterns

### Most Important Security Concepts to Model

1. **SqlExecution** - SQL query execution
2. **SystemCommandExecution** - OS command execution
3. **Http::Client::Request** - Outgoing HTTP requests
4. **Http::Server::RequestInputAccess** - Incoming request data
5. **FileSystemWrite** - File write operations
6. **FileSystemRead** - File read operations
7. **Decoding** - Data decoding operations
8. **RemoteFlowSource** - Remote user input

### Critical Implementation Examples

**SQL Execution Pattern:**

```ql
private class FrameworkSqlExecution extends SqlExecution::Range, DataFlow::CallCfgNode {
  FrameworkSqlExecution() {
    this = API::moduleImport("orm_framework").getMember(["execute", "raw", "query"]).getACall()
  }

  override DataFlow::Node getSql() { result = this.getArg(0) }
}
```

**Command Execution Pattern:**

```ql
private class FrameworkCommandExecution extends SystemCommandExecution::Range, DataFlow::CallCfgNode {
  FrameworkCommandExecution() {
    this = API::moduleImport("framework").getMember("run_command").getACall()
  }

  override DataFlow::Node getCommand() { result = this.getArg(0) }
}
```

**HTTP Client Pattern:**

```ql
private class FrameworkHttpRequest extends Http::Client::Request::Range, DataFlow::CallCfgNode {
  FrameworkHttpRequest() {
    this = API::moduleImport("http_client").getMember(["get", "post"]).getACall()
  }

  override DataFlow::Node getUrl() { result = this.getArg(0) }
  override string getFramework() { result = "framework_name" }
  override DataFlow::Node getResponseBody() { result = this.getReturn() }
}
```

**File System Access Pattern:**

```ql
private class FrameworkFileWrite extends FileSystemWrite::Range, DataFlow::CallCfgNode {
  FrameworkFileWrite() {
    this = API::moduleImport("framework").getMember("write_file").getACall()
  }

  override DataFlow::Node getAPathArg() { result = this.getArg(0) }
  override DataFlow::Node getADataArg() { result = this.getArg(1) }
}
```

### Common Sink Patterns by Vulnerability Type

| Vulnerability     | Primary Sinks                           | Secondary Sinks                    |
| ----------------- | --------------------------------------- | ---------------------------------- |
| SQL Injection     | `SqlExecution::getSql()`                | `SqlConstruction::getSql()`        |
| Command Injection | `SystemCommandExecution::getCommand()`  | -                                  |
| SSRF              | `Http::Client::Request::getUrl()`       | `Http::Client::Request::getHost()` |
| Path Traversal    | `FileSystemAccess::getAPathArg()`       | -                                  |
| XSS               | `Http::Server::HttpResponse::getBody()` | Template rendering                 |
| LDAP Injection    | `LdapBind`, `LdapSearch`                | -                                  |
| XXE               | `XmlParsing::getSourceArg()`            | -                                  |

## Practical Implementation Guidelines

### File Organization Requirements

**Framework files must be placed in:**
`python/ql/lib/semmle/python/frameworks/FrameworkName.qll`

**Query files must be placed in appropriate directories:**

- Source queries: `python/ql/src/Security/CWE/CWE-XXX/VulnerabilityName.ql`
- Library queries: `python/ql/lib/semmle/python/security/dataflow/VulnerabilityNameQuery.qll`
- Customizations: `python/ql/lib/semmle/python/security/dataflow/VulnerabilityNameCustomizations.qll`

### Documentation Requirements

**Every class and predicate MUST have documentation:**

````ql
/**
 * A SQL execution using the ExampleORM framework.
 *
 * Example usage:
 * ```python
 * from example_orm import Database
 * db = Database()
 * db.execute("SELECT * FROM users WHERE id = ?", user_id)  // Sink: first argument
 * ```
 */
private class ExampleOrmSqlExecution extends SqlExecution::Range, DataFlow::CallCfgNode {
  // Implementation
}
````

### Testing Requirements

**Create test files in:** `languages/python/<framework-name>/test/`

**Test structure:**

```
framework_name/
├── FrameworkName.ql        // Test query
├── test_data.py           // Python code to analyze
└── FrameworkName.expected // Expected results
```

**Test query template:**

```ql
import python
import semmle.python.frameworks.FrameworkName

from DataFlow::Node source
where source instanceof FrameworkName::SomeClass
select source, "Found framework usage"
```

### Common Mistakes to Avoid

1. **Don't hardcode module paths** - Use API::moduleImport consistently
2. **Always handle multiple import patterns** - Check `from x import y` and `import x.y`
3. **Use existing concepts** - Don't create new security concepts unnecessarily
4. **Test thoroughly** - Ensure models detect real-world usage patterns
5. **Document with examples** - Include Python code examples in comments

### Performance Considerations

- Use `private` visibility for internal classes
- Prefer specific API patterns over broad catches
- Chain navigation predicates efficiently
- Use `exists()` clauses to limit scope when needed

### Validation Checklist

Before submitting framework models, verify:

- [ ] All imports are correct and minimal
- [ ] Module follows established naming patterns
- [ ] Documentation includes Python usage examples
- [ ] Test cases cover primary API patterns
- [ ] Security concepts are properly extended
- [ ] Type tracking works for relevant classes
- [ ] Multiple import patterns are handled
