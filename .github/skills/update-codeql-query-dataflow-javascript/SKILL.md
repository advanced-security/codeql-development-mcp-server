---
name: update-codeql-query-dataflow-javascript
description: Update CodeQL queries for JavaScript and TypeScript from legacy v1 dataflow API to modern v2 shared dataflow API. Use this skill when migrating JavaScript/TypeScript queries to use DataFlow::ConfigSig modules, ensuring query results remain equivalent through TDD.
---

# Update CodeQL Query Dataflow for JavaScript/TypeScript

This skill guides you through migrating JavaScript/TypeScript CodeQL queries from the legacy v1 (language-specific) dataflow API to the modern v2 (shared) dataflow API while ensuring query results remain equivalent.

## When to Use This Skill

- Migrating JavaScript/TypeScript queries from `DataFlow::Configuration` to `DataFlow::ConfigSig` modules
- Updating queries to use the shared dataflow library (v2 API)
- Ensuring query result equivalence during dataflow API migration

## Critical: Query Result Equivalence via TDD

Migrated queries must produce **exact same results** as original queries. Result changes cause alert flapping, trust issues, and CI/CD disruption.

**JavaScript-specific behavioral changes** in v2:

- Taint steps propagate all flow states (not just `taint` label)
- Jump steps across function boundaries behave differently
- Barriers block all flows (even when tracked value is inside content)

**Use TDD with comprehensive unit tests** to ensure equivalence.

## Prerequisites

- Existing JavaScript/TypeScript query with v1 dataflow API and unit tests
- Access to CodeQL Development MCP Server tools

## Key Dataflow API Changes (v1 → v2)

### Configuration Class → Configuration Module

**v1 (Legacy):**

```ql
class MyConfig extends DataFlow::Configuration {
  MyConfig() { this = "MyConfig" }
  override predicate isSource(DataFlow::Node source, FlowLabel label) { ... }
  override predicate isSink(DataFlow::Node sink, FlowLabel label) { ... }
  override predicate isSanitizer(DataFlow::Node node) { ... }
  override predicate isAdditionalTaintStep(DataFlow::Node n1, DataFlow::Node n2) { ... }
}
```

**v2 (Modern):**

```ql
module MyConfig implements DataFlow::StateConfigSig {
  class FlowState = string;
  predicate isSource(DataFlow::Node source, FlowState state) { ... }
  predicate isSink(DataFlow::Node sink, FlowState state) { ... }
  predicate isBarrier(DataFlow::Node node) { ... }
  predicate isAdditionalFlowStep(DataFlow::Node n1, FlowState state1, DataFlow::Node n2, FlowState state2) { ... }
}

module MyFlow = TaintTracking::GlobalWithState<MyConfig>;
```

### Key Changes

| v1 API                       | v2 API                       |
| ---------------------------- | ---------------------------- |
| `DataFlow::Configuration`    | `DataFlow::ConfigSig`        |
| `FlowLabel`                  | `FlowState`                  |
| `isSanitizer`                | `isBarrier`                  |
| `isAdditionalTaintStep`      | `isAdditionalFlowStep`       |
| `this.hasFlow(source, sink)` | `MyFlow::flow(source, sink)` |
| `isSanitizerGuard`           | `isBarrierGuard`             |

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

Review for v1 API: `DataFlow::Configuration` classes, `FlowLabel`, `isSanitizer`, `isAdditionalTaintStep`, `isSanitizerGuard`, `this.hasFlow()`.

#### Step 4: Understand JavaScript-Specific Flow

Identify JavaScript constructs: HTTP/DOM sources, `eval`/`innerHTML` sinks, flow labels, Promise/async flows, prototype chains.

### Phase 3: Migrate to v2 API

#### Step 5: Convert Configuration Class to Module

**Before (v1 with FlowLabel):**

```ql
class XssConfig extends TaintTracking::Configuration {
  XssConfig() { this = "XssConfig" }

  override predicate isSource(DataFlow::Node source, FlowLabel label) {
    label = "taint" and
    source instanceof RemoteFlowSource
  }

  override predicate isSink(DataFlow::Node sink, FlowLabel label) {
    label = "taint" and
    exists(DOM::DomMethodCallExpr call |
      call.getMethodName() = "write" and
      sink = call.getAnArgument()
    )
  }

  override predicate isSanitizer(DataFlow::Node node) {
    node = any(SanitizationCall c).getResult()
  }
}

from XssConfig cfg, DataFlow::PathNode source, DataFlow::PathNode sink
where cfg.hasFlowPath(source, sink)
select sink.getNode(), source, sink, "XSS from $@", source.getNode(), "user input"
```

**After (v2 with FlowState):**

```ql
module XssConfig implements DataFlow::StateConfigSig {
  class FlowState = string;

  predicate isSource(DataFlow::Node source, FlowState state) {
    state = "taint" and
    source instanceof RemoteFlowSource
  }

  predicate isSink(DataFlow::Node sink, FlowState state) {
    state = "taint" and
    exists(DOM::DomMethodCallExpr call |
      call.getMethodName() = "write" and
      sink = call.getAnArgument()
    )
  }

  predicate isBarrier(DataFlow::Node node) {
    node = any(SanitizationCall c).getResult()
  }
}

module XssFlow = TaintTracking::GlobalWithState<XssConfig>;

from XssFlow::PathNode source, XssFlow::PathNode sink
where XssFlow::flowPath(source, sink)
select sink.getNode(), source, sink, "XSS from $@", source.getNode(), "user input"
```

#### Step 6: Migrate Flow Labels to Flow States

If the query doesn't use flow labels, use simpler `DataFlow::ConfigSig`:

```ql
module SimpleConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) { ... }
  predicate isSink(DataFlow::Node sink) { ... }
  predicate isBarrier(DataFlow::Node node) { ... }
}

module SimpleFlow = TaintTracking::Global<SimpleConfig>;
```

#### Step 7: Rename Predicates

- `isSanitizer` → `isBarrier` (logic unchanged)
- `isAdditionalTaintStep` → `isAdditionalFlowStep` (logic unchanged)
- `isSanitizerGuard` → `isBarrierGuard` (update signature)

#### Step 8: Update Barrier Guards

**v1:**

```ql
override predicate isSanitizerGuard(TaintTracking::SanitizerGuardNode guard) {
  guard instanceof WhitelistGuard
}
```

**v2:**

```ql
predicate isBarrierGuard(DataFlow::BarrierGuard guard) {
  guard instanceof WhitelistGuard
}
```

Use `DataFlow::MakeBarrierGuard` to create barrier guards:

```ql
class WhitelistGuard extends DataFlow::BarrierGuard {
  WhitelistGuard() {
    this = DataFlow::MakeBarrierGuard::equalityTest(_, _, _, true)
  }
  override predicate checks(Expr e, boolean branch) {
    // Define guard logic
  }
}
```

### Phase 4: Handle JavaScript-Specific Migration Patterns

#### Step 9: Promise and Async/Await Flow

Track flows through asynchronous operations:

```ql
predicate isAdditionalFlowStep(DataFlow::Node n1, DataFlow::Node n2) {
  // Promise.then() flow
  exists(DataFlow::MethodCallNode then |
    then.getMethodName() = "then" and
    n1 = then.getReceiver() and
    n2 = then.getCallback(0).getParameter(0)
  )
  or
  // async/await implicit flow
  exists(AwaitExpr await |
    n1.asExpr() = await.getOperand() and
    n2.asExpr() = await
  )
}
```

#### Step 10: DOM and Browser API Flow

Track flows through DOM operations:

```ql
predicate isSource(DataFlow::Node source) {
  // URL parameters
  source = DOM::locationSource("search").getALocalSource() or
  source = DOM::locationSource("hash").getALocalSource() or
  // localStorage/sessionStorage
  exists(DataFlow::CallNode storage |
    storage = DataFlow::globalVarRef(["localStorage", "sessionStorage"]).getAMethodCall("getItem") and
    source = storage
  )
}

predicate isSink(DataFlow::Node sink) {
  // innerHTML assignment
  exists(DataFlow::PropWrite write |
    write.getPropertyName() = "innerHTML" and
    sink = write.getRhs()
  )
  or
  // document.write
  exists(DataFlow::CallNode write |
    write = DataFlow::globalVarRef("document").getAMethodCall("write") and
    sink = write.getAnArgument()
  )
}
```

#### Step 11: Framework-Specific Patterns

**Express.js Sources:**

```ql
predicate isSource(DataFlow::Node source) {
  exists(Express::RouteHandler handler |
    source = handler.getARequestExpr(["params", "query", "body"])
  )
}
```

**React Sinks:**

```ql
predicate isSink(DataFlow::Node sink) {
  exists(DataFlow::PropWrite write |
    write.getPropertyName() = "dangerouslySetInnerHTML" and
    sink = write.getRhs().getAPropertyWrite("__html").getRhs()
  )
}
```

#### Step 12: Prototype Pollution Patterns

Track flows through prototype modifications:

```ql
predicate isAdditionalFlowStep(DataFlow::Node n1, DataFlow::Node n2) {
  // Object.assign flow
  exists(DataFlow::CallNode assign |
    assign = DataFlow::globalVarRef("Object").getAMethodCall("assign") and
    n1 = assign.getAnArgument() and
    n2 = assign
  )
  or
  // Spread operator flow
  exists(SpreadElement spread |
    n1.asExpr() = spread.getOperand() and
    n2.asExpr() = spread.getParent()
  )
}
```

#### Step 13: Module Import/Export Flow

Track flows through module boundaries:

```ql
predicate isAdditionalFlowStep(DataFlow::Node n1, DataFlow::Node n2) {
  // CommonJS require/exports
  exists(Module m |
    n1 = m.getAnExportedValue(_) and
    n2 = m.getAnImportedValue(_)
  )
  or
  // ES6 import/export
  exists(ImportDeclaration imp |
    n1 = imp.getImportedModule().getAnExportedValue(_) and
    n2 = imp.getASpecifier().getLocal().getAnAssignedValue()
  )
}
```

### Phase 5: Validate Equivalence Through Testing

#### Step 14: Compile Migrated Query

Use `codeql_query_compile` to check for errors:

```json
{
  "queryPath": "<query-pack>/src/{QueryName}/{QueryName}.ql",
  "searchPath": ["<query-pack>"]
}
```

Fix any compilation errors before testing.

#### Step 15: Run Tests and Compare Results

Use `codeql_test_run` on migrated query:

```json
{
  "testPath": "<query-pack>/test/{QueryName}",
  "searchPath": ["<query-pack>"]
}
```

**Critical**: Results MUST match baseline from Phase 1.

#### Step 16: Verify Result Equivalence

Compare results line-by-line:

```bash
diff <query-pack>/test/{QueryName}/{QueryName}.expected.v1-baseline \
     <query-pack>/test/{QueryName}/{QueryName}.expected
```

**Success**: Empty diff (identical results)
**Failure**: Any differences require investigation

### Phase 6: Handle Behavioral Differences

#### Step 17: Handle Behavioral Changes

**Taint propagation**: v2 propagates all flow states (not just `taint`). If new results: add state-specific steps, use barriers, update sources/sinks.

**Jump steps**: v2 handles cross-function boundaries differently. Review interprocedural flows, add flow steps, verify barriers if results differ.

### Phase 7: Testing, Performance & Finalization

#### Step 18: Add Edge Case Tests (Optional)

Cover: Promise chains, async/await, DOM manipulation, frameworks, prototype pollution, modules, TypeScript patterns.

### Phase 8: Performance & Finalization

#### Step 19-21: Validate, Update, Clean Up

- Run on realistic database; optimize if needed (cache predicates, use local flow)
- Update query metadata to reflect v2 API
- Remove v1 baseline files, format with `codeql_query_format`

## JavaScript/TypeScript-Specific Considerations

### Node.js Patterns

```ql
// Command injection sinks
predicate isSink(DataFlow::Node sink) {
  exists(SystemCommandExecution cmd |
    sink = cmd.getACommandArgument()
  )
}

// File system operations
predicate isSink(DataFlow::Node sink) {
  exists(FileSystemAccess fs |
    sink = fs.getAPathArgument()
  )
}
```

### TypeScript Type Guards

```ql
predicate isBarrierGuard(DataFlow::BarrierGuard guard) {
  guard instanceof TypeGuard
}

class TypeGuard extends DataFlow::BarrierGuard {
  TypeGuard() {
    this = any(TypeAssertion ta)
  }
  override predicate checks(Expr e, boolean branch) {
    // Define type guard logic
  }
}
```

### Client-Side Storage

```ql
predicate isSource(DataFlow::Node source) {
  // Cookies
  source = DOM::documentRef().getAPropertySource("cookie") or
  // Storage APIs
  exists(DataFlow::CallNode storage |
    storage.getReceiver() = DataFlow::globalVarRef(["localStorage", "sessionStorage"]) and
    storage.getCalleeName() = "getItem" and
    source = storage
  )
}
```

## MCP Tools Reference

- **`codeql_test_run`**: Run tests and compare with expected results
- **`codeql_test_extract`**: Extract test databases from JavaScript/TypeScript source code
- **`codeql_query_compile`**: Compile queries and check for errors
- **`codeql_query_run`**: Run queries for analysis
- **`codeql_bqrs_decode`**: Decode binary query results
- **`codeql_query_format`**: Format query files for consistency
- **`codeql_pack_install`**: Install query pack dependencies

## Common Pitfalls

❌ **Don't:**

- Skip baseline test establishment
- Change query logic alongside API migration
- Accept results without verifying equivalence
- Remove v1 baseline prematurely
- Ignore behavioral changes in taint propagation or flow labels/states

✅ **Do:**

- Establish test baseline BEFORE changes
- Make mechanical API changes first
- Verify exact result equivalence
- Test JavaScript patterns (async, promises, DOM, frameworks)
- Document intentional behavior changes

## Troubleshooting Non-Equivalent Results

If results differ after migration:

1. **Check flow state usage**: Ensure flow states match v1 flow labels
2. **Verify taint propagation**: Review if new results are due to all-state propagation
3. **Inspect barrier guards**: Confirm `isBarrierGuard` implementation matches v1 semantics
4. **Review jump steps**: Check interprocedural flows (callbacks, promises)
5. **Debug with partial flow**: Use flow exploration to find missing/new edges
6. **Check barrier behavior**: Verify barriers block appropriately (v2 blocks all flows including content)

## Documentation References

- [New dataflow API for writing custom CodeQL queries](https://github.blog/changelog/2023-08-14-new-dataflow-api-for-writing-custom-codeql-queries/) - Official v2 API announcement
- [Migrating JavaScript Dataflow Queries](https://codeql.github.com/docs/codeql-language-guides/migrating-javascript-dataflow-queries/) - JavaScript-specific migration guide
- [Analyzing data flow in JavaScript and TypeScript](https://codeql.github.com/docs/codeql-language-guides/analyzing-data-flow-in-javascript-and-typescript/) - JavaScript dataflow guide
- [CodeQL JavaScript Library Reference](https://codeql.github.com/codeql-standard-libraries/javascript/) - Standard library documentation

## Related Resources

- [Create CodeQL Query TDD Generic](../create-codeql-query-tdd-generic/SKILL.md) - TDD workflow for queries

## Success Criteria

Your dataflow migration is successful when:

- ✅ Test baseline established before migration
- ✅ Query compiles without errors using v2 API
- ✅ All configuration classes converted to modules
- ✅ All flow labels migrated to flow states (if applicable)
- ✅ All `isSanitizer` renamed to `isBarrier`
- ✅ All `isAdditionalTaintStep` renamed to `isAdditionalFlowStep`
- ✅ All `isSanitizerGuard` renamed to `isBarrierGuard` with updated signature
- ✅ All `cfg.hasFlow()` calls replaced with module flow predicates
- ✅ Test results EXACTLY match v1 baseline (zero diff) OR documented behavioral differences are understood and accepted
- ✅ No performance regressions
- ✅ Query metadata updated appropriately
- ✅ JavaScript/TypeScript-specific patterns (async/await, promises, DOM, frameworks) handled correctly
