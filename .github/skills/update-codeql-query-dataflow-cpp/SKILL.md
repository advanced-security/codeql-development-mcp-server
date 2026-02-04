---
name: update-codeql-query-dataflow-cpp
description: Upgrade CodeQL queries from legacy (v1) language-specific dataflow library to the new (v2) shared dataflow API for C/C++. Use this skill when migrating C/C++ queries to the modular dataflow API while ensuring query result equivalence through test-driven development.
---

# Update CodeQL Query Dataflow for C/C++

This skill guides you through migrating CodeQL queries for C/C++ from the legacy v1 (language-specific) dataflow library to the v2 (shared, modular) dataflow API.

## When to Use This Skill

- Migrating C/C++ queries from `DataFlow::Configuration` to `DataFlow::ConfigSig`
- Updating to shared dataflow API (v2)
- Ensuring migrated queries produce identical results

## Critical Success Factor: Query Result Equivalence

**Most Important**: Migrated query must produce **exact same results** as original. Use **TDD with comprehensive unit tests** to guarantee equivalence.

## Prerequisites

- Existing C/C++ query using v1 dataflow API
- Comprehensive unit tests ([create-codeql-query-unit-test-cpp](../create-codeql-query-unit-test-cpp/SKILL.md))
- Access to CodeQL Development MCP Server tools

## Migration Overview: v1 to v2 API

### Key Differences

**v1 (Legacy) API:**

```ql
class MyConfig extends DataFlow::Configuration {
  MyConfig() { this = "MyConfig" }

  override predicate isSource(DataFlow::Node source) { ... }
  override predicate isSink(DataFlow::Node sink) { ... }
  override predicate isSanitizer(DataFlow::Node node) { ... }
  override predicate isAdditionalTaintStep(DataFlow::Node n1, DataFlow::Node n2) { ... }
}

from MyConfig config, DataFlow::PathNode source, DataFlow::PathNode sink
where config.hasFlowPath(source, sink)
select sink, source, sink, "Message"
```

**v2 (Modular) API:**

```ql
module MyConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) { ... }
  predicate isSink(DataFlow::Node sink) { ... }
  predicate isBarrier(DataFlow::Node node) { ... }
  predicate isAdditionalFlowStep(DataFlow::Node n1, DataFlow::Node n2) { ... }
}

module MyFlow = TaintTracking::Global<MyConfig>;

from MyFlow::PathNode source, MyFlow::PathNode sink
where MyFlow::flowPath(source, sink)
select sink, source, sink, "Message"
```

### API Changes Summary

| v1 API                             | v2 API                                 | Notes                               |
| ---------------------------------- | -------------------------------------- | ----------------------------------- |
| `DataFlow::Configuration` class    | `DataFlow::ConfigSig` signature module | Module-based instead of class-based |
| `isSanitizer` predicate            | `isBarrier` predicate                  | Renamed for clarity                 |
| `isAdditionalTaintStep`            | `isAdditionalFlowStep`                 | Renamed for consistency             |
| `config.hasFlowPath(source, sink)` | `MyFlow::flowPath(source, sink)`       | Module instantiation approach       |
| `DataFlow::PathNode`               | `MyFlow::PathNode`                     | Path nodes come from module         |

## C/C++-Specific Migration Patterns

### 1. Pointer Indirection Tracking

**v1 Approach:**

```ql
class MyConfig extends DataFlow::Configuration {
  override predicate isAdditionalTaintStep(DataFlow::Node n1, DataFlow::Node n2) {
    n2.asIndirectExpr() = n1.asExpr().(PointerDereferenceExpr)
  }
}
```

**v2 Approach:**

```ql
module MyConfig implements DataFlow::ConfigSig {
  predicate isAdditionalFlowStep(DataFlow::Node n1, DataFlow::Node n2) {
    exists(PointerDereferenceExpr deref |
      n1.asExpr() = deref and
      n2.asIndirectExpr() = deref
    )
  }
}
```

### 2. Indirect Parameter Nodes

**v1 Approach:**

```ql
override predicate isSource(DataFlow::Node source) {
  exists(Parameter p |
    p = source.asParameter() or
    source.(DataFlow::IndirectParameterNode).getParameter() = p
  )
}
```

**v2 Approach (No Change Needed):**

```ql
predicate isSource(DataFlow::Node source) {
  exists(Parameter p |
    p = source.asParameter() or
    source.(DataFlow::IndirectParameterNode).getParameter() = p
  )
}
```

### 3. Field Access Flow

**v1 Approach:**

```ql
override predicate isAdditionalTaintStep(DataFlow::Node n1, DataFlow::Node n2) {
  exists(FieldAccess fa |
    n1.asExpr() = fa.getQualifier() and
    n2.asExpr() = fa
  )
}
```

**v2 Approach:**

```ql
predicate isAdditionalFlowStep(DataFlow::Node n1, DataFlow::Node n2) {
  exists(FieldAccess fa |
    n1.asExpr() = fa.getQualifier() and
    n2.asExpr() = fa
  )
}
```

### 4. C++ Reference and Move Semantics

**v2 Enhanced Support:**

```ql
module MyConfig implements DataFlow::ConfigSig {
  predicate isAdditionalFlowStep(DataFlow::Node n1, DataFlow::Node n2) {
    // Track std::move operations
    exists(FunctionCall move |
      move.getTarget().hasQualifiedName("std", "move") and
      n1.asExpr() = move.getArgument(0) and
      n2.asExpr() = move
    )
  }
}
```

## Step-by-Step Migration Workflow

### Phase 1: Establish Test Baseline (TDD Foundation)

**Critical**: Ensure comprehensive test coverage before changing query code.

**Verify or create tests** in your query pack's test directory:

Use `codeql_test_run` to establish baseline. If tests missing, follow [create-codeql-query-unit-test-cpp](../create-codeql-query-unit-test-cpp/SKILL.md).

**Test coverage must include**: All sources, sinks, barriers, C++-specific features (pointers, references, templates), and edge cases.

### Phase 2: Backup and Prepare

Backup original: `cp {QueryName}.ql {QueryName}.ql.v1.backup`

Document current behavior: sources, sinks, sanitizers, custom steps, limitations.

### Phase 3: Migrate Query Code

#### Step 1: Update Imports

**Before (v1):**

```ql
import cpp
import semmle.code.cpp.dataflow.TaintTracking
```

**After (v2):**

```ql
import cpp
import semmle.code.cpp.dataflow.TaintTracking
```

**Note**: Import paths remain the same; API usage changes.

#### Step 2: Convert Configuration Class to Module

**Before (v1):**

```ql
class MyConfig extends DataFlow::Configuration {
  MyConfig() { this = "MyConfig" }

  override predicate isSource(DataFlow::Node source) {
    source.asExpr().(FunctionCall).getTarget().hasName("untrusted_input")
  }

  override predicate isSink(DataFlow::Node sink) {
    exists(FunctionCall fc |
      fc.getTarget().hasName("dangerous_operation") and
      sink.asExpr() = fc.getAnArgument()
    )
  }

  override predicate isSanitizer(DataFlow::Node node) {
    exists(FunctionCall sanitize |
      sanitize.getTarget().hasName("validate") and
      DataFlow::localFlow(DataFlow::exprNode(sanitize), node)
    )
  }
}
```

**After (v2):**

```ql
module MyConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) {
    source.asExpr().(FunctionCall).getTarget().hasName("untrusted_input")
  }

  predicate isSink(DataFlow::Node sink) {
    exists(FunctionCall fc |
      fc.getTarget().hasName("dangerous_operation") and
      sink.asExpr() = fc.getAnArgument()
    )
  }

  predicate isBarrier(DataFlow::Node node) {
    exists(FunctionCall sanitize |
      sanitize.getTarget().hasName("validate") and
      DataFlow::localFlow(DataFlow::exprNode(sanitize), node)
    )
  }
}
```

#### Step 3: Instantiate Flow Module

**After conversion, add:**

```ql
module MyFlow = TaintTracking::Global<MyConfig>;
```

**Or for pure data flow (not taint):**

```ql
module MyFlow = DataFlow::Global<MyConfig>;
```

**Choose based on original query:**

- Use `TaintTracking::Global` if original extended `TaintTracking::Configuration`
- Use `DataFlow::Global` if original extended `DataFlow::Configuration`

#### Step 4: Update Query Body

**Before (v1):**

```ql
from MyConfig config, DataFlow::PathNode source, DataFlow::PathNode sink
where config.hasFlowPath(source, sink)
select sink.getNode(), source, sink, "Unsafe data flow from $@ to $@",
  source.getNode(), "source", sink.getNode(), "sink"
```

**After (v2):**

```ql
from MyFlow::PathNode source, MyFlow::PathNode sink
where MyFlow::flowPath(source, sink)
select sink.getNode(), source, sink, "Unsafe data flow from $@ to $@",
  source.getNode(), "source", sink.getNode(), "sink"
```

#### Step 5: Rename Predicates

- `isSanitizer` → `isBarrier`
- `isAdditionalTaintStep` → `isAdditionalFlowStep`
- Remove constructor `MyConfig() { this = "..." }`

### Phase 4: Compile and Test

1. Compile: Use `codeql_query_compile`. Fix errors before proceeding.
2. Run tests: Use `codeql_test_run`
3. **Goal**: Tests pass with **identical results** to baseline
4. **If tests fail**: Compare actual vs expected, check sources/sinks/barriers/flow steps

### Phase 5: Debug Result Differences

**Common issues**: Missing results (check sources/sinks), extra results (check barriers), flow path differences.

**Debug tools**:

- PrintAST: Analyze AST structure with `codeql_query_run`
- Partial flow: Use `MyFlow::partialFlow(source, sink, _)` for missing paths
- Debug predicates: Add `select` statements to inspect intermediate results

### Phase 6: Refactor and Optimize

Once tests pass:

1. Extract helper predicates for clarity
2. Update QLDoc with migration note
3. Format with `codeql_query_format`

### Phase 7: Final Validation

1. Run all language tests with `codeql_test_run` (ensure no regressions)
2. Clean up: Remove backup file if successful

## Complete Migration Example

### Original v1 Query

```ql
/**
 * @name Null pointer dereference
 * @kind path-problem
 */

import cpp
import semmle.code.cpp.dataflow.TaintTracking

class NullFlowConfig extends TaintTracking::Configuration {
  NullFlowConfig() { this = "NullFlowConfig" }

  override predicate isSource(DataFlow::Node source) {
    source.asExpr() instanceof NullLiteral
  }

  override predicate isSink(DataFlow::Node sink) {
    exists(PointerDereferenceExpr deref |
      sink.asExpr() = deref.getOperand()
    )
  }

  override predicate isSanitizer(DataFlow::Node node) {
    exists(IfStmt check |
      check.getCondition().(ComparisonOperation).getAnOperand() = node.asExpr()
    )
  }
}

from NullFlowConfig config, DataFlow::PathNode source, DataFlow::PathNode sink
where config.hasFlowPath(source, sink)
select sink.getNode(), source, sink,
  "Potential null pointer dereference from $@", source.getNode(), "null value"
```

### Migrated v2 Query

```ql
/**
 * @name Null pointer dereference
 * @kind path-problem
 * @note Migrated to v2 modular dataflow API
 */

import cpp
import semmle.code.cpp.dataflow.TaintTracking

module NullFlowConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) {
    source.asExpr() instanceof NullLiteral
  }

  predicate isSink(DataFlow::Node sink) {
    exists(PointerDereferenceExpr deref |
      sink.asExpr() = deref.getOperand()
    )
  }

  predicate isBarrier(DataFlow::Node node) {
    exists(IfStmt check |
      check.getCondition().(ComparisonOperation).getAnOperand() = node.asExpr()
    )
  }
}

module NullFlow = TaintTracking::Global<NullFlowConfig>;

from NullFlow::PathNode source, NullFlow::PathNode sink
where NullFlow::flowPath(source, sink)
select sink.getNode(), source, sink,
  "Potential null pointer dereference from $@", source.getNode(), "null value"
```

## MCP Tools Used

This skill uses the following CodeQL Development MCP Server tools:

- **`codeql_test_extract`**: Extract test databases for baseline and validation
- **`codeql_test_run`**: Verify query results match expected baseline
- **`codeql_query_compile`**: Compile migrated query and check for errors
- **`codeql_query_format`**: Format query code for consistency
- **`codeql_query_run`**: Run PrintAST and debug queries for investigation
- **`codeql_bqrs_decode`**: Decode result files for analysis
- **`codeql_pack_install`**: Install dependencies for query and test packs

## Quality Checklist

Before considering your migration complete:

- [ ] Comprehensive test coverage exists for original query
- [ ] All tests pass with v1 query (baseline established)
- [ ] Query backed up before migration
- [ ] v1 Configuration class converted to v2 ConfigSig module
- [ ] Flow module instantiated (`TaintTracking::Global<Config>` or `DataFlow::Global<Config>`)
- [ ] `isSanitizer` renamed to `isBarrier`
- [ ] `isAdditionalTaintStep` renamed to `isAdditionalFlowStep`
- [ ] Constructor removed from configuration
- [ ] Query body updated to use module-based flow
- [ ] Migrated query compiles without errors
- [ ] All tests pass with v2 query (results identical to v1)
- [ ] No new false positives introduced
- [ ] No new false negatives introduced
- [ ] Query formatted with `codeql_query_format`
- [ ] QLDoc documentation updated
- [ ] Language-level tests pass (no regressions)

## Common Pitfalls

❌ **Don't:**

- Migrate without establishing test baseline first
- Accept different results without investigation
- Skip testing comprehensive source/sink/barrier coverage
- Ignore C++-specific dataflow patterns (pointers, references, indirection)
- Forget to update query body to use module-based flow
- Leave constructor in the configuration module

✅ **Do:**

- Use TDD approach with comprehensive tests
- Verify result equivalence before and after migration
- Test all C++ language features used in original query
- Debug result differences systematically
- Use MCP tools for validation at each step
- Keep backup of original query until migration verified

## Documentation References

- [New dataflow API for writing custom CodeQL queries](https://github.blog/changelog/2023-08-14-new-dataflow-api-for-writing-custom-codeql-queries/) - Official v2 API announcement
- [Analyzing data flow in C and C++](https://codeql.github.com/docs/codeql-language-guides/analyzing-data-flow-in-cpp/) - C/C++ dataflow guide
- [Advanced dataflow scenarios for C/C++](https://codeql.github.com/docs/codeql-language-guides/advanced-dataflow-scenarios-cpp/) - Advanced C/C++ patterns

## Related Skills

- [Create CodeQL Query TDD Generic](../create-codeql-query-tdd-generic/SKILL.md) - Test-driven development workflow
- [Create CodeQL Query Unit Test for C++](../create-codeql-query-unit-test-cpp/SKILL.md) - C++ unit testing guidance
- [Improve CodeQL Query Detection for C++](../improve-codeql-query-detection-cpp/SKILL.md) - Query improvement patterns

## Success Criteria

Your dataflow migration is successful when:

1. ✅ Comprehensive tests exist covering all query behaviors
2. ✅ Original query (v1) passes all tests (baseline)
3. ✅ Migrated query (v2) passes all tests (same results)
4. ✅ Query compiles without warnings
5. ✅ No false positives introduced
6. ✅ No false negatives introduced
7. ✅ Code is clean and well-documented
8. ✅ Performance is equivalent or better
9. ✅ All language-level tests pass
10. ✅ Query follows v2 API best practices
