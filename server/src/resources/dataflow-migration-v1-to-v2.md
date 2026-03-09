# Dataflow API Migration: v1 to v2

Guide for migrating CodeQL queries from the legacy v1 (class-based) dataflow API to the modern v2 (module-based) shared dataflow API. This applies to all supported languages.

## Why Migrate

The v1 `DataFlow::Configuration` class-based API is deprecated. The v2 `DataFlow::ConfigSig` module-based API is the current standard across all languages. Queries using v1 will eventually stop compiling as the legacy API is removed.

## API Changes Summary

| v1 (Legacy)                                      | v2 (Modern)                                      | Notes                                   |
| ------------------------------------------------ | ------------------------------------------------ | --------------------------------------- |
| `class MyConfig extends DataFlow::Configuration` | `module MyConfig implements DataFlow::ConfigSig` | Module-based, not class-based           |
| `MyConfig() { this = "MyConfig" }`               | _(removed)_                                      | No constructor needed                   |
| `override predicate isSanitizer(...)`            | `predicate isBarrier(...)`                       | Renamed                                 |
| `override predicate isAdditionalTaintStep(...)`  | `predicate isAdditionalFlowStep(...)`            | Renamed                                 |
| `config.hasFlowPath(source, sink)`               | `MyFlow::flowPath(source, sink)`                 | Module-level predicate                  |
| `DataFlow::PathNode`                             | `MyFlow::PathNode`                               | Path nodes scoped to flow module        |
| `isSanitizerGuard`                               | _(removed — use `isBarrier` with guard logic)_   | Fold guard into barrier                 |
| `FlowLabel` (JS)                                 | `FlowState`                                      | Renamed; use `DataFlow::StateConfigSig` |

## v1 Pattern

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

## v2 Pattern

```ql
module MyConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) { ... }
  predicate isSink(DataFlow::Node sink) { ... }
  predicate isBarrier(DataFlow::Node node) { ... }
  predicate isAdditionalFlowStep(DataFlow::Node n1, DataFlow::Node n2) { ... }
}

module MyFlow = TaintTracking::Global<MyConfig>;
import MyFlow::PathGraph

from MyFlow::PathNode source, MyFlow::PathNode sink
where MyFlow::flowPath(source, sink)
select sink.getNode(), source, sink, "Message"
```

## Migration Workflow

1. **Capture baseline**: Run `codeql_test_run` on existing tests and save current `.expected` files
2. **Rewrite config**: Replace the `class extends Configuration` with `module implements ConfigSig`, rename predicates per the table above
3. **Instantiate module**: Add `module MyFlow = TaintTracking::Global<MyConfig>;` (or `DataFlow::Global<MyConfig>` for pure data flow)
4. **Update select clause**: Replace `config.hasFlowPath(source, sink)` with `MyFlow::flowPath(source, sink)` and `DataFlow::PathNode` with `MyFlow::PathNode`
5. **Handle flow state**: If the query uses `FlowLabel` (JS) or state-sensitive predicates, switch to `DataFlow::StateConfigSig` and `TaintTracking::GlobalWithState<MyConfig>`
6. **Compile**: Run `codeql_query_compile` to catch syntax errors
7. **Test**: Run `codeql_test_run` and verify results match the v1 baseline exactly
8. **Accept**: Once equivalent, run `codeql_test_accept` to finalize

## Language-Specific Notes

### C/C++

- Import paths stay the same (`semmle.code.cpp.dataflow.TaintTracking`); only the API usage changes.
- Pointer indirection: use `asIndirectExpr()` in `isAdditionalFlowStep` to track through dereferences.
- Track `std::move` operations as additional flow steps when relevant.
- `IndirectParameterNode` usage is unchanged between v1 and v2.

### C\#

- Use `semmle.code.csharp.dataflow.TaintTracking` (same import for v1 and v2).
- `LibraryTypeDataFlow` extensions for custom library flow are unchanged.
- Test LINQ, async/await, and property accessor patterns — these can surface subtle differences.
- ASP.NET `[FromBody]`/`[FromQuery]` parameter annotations work identically.

### Go

- Node types (`ExprNode`, `ParameterNode`, `InstructionNode`) and AST/IR conversions (`asExpr()`, `asInstruction()`) are unchanged.
- `RemoteFlowSource` and `UntrustedFlowSource` work identically in v2.
- Channel send/receive and goroutine flow require `isAdditionalFlowStep`; these patterns are unchanged.
- Error-handling tuples: use `ResultNode` with `hasResultIndex(0)` for the value element.
- Interface type assertions (`TypeAssertExpr`) need explicit flow steps.

### Java / Kotlin

- `InstanceParameterNode` (implicit `this`) is unchanged.
- Spring `@RequestParam`/`@PathVariable`/`@RequestBody` annotations work identically.
- Stream/lambda/method-reference flows and boxing/unboxing steps carry over directly.
- Kotlin `when` expressions and extension function receiver flow require explicit `isAdditionalFlowStep`.

### JavaScript / TypeScript

- **Flow labels → Flow states**: If the v1 query uses `FlowLabel`, switch to `DataFlow::StateConfigSig` with `class FlowState = string;` and `TaintTracking::GlobalWithState<MyConfig>`.
- **Sanitizer guards → Barrier guards**: `isSanitizerGuard` becomes `isBarrierGuard` with `DataFlow::BarrierGuard`.
- **Behavioral changes**: v2 taint steps propagate all flow states (not just `taint`). Jump steps across function boundaries (callbacks, Promises) may behave differently — watch for new or missing results.
- Promise `.then()` and async/await flow, prototype pollution via `Object.assign`/spread, and module import/export flow are unchanged.

### Python

- Python has multiple dataflow nodes per expression due to CFG splitting. This behavior is identical in v2.
- `CfgNode` / `CallCfgNode` / `getCfgNode()` conversions are unchanged.
- API graph navigation (`API::moduleImport("pkg").getMember(...)`) is unchanged.
- Django ORM, Flask routing, and FastAPI dependency injection patterns carry over directly.

### Ruby

- `asExpr()` returns `CfgNodes::ExprCfgNode` (CFG node, not AST). Use `.getExpr()` to get the AST node. This is unchanged between v1 and v2.
- Rails `params`, ActiveRecord queries, and metaprogramming (`send`, `define_method`, `eval`) patterns carry over directly.
- String interpolation and block/lambda flows are unchanged.

### Swift

- Import paths differ from other languages: `codeql.swift.dataflow.DataFlow`, `codeql.swift.dataflow.TaintTracking`, `codeql.swift.dataflow.FlowSources`.
- Unique node types: `PatternNode`, `CaptureNode`, `InoutReturnNode`, `SsaDefinitionNode`.
- `RemoteFlowSource` and `LocalFlowSource` from `codeql.swift.dataflow.FlowSources` work identically.
- Requires macOS with Xcode for test extraction. Supports Swift 5.4–6.2.

## Critical: Result Equivalence

Migrated queries **must** produce identical results to the v1 version. Differences indicate a semantic change in the migration. Common causes:

- **Barrier scope**: v2 barriers block all flow states; v1 sanitizers may have been state-specific
- **Additional flow steps**: v2 uses `isAdditionalFlowStep` for both data flow and taint; v1 had separate `isAdditionalTaintStep`
- **Jump steps** (JS): Taint propagation across function boundaries may differ
