# Writing CodeQL Queries

This resource is a practical reference for writing CodeQL queries using the MCP server's tools. It covers query structure, metadata annotations, common QL patterns, compilation, testing, and the file conventions used by the CodeQL test framework.

## Query Structure

Every CodeQL query has three main clauses:

```ql
/**
 * @name Descriptive name of what the query finds
 * @description Longer explanation of the vulnerability or pattern
 * @kind problem
 * @problem.severity warning
 * @precision medium
 * @id lang/query-id
 * @tags security
 *       correctness
 */

import language

from SourceType source, SinkType sink
where <conditions linking source to sink>
select <result expression>, <message string>
```

### `from` Clause

Declares typed variables. Each variable ranges over all values of its type in the database:

```ql
from Function f, FunctionCall call
```

### `where` Clause

Filters the cross-product of `from` variables using predicates:

```ql
where call.getTarget() = f
  and f.getName() = "eval"
```

### `select` Clause

Defines the output columns. The first expression is the "element" (the location in source code), followed by a message string:

```ql
select call, "Call to dangerous function " + f.getName()
```

## Metadata Annotations

Metadata goes in a QLDoc comment block (`/** ... */`) at the top of the query file:

| Annotation           | Required                     | Description                                                  |
| -------------------- | ---------------------------- | ------------------------------------------------------------ |
| `@name`              | Yes                          | Short human-readable name                                    |
| `@description`       | Yes                          | Explanation of the query's purpose                           |
| `@kind`              | Yes                          | Output format: `problem`, `path-problem`, `table`, `graph`   |
| `@id`                | Yes                          | Unique identifier (e.g., `js/sql-injection`)                 |
| `@problem.severity`  | For `problem`/`path-problem` | `error`, `warning`, or `recommendation`                      |
| `@security-severity` | For security queries         | CVSS score (e.g., `8.8`)                                     |
| `@precision`         | Recommended                  | `very-high`, `high`, `medium`, or `low`                      |
| `@tags`              | Recommended                  | Categories like `security`, `correctness`, `maintainability` |

Use `codeql_resolve_metadata` to extract and validate a query's metadata.

## Common `@kind` Values

- **`problem`** — Reports a single location with a message. Use `select element, message`.
- **`path-problem`** — Reports a source-to-sink data flow path. Requires a `PathGraph` import and `select sink, source, sink, message`.
- **`table`** — Generic tabular output (no alert interpretation).
- **`graph`** — Structural output (AST, CFG, call graphs). Used by `PrintAST`, `PrintCFG`, `CallGraphFrom`, `CallGraphTo` tool queries.

## Common QL Patterns

### Predicate Definition

```ql
predicate isUserInput(DataFlow::Node node) {
  exists(Parameter p | p = node.asParameter() |
    p.getFunction().isPublic()
  )
}
```

### Class Definition

```ql
class DangerousCall extends MethodCall {
  DangerousCall() {
    this.getMethodName() = ["exec", "eval", "system"]
  }
}
```

### Existential Quantifier (`exists`)

```ql
where exists(Assignment a | a.getLhs() = var and a.getRhs() instanceof NullLiteral)
```

### Aggregates

```ql
select f, count(FunctionCall call | call.getTarget() = f) as callCount
  order by callCount desc
```

## Taint Tracking / Data Flow Configuration (v2 API)

```ql
module MyFlowConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) {
    // define sources
  }

  predicate isSink(DataFlow::Node sink) {
    // define sinks
  }

  predicate isBarrier(DataFlow::Node node) {
    // define sanitizers (optional)
  }
}

module MyFlow = TaintTracking::Global<MyFlowConfig>;
```

## Query Compilation and Validation

Use these tools to validate queries at different fidelity levels:

| Tool                     | Speed   | Fidelity           | When to Use                                                       |
| ------------------------ | ------- | ------------------ | ----------------------------------------------------------------- |
| `validate_codeql_query`  | Instant | Heuristic only     | Quick structure check (no compilation)                            |
| `codeql_query_compile`   | Fast    | Full compilation   | Syntax and type checking                                          |
| `codeql_lsp_diagnostics` | Fast    | Full (single file) | Real-time validation during editing (cannot resolve pack imports) |

Typical workflow:

1. `validate_codeql_query` — quick structural check
2. `codeql_query_compile` with `checkOnly: true` — full compilation
3. `codeql_lsp_diagnostics` — interactive feedback during editing

## Test File Conventions

CodeQL query tests use this directory layout:

```text
pack-root/
├── src/
│   ├── codeql-pack.yml          # Source pack
│   └── MyQuery/
│       └── MyQuery.ql           # The query
└── test/
    ├── codeql-pack.yml          # Test pack
    └── MyQuery/
        ├── MyQuery.qlref        # Points to ../../src/MyQuery/MyQuery.ql
        ├── test.js              # Test source code (language-appropriate)
        └── MyQuery.expected     # Expected query output
```

- **`.qlref` file**: Contains the relative path from the test pack's `src/` directory to the query file.
- **`.expected` file**: Contains the expected output of running the query against the test code. Use `codeql_test_accept` to generate or update this file.
- **Test source code**: Write code with both positive cases (should trigger the query) and negative cases (should not trigger).

### Running Tests

1. `codeql_test_run` — run tests and compare against `.expected` files
2. `codeql_test_accept` — update `.expected` files when results are verified correct
3. `codeql_resolve_tests` — discover and validate test structure

## Related Resources

- `codeql://server/overview` — MCP server orientation guide
- `codeql://server/tools` — Complete tool reference
- `codeql://templates/security` — Security query templates
- `codeql://learning/test-driven-development` — TDD workflow for CodeQL queries
