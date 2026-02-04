---
name: update-codeql-query-dataflow-java
description: Update CodeQL queries for Java and Kotlin from legacy v1 dataflow API to modern v2 shared dataflow API. Use this skill when migrating Java/Kotlin queries to use DataFlow::ConfigSig modules, ensuring query results remain equivalent through TDD.
---

# Update CodeQL Query Dataflow for Java

This skill guides you through migrating Java and Kotlin CodeQL queries from the legacy v1 (language-specific) dataflow API to the modern v2 (shared) dataflow API while ensuring query results remain equivalent.

## When to Use This Skill

- Migrating Java/Kotlin queries from `DataFlow::Configuration` to `DataFlow::ConfigSig` modules
- Ensuring query result equivalence during dataflow API migration

## Prerequisites

- Existing Java/Kotlin query with v1 dataflow API and unit tests
- Access to CodeQL Development MCP Server tools

## Key Dataflow API Changes (v1 → v2)

### Configuration Class → Configuration Module

**v1 (Legacy):**

```ql
class MyConfig extends DataFlow::Configuration {
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

### Java/Kotlin Node Types

- **`ExprNode`**: AST expressions (method calls, field access)
- **`ParameterNode`**: Method parameters
- **`RemoteFlowSource`**: User-controllable input sources
- **`InstanceParameterNode`**: Implicit `this` parameter

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
- `this.hasFlow(source, sink)` or `this.hasFlowPath(source, sink)` queries

#### Step 4: Understand Java/Kotlin Flow

Review dataflow constructs: sources (RemoteFlowSource, servlet/Spring params), sinks (SQL/command execution), barriers (sanitization), custom flow (collections, streams, lambdas).

### Phase 3: Migrate to v2 API

#### Step 5: Convert Configuration Class to Module

**Before:**

```ql
class SqlInjectionConfig extends TaintTracking::Configuration {
  SqlInjectionConfig() { this = "SqlInjectionConfig" }

  override predicate isSource(DataFlow::Node source) {
    source instanceof RemoteFlowSource
  }

  override predicate isSink(DataFlow::Node sink) {
    exists(MethodCall mc |
      mc.getMethod().hasName("executeQuery") and
      sink.asExpr() = mc.getAnArgument()
    )
  }

  override predicate isSanitizer(DataFlow::Node node) {
    node.asExpr().(MethodCall).getMethod().hasName("sanitize")
  }
}

from SqlInjectionConfig cfg, DataFlow::PathNode source, DataFlow::PathNode sink
where cfg.hasFlowPath(source, sink)
select sink.getNode(), source, sink, "SQL injection from $@", source.getNode(), "user input"
```

**After:**

```ql
module SqlInjectionConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) {
    source instanceof RemoteFlowSource
  }

  predicate isSink(DataFlow::Node sink) {
    exists(MethodCall mc |
      mc.getMethod().hasName("executeQuery") and
      sink.asExpr() = mc.getAnArgument()
    )
  }

  predicate isBarrier(DataFlow::Node node) {
    node.asExpr().(MethodCall).getMethod().hasName("sanitize")
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

### Phase 4: Handle Java/Kotlin-Specific Migration Patterns

#### Step 8: RemoteFlowSource Usage

`RemoteFlowSource` works identically in v1 and v2:

```ql
predicate isSource(DataFlow::Node source) {
  source instanceof RemoteFlowSource or
  // Spring framework
  exists(Parameter p | p.getAnAnnotation().getType().hasQualifiedName("org.springframework.web.bind.annotation", "RequestParam") |
    source.asParameter() = p
  ) or
  // Servlet API
  exists(MethodCall mc | mc.getMethod().hasQualifiedName("javax.servlet.http", "HttpServletRequest", "getParameter") |
    source.asExpr() = mc
  )
}
```

#### Step 9: Java Collection and Stream Flow

Track flows through collections and streams:

```ql
predicate isAdditionalFlowStep(DataFlow::Node n1, DataFlow::Node n2) {
  // Flow through collection add/get
  exists(MethodCall add, MethodCall get |
    add.getMethod().hasName("add") and
    get.getMethod().hasName("get") and
    add.getQualifier() = get.getQualifier() and
    n1.asExpr() = add.getAnArgument() and
    n2.asExpr() = get
  ) or
  // Flow through Stream operations
  exists(MethodCall stream |
    stream.getMethod().hasName(["map", "flatMap", "filter"]) and
    n1.asExpr() = stream.getQualifier() and
    n2.asExpr() = stream
  )
}
```

#### Step 10: Lambda Expression and Method Reference Flow

For functional programming patterns:

```ql
predicate isAdditionalFlowStep(DataFlow::Node n1, DataFlow::Node n2) {
  // Flow through lambda parameters to body
  exists(LambdaExpr lambda |
    n1.asParameter() = lambda.getAParameter() and
    DataFlow::localFlow(n1, n2) and
    n2.asExpr().getEnclosingCallable() = lambda
  ) or
  // Flow through method references
  exists(MemberRefExpr ref |
    n1.asExpr() = ref.getQualifier() and
    n2.asExpr() = ref
  )
}
```

#### Step 11: Type Narrowing and Casts

Handle Java type casts and Kotlin smart casts:

```ql
predicate isAdditionalFlowStep(DataFlow::Node n1, DataFlow::Node n2) {
  // Flow through type casts
  exists(CastExpr cast |
    n1.asExpr() = cast.getExpr() and
    n2.asExpr() = cast
  ) or
  // Kotlin NotNullExpr
  exists(NotNullExpr notNull |
    n1.asExpr() = notNull.getExpr() and
    n2.asExpr() = notNull
  )
}
```

#### Step 12: Implicit Conversions

Java/Kotlin have implicit conversions to track:

```ql
predicate isAdditionalFlowStep(DataFlow::Node n1, DataFlow::Node n2) {
  // String concatenation
  exists(AddExpr concat |
    concat.getType() instanceof TypeString and
    n1.asExpr() = concat.getAnOperand() and
    n2.asExpr() = concat
  ) or
  // Boxing/unboxing
  exists(Expr e |
    (e instanceof BoxExpr or e instanceof UnboxExpr) and
    n1.asExpr() = e.(ConversionExpr).getExpr() and
    n2.asExpr() = e
  )
}
```

### Phase 5: Validate Equivalence Through Testing

#### Step 13: Compile Migrated Query

Use `codeql_query_compile` to check for errors:

```json
{
  "queryPath": "<query-pack>/src/{QueryName}/{QueryName}.ql",
  "searchPath": ["<query-pack>"]
}
```

Fix any compilation errors before testing.

#### Step 14: Run Tests and Compare Results

Use `codeql_test_run` on migrated query:

```json
{
  "testPath": "<query-pack>/test/{QueryName}",
  "searchPath": ["<query-pack>"]
}
```

**Critical**: Results MUST match baseline from Phase 1.

#### Step 15: Verify Result Equivalence

Compare results line-by-line:

```bash
diff <query-pack>/test/{QueryName}/{QueryName}.expected.v1-baseline \
     <query-pack>/test/{QueryName}/{QueryName}.expected
```

**Success**: Empty diff (identical results)
**Failure**: Any differences require investigation and fixes

### Phase 6: Expand Test Coverage (Optional)

#### Step 16: Add Edge Case Tests

Add tests for lambdas, streams, generics, Kotlin features, frameworks. For each: add test code, update `.expected`, re-extract with `codeql_test_extract`, run tests.

### Phase 7: Performance Validation

#### Step 17: Check Performance

Run query on realistic database. If performance degrades: cache expensive predicates, use local flow where possible, limit scope.

### Phase 8: Finalize Migration

#### Step 18: Update Query Metadata

Ensure query metadata reflects v2 API usage:

```ql
/**
 * @name SQL Injection
 * @description Executing SQL queries with untrusted user input
 * @kind path-problem
 * @id java/sql-injection
 * @tags security external/cwe/cwe-089
 * @precision high
 */

import java
import semmle.code.java.dataflow.TaintTracking
import DataFlow::PathGraph
```

#### Step 19: Clean Up

Remove v1 baseline files, add migration notes if needed, format with `codeql_query_format`.

## Java/Kotlin-Specific Dataflow Considerations

### Spring Framework Patterns

```ql
// Spring MVC request parameters
predicate isSource(DataFlow::Node source) {
  exists(Parameter p |
    p.getAnAnnotation().getType().hasQualifiedName("org.springframework.web.bind.annotation", ["RequestParam", "PathVariable", "RequestBody"]) and
    source.asParameter() = p
  )
}
```

### Jakarta EE / Servlet API Patterns

```ql
// Servlet request sources
predicate isSource(DataFlow::Node source) {
  exists(MethodCall mc |
    mc.getMethod().getDeclaringType().hasQualifiedName("jakarta.servlet.http", "HttpServletRequest") and
    mc.getMethod().hasName(["getParameter", "getHeader", "getCookie"]) and
    source.asExpr() = mc
  )
}
```

### Kotlin-Specific Patterns

```ql
// Kotlin when expression flow
predicate isAdditionalFlowStep(DataFlow::Node n1, DataFlow::Node n2) {
  exists(WhenExpr when, WhenBranch branch |
    when.getBranch(_) = branch and
    n1.asExpr() = when.getExpr() and
    n2.asExpr() = branch.getResult()
  )
}

// Kotlin extension function receiver flow
predicate isAdditionalFlowStep(DataFlow::Node n1, DataFlow::Node n2) {
  exists(ExtensionMethod ext, MethodCall call |
    call.getMethod() = ext and
    n1.asExpr() = call.getQualifier() and
    n2.(InstanceParameterNode).getCallable() = ext
  )
}
```

### JPA/Hibernate Query Construction

```ql
// Sink: Dynamic JPQL/HQL query
predicate isSink(DataFlow::Node sink) {
  exists(MethodCall mc |
    mc.getMethod().getDeclaringType().hasQualifiedName("javax.persistence", "EntityManager") and
    mc.getMethod().hasName("createQuery") and
    sink.asExpr() = mc.getArgument(0)
  )
}
```

## MCP Tools Reference

- **`codeql_test_run`**: Run tests and compare with expected results
- **`codeql_test_extract`**: Extract test databases from Java/Kotlin source code
- **`codeql_query_compile`**: Compile queries and check for errors
- **`codeql_query_run`**: Run queries for analysis
- **`codeql_bqrs_decode`**: Decode binary query results
- **`codeql_query_format`**: Format query files for consistency
- **`codeql_pack_install`**: Install query pack dependencies

## Common Migration Pitfalls

❌ **Don't:**

- Skip baseline test establishment before migration
- Change query logic alongside API migration (separate concerns)
- Accept test results without verifying equivalence
- Remove v1 baseline until migration is confirmed successful
- Ignore performance regressions
- Forget to update imports if needed
- Overlook Kotlin-specific patterns when migrating mixed Java/Kotlin queries

✅ **Do:**

- Establish test baseline BEFORE any changes
- Make purely mechanical API changes first
- Verify exact result equivalence after migration
- Keep v1 baseline for comparison during migration
- Test edge cases specific to Java (generics, lambdas, streams) and Kotlin (when, extensions, null safety)
- Document any intentional behavior changes separately

## Troubleshooting Non-Equivalent Results

If results differ after migration:

1. **Check node type conversions**: Ensure `asExpr()`, `asParameter()` usage is correct
2. **Verify predicate renames**: Confirm `isBarrier` vs `isSanitizer` logic is identical
3. **Review flow predicates**: Check `isAdditionalFlowStep` mirrors `isAdditionalTaintStep`
4. **Inspect missing results**: Use `MyFlow::flow(source, sink)` for debugging partial flows
5. **Debug with PrintAST**: Use `codeql_query_run` to understand AST structure

## Documentation References

- [New dataflow API for writing custom CodeQL queries](https://github.blog/changelog/2023-08-14-new-dataflow-api-for-writing-custom-codeql-queries/) - Official v2 API announcement
- [Analyzing data flow in Java and Kotlin](https://codeql.github.com/docs/codeql-language-guides/analyzing-data-flow-in-java/) - Java/Kotlin dataflow guide
- [CodeQL Java Library Reference](https://codeql.github.com/codeql-standard-libraries/java/) - Standard library documentation

## Related Resources

- [Create CodeQL Query TDD Generic](../create-codeql-query-tdd-generic/SKILL.md) - TDD workflow for queries
- [Create CodeQL Query Unit Test for Java](../create-codeql-query-unit-test-java/SKILL.md) - Java unit testing guide
- [QSpec Reference for Java](../../../server/src/resources/qspec-reference-java.md) - Java-specific QSpec patterns
- [Java Query Development Prompts](../../../.github/prompts/generate-qspec-java.prompt.md) - Java query guidance

## Success Criteria

Your dataflow migration is successful when:

- ✅ Test baseline established before migration
- ✅ Query compiles without errors using v2 API
- ✅ All configuration classes converted to modules
- ✅ All `isSanitizer` renamed to `isBarrier`
- ✅ All `isAdditionalTaintStep` renamed to `isAdditionalFlowStep`
- ✅ All `cfg.hasFlow()` calls replaced with module flow predicates
- ✅ Test results EXACTLY match v1 baseline (zero diff)
- ✅ No performance regressions
- ✅ Query metadata updated appropriately
- ✅ Java/Kotlin-specific patterns (lambdas, streams, Kotlin features) handled correctly
