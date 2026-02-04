---
name: update-codeql-query-dataflow-go
description: Update CodeQL queries for Go from legacy v1 dataflow API to modern v2 shared dataflow API. Use this skill when migrating Go queries to use DataFlow::ConfigSig modules, ensuring query results remain equivalent through TDD.
---

# Update CodeQL Query Dataflow for Go

This skill guides you through migrating Go CodeQL queries from the legacy v1 (language-specific) dataflow API to the modern v2 (shared) dataflow API while ensuring query results remain equivalent.

## When to Use This Skill

- Migrating Go queries using deprecated `DataFlow::Configuration` classes
- Updating queries to use `DataFlow::ConfigSig` modules
- Modernizing Go queries to use the shared dataflow library
- Ensuring query result equivalence during dataflow API migration

## Prerequisites

- Existing Go CodeQL query using v1 dataflow API that you want to migrate
- Existing unit tests for the query
- Understanding of the query's detection purpose
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

### Go-Specific Node Types

Go dataflow uses multiple node representations:

- **`ExprNode`**: AST expression nodes (e.g., function calls, literals)
- **`ParameterNode`**: Function parameter nodes
- **`InstructionNode`**: IR (intermediate representation) instruction nodes
- **`RemoteFlowSource`**: Predefined sources for user-controllable input

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

- `class X extends DataFlow::Configuration`
- `isSanitizer` predicates
- `isAdditionalTaintStep` predicates
- `this.hasFlow(source, sink)` queries

#### Step 4: Understand Go-Specific Flow

Identify how the query uses Go dataflow constructs:

- AST-to-IR mappings (e.g., `asExpr()`, `asInstruction()`)
- `RemoteFlowSource` for user input
- Go-specific sources: `os.Args`, `os.Getenv`, HTTP request parameters
- Go-specific sinks: `os/exec.Command`, `database/sql.Query`, file operations

### Phase 3: Migrate to v2 API

#### Step 5: Convert Configuration Class to Module

**Before:**

```ql
class MyConfig extends DataFlow::Configuration {
  MyConfig() { this = "MyConfig" }
  override predicate isSource(DataFlow::Node source) {
    source instanceof RemoteFlowSource
  }
  override predicate isSink(DataFlow::Node sink) {
    exists(DataFlow::CallNode call |
      call.getTarget().hasQualifiedName("os/exec", "Command") and
      sink = call.getAnArgument()
    )
  }
  override predicate isSanitizer(DataFlow::Node node) {
    node = any(SanitizationCall c).getResult()
  }
}

from MyConfig cfg, DataFlow::Node source, DataFlow::Node sink
where cfg.hasFlow(source, sink)
select sink, "Untrusted data flows to command execution"
```

**After:**

```ql
module MyConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) {
    source instanceof RemoteFlowSource
  }
  predicate isSink(DataFlow::Node sink) {
    exists(DataFlow::CallNode call |
      call.getTarget().hasQualifiedName("os/exec", "Command") and
      sink = call.getAnArgument()
    )
  }
  predicate isBarrier(DataFlow::Node node) {
    node = any(SanitizationCall c).getResult()
  }
}

module MyFlow = TaintTracking::Global<MyConfig>;

from DataFlow::Node source, DataFlow::Node sink
where MyFlow::flow(source, sink)
select sink, "Untrusted data flows to command execution"
```

#### Step 6: Rename Predicates

- **`isSanitizer`** → **`isBarrier`**: Change method name only, logic unchanged
- **`isAdditionalTaintStep`** → **`isAdditionalFlowStep`**: Change method name only

#### Step 7: Update Flow Queries

Replace `cfg.hasFlow(source, sink)` with `MyFlow::flow(source, sink)`:

- Remove configuration variable from `from` clause
- Use module flow predicate directly

### Phase 4: Handle Go-Specific Migration Patterns

#### Step 8: AST-to-IR Node Conversions

Ensure proper node type handling:

```ql
// v1 and v2 both support these conversions
DataFlow::Node n;
Expr e = n.asExpr();              // AST expression
Instruction i = n.asInstruction(); // IR instruction
Parameter p = n.asParameter();     // Function parameter
```

#### Step 9: Go RemoteFlowSource Usage

`RemoteFlowSource` works identically in v1 and v2:

```ql
predicate isSource(DataFlow::Node source) {
  source instanceof RemoteFlowSource or
  source.asExpr().(CallExpr).getTarget().hasQualifiedName("os", "Getenv") or
  // In Go, main function is in package main with empty qualifier
  source.asParameter().getFunction().hasQualifiedName("", "main")
}
```

#### Step 10: Channel and Goroutine Flow

For concurrent flow patterns, ensure proper tracking:

```ql
predicate isAdditionalFlowStep(DataFlow::Node n1, DataFlow::Node n2) {
  // Basic channel send → receive flow
  // Note: This is a simplified example for unbuffered channels.
  // Complex scenarios (buffered channels, select statements, channel closures)
  // require more sophisticated tracking.
  exists(SendStmt send, RecvExpr recv |
    n1.asExpr() = send.getValue() and
    n2.asExpr() = recv and
    send.getChannel() = recv.getChannel()
  )
}
```

### Phase 5: Validate Equivalence Through Testing

#### Step 11: Compile Migrated Query

Use `codeql_query_compile` to check for errors:

```json
{
  "queryPath": "<query-pack>/src/{QueryName}/{QueryName}.ql",
  "searchPath": ["<query-pack>"]
}
```

Fix any compilation errors before testing.

#### Step 12: Run Tests and Compare Results

Use `codeql_test_run` on migrated query:

```json
{
  "testPath": "<query-pack>/test/{QueryName}",
  "searchPath": ["<query-pack>"]
}
```

**Critical**: Results MUST match baseline from Phase 1.

#### Step 13: Verify Result Equivalence

Compare results line-by-line:

```bash
diff <query-pack>/test/{QueryName}/{QueryName}.expected.v1-baseline \
     <query-pack>/test/{QueryName}/{QueryName}.expected
```

**Success**: Empty diff (identical results)
**Failure**: Any differences require investigation and fixes

### Phase 6: Expand Test Coverage (Optional)

If baseline tests pass, add more test cases to ensure robustness:

#### Step 14: Add Edge Case Tests

Create additional test files covering:

- Complex goroutine data sharing patterns
- Interface type assertions and conversions
- Error handling flow patterns (ignored errors, wrapped errors)
- Stdlib sink variations (`exec.CommandContext`, `sql.Prepare`)
- Channel-based concurrent flows

For each new test:

1. Add test code to `Example2.go`, `Example3.go`, etc.
2. Update `.expected` file with anticipated results
3. Re-extract test database with `codeql_test_extract`
4. Run tests to verify

### Phase 7: Performance Validation

#### Step 15: Check Query Performance

Run query on realistic database and monitor performance:

```json
{
  "query": "<query-pack>/src/{QueryName}/{QueryName}.ql",
  "database": "<path-to-realistic-go-database>",
  "searchPath": ["<query-pack>"]
}
```

If performance degrades significantly, consider:

- Caching expensive predicates with `cached`
- Using local flow instead of global flow where possible
- Limiting scope with additional constraints

### Phase 8: Finalize Migration

#### Step 16: Update Query Metadata

Ensure query metadata reflects v2 API usage:

```ql
/**
 * @name Command Injection via Untrusted Data
 * @description Executes system commands with user-controllable data
 * @kind path-problem
 * @id go/command-injection
 * @tags security
 */

import go
import DataFlow::PathGraph
```

#### Step 17: Clean Up and Document

- Remove v1 baseline files after verification
- Add migration notes in query comments if helpful
- Format query with `codeql_query_format`

## Go-Specific Dataflow Considerations

### Error Handling Patterns

Go's explicit error handling affects dataflow:

```ql
// Track flows through error-returning functions
predicate isAdditionalFlowStep(DataFlow::Node n1, DataFlow::Node n2) {
  exists(CallExpr call, DataFlow::ResultNode result |
    n1 = call.getAnArgument() and
    n2 = result and
    result.getCall() = call and
    // Function returns (value, error) pair - track the value (index 0)
    call.getType() instanceof TupleType and
    result.hasResultIndex(0)
  )
}
```

### Interface Type Flows

Track flows through interface conversions:

```ql
predicate isAdditionalFlowStep(DataFlow::Node n1, DataFlow::Node n2) {
  exists(TypeAssertExpr assertion |
    n1.asExpr() = assertion.getExpr() and
    n2.asExpr() = assertion
  )
}
```

### Pointer Dereferences

Track flows through pointer operations:

```ql
predicate isAdditionalFlowStep(DataFlow::Node n1, DataFlow::Node n2) {
  exists(StarExpr deref |
    n1.asExpr() = deref.getBase() and
    n2.asExpr() = deref
  )
}
```

## MCP Tools Reference

- **`codeql_test_run`**: Run tests and compare with expected results
- **`codeql_test_extract`**: Extract test databases from Go source code
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

✅ **Do:**

- Establish test baseline BEFORE any changes
- Make purely mechanical API changes first
- Verify exact result equivalence after migration
- Keep v1 baseline for comparison during migration
- Test edge cases specific to Go (goroutines, channels, interfaces)
- Document any intentional behavior changes separately

## Troubleshooting Non-Equivalent Results

If results differ after migration:

1. **Check node type conversions**: Ensure `asExpr()`, `asInstruction()` usage is correct
2. **Verify predicate renames**: Confirm `isBarrier` vs `isSanitizer` logic is identical
3. **Review flow predicates**: Check `isAdditionalFlowStep` mirrors `isAdditionalTaintStep`
4. **Inspect missing results**: Use `MyFlow::flow(source, sink)` for debugging partial flows
5. **Debug with partial flow**: Use flow exploration to find missing edges

## Documentation References

- [New dataflow API for writing custom CodeQL queries](https://github.blog/changelog/2023-08-14-new-dataflow-api-for-writing-custom-codeql-queries/) - Official v2 API announcement
- [Analyzing data flow in Go](https://codeql.github.com/docs/codeql-language-guides/analyzing-data-flow-in-go/) - Go dataflow guide
- [CodeQL Go Library Reference](https://codeql.github.com/codeql-standard-libraries/go/) - Standard library documentation

## Related Resources

- [Create CodeQL Query TDD Generic](../create-codeql-query-tdd-generic/SKILL.md) - TDD workflow for queries
- [QSpec Reference for Go](../../../server/src/resources/qspec-reference-go.md) - Go-specific QSpec patterns
- [Go Query Development Prompts](../../../.github/prompts/generate-qspec-go.prompt.md) - Go query guidance

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
- ✅ Go-specific patterns (goroutines, channels, errors) handled correctly
