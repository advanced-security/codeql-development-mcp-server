---
name: update-codeql-query-dataflow-swift
description: Update CodeQL queries for Swift from legacy v1 dataflow API to modern v2 shared dataflow API. Use this skill when migrating Swift queries to use DataFlow::ConfigSig modules, ensuring query results remain equivalent through TDD.
---

# Update CodeQL Query Dataflow for Swift

This skill guides you through migrating Swift CodeQL queries from the legacy v1 (language-specific) dataflow API to the modern v2 (shared) dataflow API while ensuring query results remain equivalent.

## When to Use This Skill

- Migrating Swift queries using deprecated `DataFlow::Configuration` or `TaintTracking::Configuration` classes
- Updating queries to use `DataFlow::ConfigSig` modules
- Modernizing Swift queries to use the shared dataflow library
- Ensuring query result equivalence during dataflow API migration

## Prerequisites

- Existing Swift CodeQL query using v1 dataflow API that you want to migrate
- Existing unit tests for the query
- Understanding of the query's detection purpose
- Access to CodeQL Development MCP Server tools
- **macOS environment** - Swift CodeQL analysis requires macOS and Xcode

> **Important**: Swift CodeQL analysis requires macOS because the Swift extractor depends on `xcodebuild` and macOS SDK frameworks.

## Key Dataflow API Changes (v1 → v2)

### Configuration Class → Configuration Module

**v1 (Legacy):**

```ql
class MyConfig extends TaintTracking::Configuration {
  MyConfig() { this = "MyConfig" }
  override predicate isSource(DataFlow::Node source) { ... }
  override predicate isSink(DataFlow::Node sink) { ... }
  override predicate isSanitizer(DataFlow::Node node) { ... }
  override predicate isAdditionalTaintStep(DataFlow::Node n1, DataFlow::Node n2) { ... }
}
```

**v2 (Modern):**

```ql
module MyConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) { ... }
  predicate isSink(DataFlow::Node sink) { ... }
  predicate isBarrier(DataFlow::Node node) { ... }
  predicate isAdditionalFlowStep(DataFlow::Node n1, DataFlow::Node n2) { ... }
}

module MyFlow = TaintTracking::Global<MyConfig>;
```

### Key Terminology Changes

| v1 API                       | v2 API                       | Purpose                    |
| ---------------------------- | ---------------------------- | -------------------------- |
| `DataFlow::Configuration`    | `DataFlow::ConfigSig`        | Configuration signature    |
| `isSanitizer`                | `isBarrier`                  | Stop data flow propagation |
| `isAdditionalTaintStep`      | `isAdditionalFlowStep`       | Custom flow steps          |
| `this.hasFlow(source, sink)` | `MyFlow::flow(source, sink)` | Query flow paths           |

### Swift-Specific Node Types

Swift dataflow uses these core node representations:

- **`ExprNode`**: AST expression nodes (function calls, member access)
- **`ParameterNode`**: Function parameter nodes
- **`PatternNode`**: Pattern binding nodes (let/var bindings)
- **`SsaDefinitionNode`**: SSA definition nodes for variable tracking
- **`CaptureNode`**: Closure capture nodes
- **`InoutReturnNode`**: Return flow through inout parameters

## Migration Workflow

### Phase 1: Establish Test Baseline (TDD Foundation)

**Critical**: Before any code changes, capture current query behavior.

#### Step 1: Run Existing Tests

Use `codeql_test_run` to establish baseline:

```json
{
  "testPath": "<query-pack>/test/{QueryName}",
  "searchPath": ["<query-pack>"]
}
```

**Save the output** - this is your reference for query result equivalence.

#### Step 2: Document Current Results

Create a reference file with current results:

```bash
cp <query-pack>/test/{QueryName}/{QueryName}.expected \
   <query-pack>/test/{QueryName}/{QueryName}.expected.v1-baseline
```

This ensures you can verify equivalence after migration.

### Phase 2: Analyze Current Query

#### Step 3: Identify v1 Patterns

Review the query for v1 API usage:

- `class X extends DataFlow::Configuration` or `class X extends TaintTracking::Configuration`
- `isSanitizer` predicates
- `isAdditionalTaintStep` predicates
- `this.hasFlow(source, sink)` queries

#### Step 4: Understand Swift-Specific Flow

Identify how the query uses Swift dataflow constructs:

- **FlowSource**: Base class for all flow sources
- **RemoteFlowSource**: Network sources (URLSession, Alamofire, etc.)
- **LocalFlowSource**: Local sources (UserDefaults, Keychain, etc.)
- **Swift sinks**: SQL injection, command injection, path traversal, XSS
- **Framework-specific flows**: Foundation, UIKit, CryptoKit, Alamofire, Realm

### Phase 3: Migrate to v2 API

#### Step 5: Convert Configuration Class to Module

**Before:**

```ql
import swift
import codeql.swift.dataflow.DataFlow
import codeql.swift.dataflow.TaintTracking

class SqlInjectionConfig extends TaintTracking::Configuration {
  SqlInjectionConfig() { this = "SqlInjectionConfig" }

  override predicate isSource(DataFlow::Node source) {
    source instanceof RemoteFlowSource
  }

  override predicate isSink(DataFlow::Node sink) {
    exists(CallExpr call |
      call.getStaticTarget().getName().matches("%raw%SQL%") and
      sink.asExpr() = call.getAnArgument().getExpr()
    )
  }

  override predicate isSanitizer(DataFlow::Node node) {
    exists(CallExpr call |
      call.getStaticTarget().getName() = "sanitize" and
      node.asExpr() = call
    )
  }
}

from SqlInjectionConfig cfg, DataFlow::PathNode source, DataFlow::PathNode sink
where cfg.hasFlowPath(source, sink)
select sink.getNode(), source, sink, "SQL injection from $@", source.getNode(), "user input"
```

**After:**

```ql
import swift
import codeql.swift.dataflow.DataFlow
import codeql.swift.dataflow.TaintTracking

module SqlInjectionConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) {
    source instanceof RemoteFlowSource
  }

  predicate isSink(DataFlow::Node sink) {
    exists(CallExpr call |
      call.getStaticTarget().getName().matches("%raw%SQL%") and
      sink.asExpr() = call.getAnArgument().getExpr()
    )
  }

  predicate isBarrier(DataFlow::Node node) {
    exists(CallExpr call |
      call.getStaticTarget().getName() = "sanitize" and
      node.asExpr() = call
    )
  }
}

module SqlInjectionFlow = TaintTracking::Global<SqlInjectionConfig>;

from SqlInjectionFlow::PathNode source, SqlInjectionFlow::PathNode sink
where SqlInjectionFlow::flowPath(source, sink)
select sink.getNode(), source, sink, "SQL injection from $@", source.getNode(), "user input"
```

#### Step 6: Rename Predicates

- **`isSanitizer`** → **`isBarrier`**: Change method name only, logic unchanged
- **`isAdditionalTaintStep`** → **`isAdditionalFlowStep`**: Change method name only

#### Step 7: Update Flow Queries

Replace `cfg.hasFlow(source, sink)` with `MyFlow::flow(source, sink)`:

- Remove configuration variable from `from` clause
- Use module flow predicate directly
- For path queries, use `MyFlow::PathNode` and `MyFlow::flowPath(source, sink)`

### Phase 4: Handle Swift-Specific Migration Patterns

#### Step 8: Swift Flow Source Types

Swift provides built-in flow source classes in `codeql.swift.dataflow.FlowSources`:

```ql
import codeql.swift.dataflow.FlowSources

predicate isSource(DataFlow::Node source) {
  // Any remote flow source (network, URL schemes, etc.)
  source instanceof RemoteFlowSource
  or
  // Local flow sources (file system, preferences, etc.)
  source instanceof LocalFlowSource
  or
  // All flow sources
  source instanceof FlowSource
}
```

**Remote Flow Source Examples:**

- URLSession delegate methods
- Alamofire response handlers
- WebKit navigation/JavaScript
- Custom URL scheme handlers
- Push notification payloads

**Local Flow Source Examples:**

- UserDefaults values
- Keychain data
- File system operations
- Pasteboard contents

#### Step 9: Swift Sink Patterns

Common Swift security sinks:

```ql
predicate isSink(DataFlow::Node sink) {
  // SQL Injection (SQLite, GRDB, Realm raw queries)
  exists(CallExpr call |
    call.getStaticTarget().getName().matches(["%execute%", "%raw%", "%prepare%"]) and
    sink.asExpr() = call.getAnArgument().getExpr()
  )
  or
  // Command Injection (Process, NSTask)
  exists(CallExpr call |
    call.getStaticTarget().getName() in ["launch", "run"] and
    call.getStaticTarget().getDeclaringDecl().getName() = "Process" and
    sink.asExpr() = call.getQualifier().(MemberRefExpr).getBase()
  )
  or
  // Path Traversal (FileManager, URL file operations)
  exists(CallExpr call |
    call.getStaticTarget().getName().matches(["%contentsOfFile%", "%write%", "%createFile%"]) and
    sink.asExpr() = call.getAnArgument().getExpr()
  )
  or
  // JavaScript Injection (WKWebView evaluateJavaScript)
  exists(CallExpr call |
    call.getStaticTarget().getName() = "evaluateJavaScript" and
    sink.asExpr() = call.getArgument(0).getExpr()
  )
  or
  // Predicate Injection (NSPredicate)
  exists(CallExpr call |
    call.getStaticTarget().getName() = "init" and
    call.getStaticTarget().getDeclaringDecl().getName() = "NSPredicate" and
    sink.asExpr() = call.getArgument(0).getExpr()
  )
}
```

#### Step 10: Swift Framework-Specific Flows

Track flows through iOS/macOS framework constructs:

**Alamofire Flows:**

```ql
predicate isAdditionalFlowStep(DataFlow::Node n1, DataFlow::Node n2) {
  // Alamofire response data
  exists(CallExpr call |
    call.getStaticTarget().getName() in ["responseJSON", "responseData", "responseString"] and
    n1.asExpr() = call.getQualifier() and
    n2.asExpr() = call
  )
}
```

**Realm Swift Flows:**

```ql
predicate isAdditionalFlowStep(DataFlow::Node n1, DataFlow::Node n2) {
  // Realm object property access
  exists(MemberRefExpr access |
    access.getBase().getType().getName().matches("%Object") and
    n1.asExpr() = access.getBase() and
    n2.asExpr() = access
  )
}
```

**CryptoKit Flows:**

```ql
predicate isAdditionalFlowStep(DataFlow::Node n1, DataFlow::Node n2) {
  // Encryption/decryption flows
  exists(CallExpr call |
    call.getStaticTarget().getName() in ["seal", "open", "combined"] and
    n1.asExpr() = call.getAnArgument().getExpr() and
    n2.asExpr() = call
  )
}
```

#### Step 11: Swift-Specific Barriers

Common sanitization patterns in Swift:

```ql
predicate isBarrier(DataFlow::Node node) {
  // String validation with regex
  exists(CallExpr call |
    call.getStaticTarget().getName() in ["matches", "range"] and
    call.getStaticTarget().getDeclaringDecl().getName() = "NSRegularExpression" and
    node.asExpr() = call.getQualifier()
  )
  or
  // URL encoding
  exists(CallExpr call |
    call.getStaticTarget().getName() = "addingPercentEncoding" and
    node.asExpr() = call
  )
  or
  // Guard statement validation
  exists(GuardStmt guard |
    node.asExpr() = guard.getACondition().(CallExpr)
  )
}
```

### Phase 5: Validate Equivalence Through Testing

#### Step 12: Compile Migrated Query

Use `codeql_query_compile` to check for errors:

```json
{
  "queryPath": "<query-pack>/src/{QueryName}/{QueryName}.ql",
  "searchPath": ["<query-pack>"]
}
```

Fix any compilation errors before testing.

#### Step 13: Run Tests and Compare Results

Use `codeql_test_run` on migrated query:

```json
{
  "testPath": "<query-pack>/test/{QueryName}",
  "searchPath": ["<query-pack>"]
}
```

**Compare results with v1 baseline:**

```bash
diff <query-pack>/test/{QueryName}/{QueryName}.expected \
     <query-pack>/test/{QueryName}/{QueryName}.expected.v1-baseline
```

Results should be **identical**. Any difference indicates:

1. Migration error in v2 configuration
2. Bug in v1 query that was unintentionally corrected
3. Intentional improvement (document this)

#### Step 14: Accept Results if Equivalent

If tests pass and results match baseline, the migration is complete.

If there are differences:

1. **Analyze each difference** - Is it a bug fix or regression?
2. **Update tests** only if you've confirmed behavior improvement
3. **Document changes** in query comments

### Phase 6: Clean Up

#### Step 15: Remove v1 Backup

Once migration is verified:

```bash
rm <query-pack>/test/{QueryName}/{QueryName}.expected.v1-baseline
```

#### Step 16: Update Query Documentation

Update QLDoc comments:

```ql
/**
 * @name SQL Injection
 * @description Using unsanitized user input in SQL queries...
 * @kind path-problem
 * @problem.severity error
 * @precision high
 * @id swift/sql-injection
 * @tags security
 *       external/cwe/cwe-089
 */
```

## MCP Tools Reference

### Query Development

- **`codeql_query_compile`**: Compile and validate query syntax
- **`codeql_query_format`**: Format CodeQL query files
- **`codeql_query_run`**: Run query against databases

### Testing

- **`codeql_test_run`**: Run query unit tests
- **`codeql_test_extract`**: Extract test databases
- **`codeql_test_accept`**: Accept test results as baseline

### Analysis

- **`codeql_bqrs_decode`**: Decode query results
- **`codeql_bqrs_interpret`**: Interpret results in various formats

### Pack Management

- **`codeql_pack_install`**: Install query pack dependencies

## Swift Import Statement Reference

### Core Dataflow Imports

```ql
import swift                                      // Main Swift library
import codeql.swift.dataflow.DataFlow           // Core dataflow
import codeql.swift.dataflow.TaintTracking      // Taint tracking
import codeql.swift.dataflow.FlowSources        // Source definitions
```

### CFG and Control Flow

```ql
import codeql.swift.controlflow.ControlFlowGraph  // CFG nodes
import codeql.swift.controlflow.BasicBlocks       // Basic blocks
```

### AST and Elements

```ql
import codeql.swift.elements                       // All AST elements
import codeql.swift.elements.expr.CallExpr        // Call expressions
import codeql.swift.elements.decl.Function        // Functions
```

### Security Extensions (for specific vulnerability patterns)

```ql
import codeql.swift.security.SqlInjectionExtensions
import codeql.swift.security.CommandInjectionExtensions
import codeql.swift.security.PathInjectionExtensions
import codeql.swift.security.XXEExtensions
import codeql.swift.security.CleartextStorageDatabaseExtensions
```

## Common Migration Pitfalls

### 1. Missing Module Import

Ensure all required predicates are imported:

```ql
// Include flow definitions
module MyFlow = TaintTracking::Global<MyConfig>;
import MyFlow::PathGraph  // For path-problem queries
```

### 2. Incorrect PathNode Usage

```ql
// Wrong: Using DataFlow::PathNode directly
from DataFlow::PathNode source, DataFlow::PathNode sink

// Correct: Using module-qualified PathNode
from MyFlow::PathNode source, MyFlow::PathNode sink
```

### 3. Forgetting isBarrier Rename

The most common error - ensure all `isSanitizer` → `isBarrier`:

```ql
// v1 (wrong in v2)
predicate isSanitizer(DataFlow::Node node) { ... }

// v2 (correct)
predicate isBarrier(DataFlow::Node node) { ... }
```

### 4. Missing Flow Module Import for PathGraph

For `@kind path-problem` queries:

```ql
module MyFlow = TaintTracking::Global<MyConfig>;
import MyFlow::PathGraph  // Required for path visualization
```

## Troubleshooting

### Test Results Differ After Migration

1. **Check predicate names**: Ensure `isSanitizer` → `isBarrier`, etc.
2. **Verify flow module usage**: Use `MyFlow::flow()` not `cfg.hasFlow()`
3. **Compare flow paths**: V2 may find additional valid paths
4. **Review test cases**: Ensure test Swift code compiles correctly

### Query Doesn't Compile

1. **Check import statements**: Ensure all modules are imported
2. **Verify module instantiation**: `module MyFlow = TaintTracking::Global<MyConfig>`
3. **Check predicate signatures**: Must match `DataFlow::ConfigSig` exactly

### macOS/Swift-Specific Issues

1. **Extraction fails**: Ensure running on macOS with Xcode installed
2. **Swift version mismatch**: CodeQL supports Swift 5.4 through 6.2
3. **Framework not found**: Check Swift SDK availability

## Quality Checklist

Before considering migration complete:

- [ ] v1 baseline captured before any changes
- [ ] All `isSanitizer` renamed to `isBarrier`
- [ ] All `isAdditionalTaintStep` renamed to `isAdditionalFlowStep`
- [ ] Configuration class converted to module
- [ ] Flow module instantiated correctly
- [ ] `hasFlow` replaced with module flow predicate
- [ ] Query compiles without errors
- [ ] All tests pass
- [ ] Results match v1 baseline (or differences documented)
- [ ] Query documentation updated
- [ ] v1 backup files removed
- [ ] Tests verified on macOS environment

## Related Resources

- [Analyzing Data Flow in Swift](https://codeql.github.com/docs/codeql-language-guides/analyzing-data-flow-in-swift/) - Official Swift dataflow guide
- [Swift Standard Library Reference](https://codeql.github.com/codeql-standard-libraries/swift/) - Swift CodeQL API reference
- [Swift Built-in Queries](https://docs.github.com/en/code-security/reference/code-scanning/codeql/codeql-queries/swift-built-in-queries) - Reference implementations
- [CodeQL TDD Generic Skill](../create-codeql-query-tdd-generic/SKILL.md) - General test-driven development workflow
- [Swift Unit Test Skill](../create-codeql-query-unit-test-swift/SKILL.md) - Creating Swift query tests

## Success Criteria

Your Swift dataflow migration is successful when:

1. ✅ Query uses v2 `DataFlow::ConfigSig` module pattern
2. ✅ All predicate names follow v2 conventions
3. ✅ Query compiles without errors
4. ✅ All unit tests pass
5. ✅ Results match v1 baseline (or improvements documented)
6. ✅ Query documentation reflects v2 patterns
7. ✅ Tests verified on macOS environment
