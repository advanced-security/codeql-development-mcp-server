# Test-Driven Development for CodeQL Queries

This resource explains the theory and value of test-driven development (TDD) for CodeQL queries, and how the MCP server's tools and prompts support the TDD workflow. It is a conceptual overview — for step-by-step guided workflows, use the `test_driven_development`, `ql_tdd_basic`, or `ql_tdd_advanced` prompts.

## Why TDD for CodeQL?

CodeQL queries are programs that search for patterns in source code. Like any program, they can have bugs: false positives (flagging safe code), false negatives (missing vulnerable code), and runtime performance issues. TDD addresses all three by establishing a feedback loop between expected and actual behavior.

### Why TDD Makes LLMs More Effective

LLMs generating CodeQL queries face two challenges:

1. **Syntactic correctness** — QL has unique syntax (classes, predicates, `exists`, aggregates) that differs from mainstream languages. Compilation via `codeql_query_compile` catches syntax errors early.
2. **Semantic correctness** — A query that compiles may still produce wrong results. Test cases with `.expected` files provide ground truth that the LLM can compare against, enabling iterative refinement.

TDD provides the LLM with a concrete, automated signal (tests pass / tests fail) at every iteration, replacing guesswork with evidence. This is especially valuable for data flow and taint tracking queries where the correctness of source/sink/sanitizer definitions can only be verified by running the query against representative code.

## The TDD Cycle

```text
┌──────────────────┐
│  1. Write Tests  │ ← Define expected behavior through test cases
└────────┬─────────┘
         ▼
┌──────────────────┐
│  2. Run (Red)    │ ← Verify tests fail (no query logic yet)
└────────┬─────────┘
         ▼
┌──────────────────┐
│  3. Implement    │ ← Write minimal query logic to pass tests
└────────┬─────────┘
         ▼
┌──────────────────┐
│  4. Run (Green)  │ ← Verify tests pass
└────────┬─────────┘
         ▼
┌──────────────────┐
│  5. Refactor     │ ← Improve query while keeping tests green
└────────┬─────────┘
         ▼
┌──────────────────┐
│  6. Repeat       │ ← Add more tests for additional scenarios
└──────────────────┘
```

## The Value of AST Data in Test Code

A critical step in the TDD workflow is running `PrintAST` on test source code before writing the query. The AST output reveals how the CodeQL database represents the test code — which QL classes correspond to which source constructs, and which predicates are available for matching.

Without AST data, the LLM must guess which classes and predicates to use, leading to trial-and-error. With AST data, the LLM can:

- **Map source patterns to QL classes**: See exactly which QL class represents a `for` loop, a method call, or an assignment
- **Discover available predicates**: Learn what methods are available on each AST node type
- **Write precise `from`/`where` clauses**: Use the correct class names and predicate calls from the start

Use `codeql_query_run` with `queryName="PrintAST"` to generate AST data for test source files. The `ql_tdd_advanced` prompt guides this step in detail.

## MCP Tools for TDD

| Step         | Tool                                  | Purpose                                              |
| ------------ | ------------------------------------- | ---------------------------------------------------- |
| Scaffold     | `create_codeql_query`                 | Generate query, test, and `.qlref` files             |
| Dependencies | `codeql_pack_install`                 | Install pack dependencies for src and test packs     |
| Extract      | `codeql_test_extract`                 | Create a test database from test source files        |
| AST Analysis | `codeql_query_run` (PrintAST)         | Understand test code structure via AST               |
| CFG Analysis | `codeql_query_run` (PrintCFG)         | Understand control flow (advanced)                   |
| Call Graph   | `codeql_query_run` (CallGraphFrom/To) | Trace call relationships (advanced)                  |
| Compile      | `codeql_query_compile`                | Validate query syntax before testing                 |
| Test         | `codeql_test_run`                     | Run tests and compare against `.expected`            |
| Accept       | `codeql_test_accept`                  | Update `.expected` when results are verified correct |
| Profile      | `profile_codeql_query_from_logs`      | Analyze query performance from evaluator logs        |
| Format       | `codeql_query_format`                 | Auto-format query source code                        |
| Metadata     | `codeql_resolve_metadata`             | Validate query metadata annotations                  |

## MCP Prompts for TDD

| Prompt                    | When to Use                                                |
| ------------------------- | ---------------------------------------------------------- |
| `test_driven_development` | End-to-end TDD workflow with required `language` parameter |
| `ql_tdd_basic`            | Standalone TDD checklist (all parameters optional)         |
| `ql_tdd_advanced`         | Extended TDD with AST/CFG/call graph analysis              |
| `tools_query_workflow`    | Focused exploration of code structure via tool queries     |
| `explain_codeql_query`    | Understand an existing query's logic before modifying it   |

## Writing Effective Test Cases

### Structure

Each test directory contains:

- **Test source code** (e.g., `test.js`) — code that the query will analyze
- **`.qlref` file** — points to the query being tested
- **`.expected` file** — the expected query output

### Best Practices

1. **Include both positive and negative cases**: Write code that should trigger the query (vulnerable patterns) and code that should not (safe patterns)
2. **Start simple**: Begin with the most obvious positive and negative cases, then add edge cases
3. **Use realistic code**: Test against code patterns that occur in real-world projects
4. **One concept per test directory**: Each test should verify one specific behavior
5. **Document intent**: Use comments in test code to explain why each case should or should not match

### Example Test Structure

```text
test/SqlInjection/
├── SqlInjection.qlref       # Points to src/SqlInjection/SqlInjection.ql
├── test.py                  # Test source code
└── SqlInjection.expected    # Expected results
```

The `.expected` file contains one line per query result, matching the `select` clause output.

## Related Resources

- `codeql://server/overview` — MCP server orientation and quick-start guide
- `codeql://learning/query-basics` — Query structure, metadata, and compilation reference
- `codeql://server/tools` — Complete tool reference
- `codeql://templates/security` — Security query templates with TDD workflow
- `codeql://patterns/performance` — Performance profiling tools
- `codeql://languages/{language}/ast` — Language-specific AST class reference
- `codeql://languages/{language}/security` — Language-specific security patterns
