---
name: update-codeql-query-dataflow-ruby
description: Update CodeQL queries for Ruby from legacy v1 dataflow API to modern v2 shared dataflow API. Use this skill when migrating Ruby queries to use DataFlow::ConfigSig modules, ensuring query results remain equivalent through TDD.
---

# Update CodeQL Query Dataflow for Ruby

This skill guides you through migrating Ruby CodeQL queries from the legacy v1 (language-specific) dataflow API to the modern v2 (shared) dataflow API while ensuring query result equivalence.

## When to Use This Skill

- Migrating Ruby queries using deprecated `DataFlow::Configuration` classes
- Updating queries to use `DataFlow::ConfigSig` modules
- Modernizing Ruby queries to use the shared dataflow library
- Ensuring query result equivalence during dataflow API migration

## Prerequisites

- Existing Ruby CodeQL query using v1 dataflow API that you want to migrate
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

### Ruby-Specific Node Types

Ruby dataflow uses multiple node representations:

- **`ExprNode`**: AST expression nodes (method calls, literals)
- **`ParameterNode`**: Method parameter nodes
- **`CfgNodes::ExprCfgNode`**: Control-flow graph nodes (returned by `asExpr()`)
- **`LocalSourceNode`**: Local sources for API graph analysis
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

#### Step 4: Understand Ruby-Specific Flow

Identify how the query uses Ruby dataflow constructs:

- CFG node conversions (e.g., `asExpr()` returns `CfgNodes::ExprCfgNode`)
- `RemoteFlowSource` for user input (Rails `params`, HTTP requests)
- API graphs for tracking gem/framework usage (`codeql.ruby.ApiGraphs`)
- Ruby-specific sources: `ARGV`, `ENV`, Rails parameters, HTTP requests
- Ruby-specific sinks: `eval`, `send`, `system`, ActiveRecord queries

### Phase 3: Migrate to v2 API

#### Step 5: Convert Configuration Class to Module

**Before:**

```ql
class CommandInjectionConfig extends TaintTracking::Configuration {
  CommandInjectionConfig() { this = "CommandInjectionConfig" }

  override predicate isSource(DataFlow::Node source) {
    source instanceof RemoteFlowSource
  }

  override predicate isSink(DataFlow::Node sink) {
    exists(DataFlow::CallNode call |
      call.getMethodName() = "system" and
      sink = call.getAnArgument()
    )
  }

  override predicate isSanitizer(DataFlow::Node node) {
    node = any(ShellquoteCall c).getResult()
  }
}

from CommandInjectionConfig cfg, DataFlow::Node source, DataFlow::Node sink
where cfg.hasFlow(source, sink)
select sink, "Untrusted data flows to command execution"
```

**After:**

```ql
module CommandInjectionConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) {
    source instanceof RemoteFlowSource
  }

  predicate isSink(DataFlow::Node sink) {
    exists(DataFlow::CallNode call |
      call.getMethodName() = "system" and
      sink = call.getAnArgument()
    )
  }

  predicate isBarrier(DataFlow::Node node) {
    node = any(ShellquoteCall c).getResult()
  }
}

module CommandInjectionFlow = TaintTracking::Global<CommandInjectionConfig>;

from DataFlow::Node source, DataFlow::Node sink
where CommandInjectionFlow::flow(source, sink)
select sink, "Untrusted data flows to command execution"
```

#### Step 6: Rename Predicates

- **`isSanitizer`** → **`isBarrier`**: Change method name only, logic unchanged
- **`isAdditionalTaintStep`** → **`isAdditionalFlowStep`**: Change method name only

#### Step 7: Update Flow Queries

Replace `cfg.hasFlow(source, sink)` with `MyFlow::flow(source, sink)`:

- Remove configuration variable from `from` clause
- Use module flow predicate directly

### Phase 4: Handle Ruby-Specific Migration Patterns

#### Step 8: Control-Flow Node Conversions

Ruby's `asExpr()` returns `CfgNodes::ExprCfgNode`, not AST nodes:

```ql
// v1 and v2 both support these conversions
DataFlow::Node n;
CfgNodes::ExprCfgNode cfgExpr = n.asExpr();  // CFG expression, not AST
DataFlow::ParameterNode param = n.asParameter();  // Method parameter
```

To get AST nodes from CFG nodes:

```ql
Expr astExpr = cfgExpr.getExpr();  // Get underlying AST expression
```

#### Step 9: RemoteFlowSource Usage

`RemoteFlowSource` works identically in v1 and v2:

```ql
predicate isSource(DataFlow::Node source) {
  source instanceof RemoteFlowSource or
  // Rails parameters
  source.asExpr().getExpr().(MethodCall).getMethodName() = "params" or
  // Environment variables
  exists(ConstantReadAccess env |
    env.getExpr().(ConstRef).getName() = "ENV" and
    source.asExpr().getExpr() = env.getAMethodCall()
  ) or
  // Command line arguments
  exists(ConstantReadAccess argv |
    argv.getExpr().(ConstRef).getName() = "ARGV" and
    source.asExpr().getExpr() = argv
  )
}
```

#### Step 10: API Graph Integration

Use API graphs to track framework and gem usage. Example: Rails controller params via `API::getTopLevelMember("ActionController").getReturn("Base")...getReturn("params")`.

#### Step 11: Rails-Specific Patterns

Track flows through Rails: ActiveRecord mass assignment (`create`, `update`), ActionView render (`render` with `inline`), hash access (`[]`, `fetch`, `dig`).

#### Step 12: Metaprogramming Patterns

Track flows through dynamic features: `send`/`public_send`, `define_method`, `const_get`/`const_set`.

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

Add test cases for Rails features, gems (Sinatra, Grape), metaprogramming, string interpolation, blocks/lambdas, and hash/array flows. For each: add test code, update `.expected`, extract with `codeql_test_extract`, run tests.

### Phase 7: Performance Validation

Run query on realistic database. If performance degrades: cache expensive predicates, use local flow where possible, limit scope, optimize API graph queries.

### Phase 8: Finalize Migration

Update query metadata, remove v1 baseline files, add migration notes if needed, format with `codeql_query_format`.

## Ruby-Specific Dataflow Considerations

### Rails Framework Sources

Track user input in Rails applications:

```ql
predicate isSource(DataFlow::Node source) {
  // Controller parameters
  exists(DataFlow::CallNode params |
    params.getMethodName() = "params" and
    source = params.getAMethodCall()
  ) or
  // Request headers
  exists(DataFlow::CallNode request |
    request.getMethodName() = "request" and
    source = request.getAMethodCall("headers")
  ) or
  // Cookies
  exists(DataFlow::CallNode cookies |
    cookies.getMethodName() = "cookies" and
    source = cookies.getAMethodCall()
  )
}
```

### ActiveRecord Sinks

Track dangerous database operations:

```ql
predicate isSink(DataFlow::Node sink) {
  // Raw SQL execution
  exists(DataFlow::CallNode query |
    query.getMethodName() in ["find_by_sql", "execute", "exec_query"] and
    sink = query.getAnArgument()
  ) or
  // String interpolation in where clauses
  exists(DataFlow::CallNode where |
    where.getMethodName() = "where" and
    exists(StringInterpolation interp |
      sink.asExpr().getExpr() = interp and
      interp = where.getArgument(0).asExpr().getExpr()
    )
  )
}
```

### Code Execution via Metaprogramming

Track dynamic code execution:

```ql
predicate isSink(DataFlow::Node sink) {
  // eval family
  exists(DataFlow::CallNode evalCall |
    evalCall.getMethodName() in ["eval", "instance_eval", "class_eval", "module_eval"] and
    sink = evalCall.getArgument(0)
  ) or
  // send with dynamic method names
  exists(DataFlow::CallNode send |
    send.getMethodName() in ["send", "public_send"] and
    sink = send.getArgument(0)
  ) or
  // define_method with dynamic names
  exists(DataFlow::CallNode define |
    define.getMethodName() = "define_method" and
    sink = define.getArgument(0)
  )
}
```

### String Interpolation Flows

Track flows through string interpolation components and concatenation (`AddExpr`).

### Block and Lambda Flows

Track flows through block parameters and lambda/proc creation with `DataFlow::localFlow`.

### Gem-Specific Patterns

**Sinatra**: Route parameters via `regexpMatch("^(get|post|put|delete|patch)$")`, request object.
**Rack**: Middleware `call` method with env hash.

## MCP Tools Reference

- **`codeql_test_run`**: Run tests and compare with expected results
- **`codeql_test_extract`**: Extract test databases from Ruby source code
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
- Overlook Ruby-specific CFG node semantics (`asExpr()` returns CFG nodes)

✅ **Do:**

- Establish test baseline BEFORE any changes
- Make purely mechanical API changes first
- Verify exact result equivalence after migration
- Keep v1 baseline for comparison during migration
- Test edge cases specific to Ruby (metaprogramming, Rails, gems)
- Document any intentional behavior changes separately
- Understand difference between CFG nodes and AST nodes

## Troubleshooting Non-Equivalent Results

If results differ after migration:

1. **Check node type conversions**: Ensure `asExpr()` CFG semantics are correct
2. **Verify predicate renames**: Confirm `isBarrier` vs `isSanitizer` logic is identical
3. **Review flow predicates**: Check `isAdditionalFlowStep` mirrors `isAdditionalTaintStep`
4. **Inspect CFG vs AST confusion**: Use `.getExpr()` on CFG nodes to get AST nodes
5. **Debug with partial flow**: Use flow exploration to find missing edges
6. **Check API graph usage**: Ensure API graph predicates are correctly structured

## Documentation References

- [New dataflow API for writing custom CodeQL queries](https://github.blog/changelog/2023-08-14-new-dataflow-api-for-writing-custom-codeql-queries/) - Official v2 API announcement
- [Analyzing data flow in Ruby](https://codeql.github.com/docs/codeql-language-guides/analyzing-data-flow-in-ruby/) - Ruby dataflow guide
- [CodeQL Ruby Library Reference](https://codeql.github.com/codeql-standard-libraries/ruby/) - Standard library documentation

## Related Resources

- [Create CodeQL Query TDD Generic](../create-codeql-query-tdd-generic/SKILL.md) - TDD workflow for queries

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
- ✅ Ruby-specific patterns (metaprogramming, Rails, CFG nodes) handled correctly
