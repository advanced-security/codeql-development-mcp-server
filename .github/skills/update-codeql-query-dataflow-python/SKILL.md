---
name: update-codeql-query-dataflow-python
description: Update CodeQL queries for Python from legacy v1 dataflow API to modern v2 shared dataflow API. Use this skill when migrating Python queries to use DataFlow::ConfigSig modules, ensuring query results remain equivalent through TDD.
---

# Update CodeQL Query Dataflow for Python

This skill guides you through migrating Python CodeQL queries from the legacy v1 (language-specific) dataflow API to the modern v2 (shared) dataflow API while ensuring query results remain equivalent.

## When to Use This Skill

- Migrating Python queries using deprecated `DataFlow::Configuration` or `TaintTracking::Configuration` classes
- Updating queries to use `DataFlow::ConfigSig` modules
- Modernizing Python queries to use the shared dataflow library
- Ensuring query result equivalence during dataflow API migration

## Prerequisites

- Existing Python CodeQL query using v1 dataflow API that you want to migrate
- Existing unit tests for the query
- Understanding of the query's detection purpose
- Access to CodeQL Development MCP Server tools

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

### Python-Specific Node Types

Python dataflow uses multiple node representations:

- **`ExprNode`**: AST expression nodes (function calls, attribute access)
- **`CfgNode`**: Control-flow graph nodes (more precise than AST)
- **`CallCfgNode`**: CFG nodes representing function/method calls
- **`ParameterNode`**: Function parameter nodes
- **`LocalSourceNode`**: API graph modeling for tracking method chains

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

#### Step 4: Understand Python-Specific Flow

Identify how the query uses Python dataflow constructs:

- **RemoteFlowSource**: Predefined sources for HTTP requests, user input
- **CFG vs AST nodes**: `getCfgNode()`, `asExpr()` conversions
- **API graphs**: `semmle.python.ApiGraphs` for library usage tracking
- **Python sources**: Django/Flask requests, `sys.argv`, `input()`, file operations
- **Python sinks**: `eval()`, `exec()`, `subprocess` calls, SQL operations

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
    exists(DataFlow::CallCfgNode call |
      call.getFunction().(DataFlow::AttrRead).getAttributeName() in ["system", "popen"] and
      call.getFunction().(DataFlow::AttrRead).getObject().asCfgNode().(NameNode).getId() = "os" and
      sink = call.getArg(0)
    )
  }

  override predicate isSanitizer(DataFlow::Node node) {
    node = any(SanitizationCall c).getResult()
  }
}

from CommandInjectionConfig cfg, DataFlow::PathNode source, DataFlow::PathNode sink
where cfg.hasFlowPath(source, sink)
select sink.getNode(), source, sink, "Command injection from $@", source.getNode(), "user input"
```

**After:**

```ql
module CommandInjectionConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) {
    source instanceof RemoteFlowSource
  }

  predicate isSink(DataFlow::Node sink) {
    exists(DataFlow::CallCfgNode call |
      call.getFunction().(DataFlow::AttrRead).getAttributeName() in ["system", "popen"] and
      call.getFunction().(DataFlow::AttrRead).getObject().asCfgNode().(NameNode).getId() = "os" and
      sink = call.getArg(0)
    )
  }

  predicate isBarrier(DataFlow::Node node) {
    node = any(SanitizationCall c).getResult()
  }
}

module CommandInjectionFlow = TaintTracking::Global<CommandInjectionConfig>;

from CommandInjectionFlow::PathNode source, CommandInjectionFlow::PathNode sink
where CommandInjectionFlow::flowPath(source, sink)
select sink.getNode(), source, sink, "Command injection from $@", source.getNode(), "user input"
```

#### Step 6: Rename Predicates

- **`isSanitizer`** → **`isBarrier`**: Change method name only, logic unchanged
- **`isAdditionalTaintStep`** → **`isAdditionalFlowStep`**: Change method name only

#### Step 7: Update Flow Queries

Replace `cfg.hasFlow(source, sink)` with `MyFlow::flow(source, sink)`:

- Remove configuration variable from `from` clause
- Use module flow predicate directly
- For path queries, use `MyFlow::PathNode` and `MyFlow::flowPath(source, sink)`

### Phase 4: Handle Python-Specific Migration Patterns

#### Step 8: CFG Node Conversions

Ensure proper node type handling with Python's multiple dataflow representations:

```ql
// v1 and v2 both support these conversions
DataFlow::Node n;
Expr e = n.asExpr();            // AST expression
CfgNode cfg = n.asCfgNode();    // CFG node
ControlFlowNode cfn = n.getCfgNode(); // Another way to get CFG node
```

**Important**: Python has multiple dataflow nodes per expression due to CFG splitting. The v2 API handles this identically to v1.

#### Step 9: RemoteFlowSource Usage

`RemoteFlowSource` works identically in v1 and v2:

```ql
predicate isSource(DataFlow::Node source) {
  source instanceof RemoteFlowSource or
  // Django request parameters
  exists(DataFlow::AttrRead attr |
    attr.getAttributeName() in ["GET", "POST", "FILES"] and
    attr.getObject().(DataFlow::ParameterNode).getParameter().getName() = "request" and
    source = attr
  ) or
  // Flask request access
  exists(DataFlow::ModuleVariableNode request |
    request.getName() = "request" and
    exists(DataFlow::AttrRead attr |
      attr.getObject() = request and
      attr.getAttributeName() in ["args", "form", "json", "files"] and
      source = attr
    )
  )
}
```

#### Step 10: API Graph Tracking

For tracking library usage patterns with API graphs:

```ql
predicate isAdditionalFlowStep(DataFlow::Node n1, DataFlow::Node n2) {
  // Track method chaining through API graphs
  exists(API::CallNode call |
    n1 = call.getArg(0) and
    n2 = call.getReturn()
  ) or
  // Track attribute reads
  exists(DataFlow::AttrRead attr |
    n1 = attr.getObject() and
    n2 = attr
  )
}
```

#### Step 11: Django ORM and Template Flows

Track flows through Django-specific constructs:

```ql
predicate isAdditionalFlowStep(DataFlow::Node n1, DataFlow::Node n2) {
  // Django QuerySet methods
  exists(DataFlow::CallCfgNode call |
    call.getFunction().(DataFlow::AttrRead).getAttributeName() in ["raw", "extra"] and
    n1 = call.getArg(_) and
    n2 = call
  ) or
  // Django template rendering
  exists(DataFlow::CallCfgNode render |
    render.getFunction().(DataFlow::AttrRead).getAttributeName() in ["render_template_string", "Template"] and
    n1 = render.getArg(_) and
    n2 = render
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

**Critical**: Results MUST match baseline from Phase 1.

#### Step 14: Verify Result Equivalence

Compare results line-by-line:

```bash
diff <query-pack>/test/{QueryName}/{QueryName}.expected.v1-baseline \
     <query-pack>/test/{QueryName}/{QueryName}.expected
```

**Success**: Empty diff (identical results)
**Failure**: Any differences require investigation and fixes

### Phase 6: Expand Test Coverage (Optional)

If baseline tests pass, add more test cases to ensure robustness:

#### Step 15: Add Edge Case Tests

Create additional test files covering:

- Django-specific patterns (ORM, templates, middleware)
- Flask route handlers and request processing
- FastAPI dependency injection and async operations
- Dynamic code execution (`eval()`, `exec()`, `compile()`)
- Attribute access patterns (`getattr`, `setattr`)
- Data science libraries (pandas, numpy operations with user input)

For each new test:

1. Add test code to `test2.py`, `test3.py`, etc.
2. Update `.expected` file with anticipated results
3. Re-extract test database with `codeql_test_extract`
4. Run tests to verify

### Phase 7: Performance Validation

#### Step 16: Check Query Performance

Run query on realistic database and monitor performance:

```json
{
  "query": "<query-pack>/src/{QueryName}/{QueryName}.ql",
  "database": "<path-to-realistic-python-database>",
  "searchPath": ["<query-pack>"]
}
```

If performance degrades significantly, consider:

- Caching expensive predicates with `cached`
- Using local flow instead of global flow where possible
- Limiting scope with additional constraints
- Leveraging API graphs more efficiently

### Phase 8: Finalize Migration

#### Step 17: Update Query Metadata

Ensure query metadata reflects v2 API usage:

```ql
/**
 * @name Command Injection via Untrusted Data
 * @description Executes system commands with user-controllable data
 * @kind path-problem
 * @id py/command-injection
 * @tags security external/cwe/cwe-078
 * @precision high
 */

import python
import semmle.python.dataflow.new.DataFlow
import semmle.python.dataflow.new.TaintTracking
import DataFlow::PathGraph
```

#### Step 18: Clean Up and Document

- Remove v1 baseline files after verification
- Add migration notes in query comments if helpful
- Format query with `codeql_query_format`

## Python-Specific Dataflow Considerations

### Web Framework Input Sources

#### Django Sources

```ql
predicate isSource(DataFlow::Node source) {
  // Django request object attributes
  exists(DataFlow::AttrRead attr |
    attr.getObject().(DataFlow::ParameterNode).getParameter().getName() = "request" and
    attr.getAttributeName() in ["GET", "POST", "FILES", "META", "COOKIES"] and
    source = attr
  ) or
  // Django form fields
  exists(DataFlow::CallCfgNode call |
    call.getFunction().(DataFlow::AttrRead).getAttributeName() = "cleaned_data" and
    source = call.getArg(_)
  )
}
```

#### Flask/FastAPI Sources

```ql
predicate isSource(DataFlow::Node source) {
  // Flask request object
  exists(API::Node request |
    request = API::moduleImport("flask").getMember("request") and
    source = request.getMember(["args", "form", "json", "files", "headers"]).getAUse()
  ) or
  // FastAPI path/query parameters via dependency injection
  exists(DataFlow::ParameterNode param |
    (param.getParameter().getAnnotation().toString().matches("%Path%") or
     param.getParameter().getAnnotation().toString().matches("%Query%")) and
    source = param
  )
}
```

### Code Execution Sinks

```ql
predicate isSink(DataFlow::Node sink) {
  // eval, exec, compile functions
  exists(DataFlow::CallCfgNode call |
    call.getFunction().asCfgNode().(NameNode).getId() in ["eval", "exec", "compile"] and
    sink = call.getArg(0)
  ) or
  // subprocess operations
  exists(API::CallNode call |
    call = API::moduleImport("subprocess").getMember(["run", "call", "Popen", "check_output"]).getACall() and
    sink = call.getArg(0)
  ) or
  // os.system and os.popen
  exists(API::CallNode call |
    call = API::moduleImport("os").getMember(["system", "popen"]).getACall() and
    sink = call.getArg(0)
  )
}
```

### SQL Injection in Python

```ql
predicate isSink(DataFlow::Node sink) {
  // Django raw SQL
  exists(DataFlow::CallCfgNode call |
    call.getFunction().(DataFlow::AttrRead).getAttributeName() in ["raw", "extra", "execute"] and
    sink = call.getArg(0)
  ) or
  // SQLAlchemy text() function
  exists(API::CallNode call |
    call = API::moduleImport("sqlalchemy").getMember("text").getACall() and
    sink = call.getArg(0)
  ) or
  // sqlite3 execute
  exists(API::CallNode call |
    call = API::moduleImport("sqlite3").getMember("Connection").getMember("execute").getACall() and
    sink = call.getArg(0)
  )
}
```

### Template Injection Patterns

```ql
predicate isSink(DataFlow::Node sink) {
  // Jinja2 Template constructor with string
  exists(API::CallNode call |
    call = API::moduleImport("jinja2").getMember("Template").getACall() and
    sink = call.getArg(0)
  ) or
  // Django render_template_string
  exists(DataFlow::CallCfgNode call |
    call.getFunction().asCfgNode().(NameNode).getId() = "render_template_string" and
    sink = call.getArg(0)
  ) or
  // Flask render_template_string
  exists(API::CallNode call |
    call = API::moduleImport("flask").getMember("render_template_string").getACall() and
    sink = call.getArg(0)
  )
}
```

### Pickle Deserialization

```ql
predicate isSink(DataFlow::Node sink) {
  // pickle.loads with untrusted data
  exists(API::CallNode call |
    call = API::moduleImport("pickle").getMember(["loads", "load", "Unpickler"]).getACall() and
    sink = call.getArg(0)
  )
}
```

## MCP Tools Reference

- **`codeql_test_run`**: Run tests and compare with expected results
- **`codeql_test_extract`**: Extract test databases from Python source code
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
- Forget to update imports (`import DataFlow::PathGraph`)
- Confuse CFG nodes and AST nodes in Python

✅ **Do:**

- Establish test baseline BEFORE any changes
- Make purely mechanical API changes first
- Verify exact result equivalence after migration
- Keep v1 baseline for comparison during migration
- Test edge cases specific to Python (dynamic typing, frameworks, CFG splitting)
- Document any intentional behavior changes separately
- Understand Python's multiple-nodes-per-expression model

## Troubleshooting Non-Equivalent Results

If results differ after migration:

1. **Check node type conversions**: Ensure `asExpr()`, `asCfgNode()`, `getCfgNode()` usage is correct
2. **Verify predicate renames**: Confirm `isBarrier` vs `isSanitizer` logic is identical
3. **Review flow predicates**: Check `isAdditionalFlowStep` mirrors `isAdditionalTaintStep`
4. **CFG splitting**: Understand Python's control-flow splits may create multiple nodes per expression
5. **Debug with partial flow**: Use flow exploration to find missing edges
6. **API graph issues**: Verify API graph usage patterns are correctly translated

## Documentation References

- [New dataflow API for writing custom CodeQL queries](https://github.blog/changelog/2023-08-14-new-dataflow-api-for-writing-custom-codeql-queries/) - Official v2 API announcement
- [Analyzing data flow in Python](https://codeql.github.com/docs/codeql-language-guides/analyzing-data-flow-in-python/) - Python dataflow guide
- [CodeQL Python Library Reference](https://codeql.github.com/codeql-standard-libraries/python/) - Standard library documentation

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
- ✅ Python-specific patterns (CFG nodes, API graphs, frameworks) handled correctly
