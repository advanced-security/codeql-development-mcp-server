---
agent: agent
---

# Iterative CodeQL Development with LSP Tools

Use the MCP server tools from this prompt to iteratively develop and refine CodeQL queries using the LSP-powered tools.
These "iterative" tools work entirely through file paths and numeric positions.
Every operation is expressible as a tool call with explicit `file_path`, `line`, and `character` parameters.
Thus, this prompt can be used in any environment where the query files are on disk, and it does not require any special editor integration.

## Use This Prompt When

- Exploring unfamiliar CodeQL libraries to discover available classes and predicates
- Incrementally building a query clause-by-clause with real-time feedback
- Navigating from a type usage to its definition to understand its API
- Finding all usages of a predicate to learn patterns from existing queries
- Validating query fragments before assembling a complete query
- Debugging individual predicates by evaluating them in isolation against a database

## Prerequisites

1. A CodeQL pack with `codeql-pack.yml` on disk
2. Dependencies installed via `codeql_pack_install` (pointing at the pack directory)
3. Query files saved to disk (LSP tools operate on files, not inline strings)

## Key Concept: Positions Are File Path + Line + Character

All LSP tools identify locations using three values:

- `file_path`: absolute path to a `.ql` or `.qll` file
- `line`: **0-based** line number (line 1 in the file = `line: 0`)
- `character`: **0-based** column offset within that line

The `workspace_uri` parameter must point to the **pack root directory** (the folder
containing `codeql-pack.yml`) for import resolution to work. Without it, completions
and definitions for imported libraries will be empty.

> **Critical**: LSP line/character positions are 0-based, but `read_file`,
> `find_predicate_position`, and `find_class_position` return 1-based positions.
> Always subtract 1 when passing their output to LSP tools.

## Step 1: Discover Available Types with Completions

Use `codeql_lsp_completion` to explore what types and predicates are available at any
position in a query file. This replaces manual documentation browsing.

**Example**: To see what classes are available in a `from` clause after `import javascript`:

```text
Tool: codeql_lsp_completion
Parameters:
  file_path: /path/to/your/query.ql
  line: 9          # 0-based line of the `from` clause
  character: 5     # position after `from ` where you want completions
  workspace_uri: /path/to/pack-root   # directory containing codeql-pack.yml
```

Completions include class names with full documentation. For example, requesting
completions in a JavaScript query's `from` clause returns 150+ types like
`CallNode`, `PropWrite`, `RemoteFlowSource`, etc., each with docstrings.

**Exploring member predicates**: To see what methods a variable offers, request
completions after the dot. For example, if `pw` is typed as `DataFlow::PropWrite`,
requesting completions at the position after `pw.` returns all member predicates
like `getPropertyName()`, `getRhs()`, `getBase()`, `writes(base, prop, rhs)`,
each with full signature and documentation.

## Step 2: Navigate to Definitions

Use `codeql_lsp_definition` to find where a class, predicate, or module is defined.
This returns the file URI and line range of the definition — even into library pack
files you haven't opened.

```text
Tool: codeql_lsp_definition
Parameters:
  file_path: /path/to/your/query.ql
  line: 11         # 0-based line containing the symbol
  character: 30    # 0-based column within the symbol name
  workspace_uri: /path/to/pack-root
```

**Example**: Navigating to `RemoteFlowSource` at line 12, character 30 returns:

```text
uri: file:///.../.codeql/packages/codeql/javascript-all/2.6.19/
     semmle/javascript/security/dataflow/RemoteFlowSources.qll
startLine: 14, startCharacter: 17
```

You can then read that file to understand the class's API. This is how you discover
what predicates a type offers without documentation — go to the definition and read
the source.

## Step 3: Find All References

Use `codeql_lsp_references` to find how a symbol is used across the workspace.

```text
Tool: codeql_lsp_references
Parameters:
  file_path: /path/to/your/query.ql
  line: 11         # 0-based line
  character: 30    # 0-based column within the symbol
  workspace_uri: /path/to/pack-root
```

> **Scope note**: References are scoped to the pack identified by `workspace_uri`.
> To find usages in library code, point `workspace_uri` to the library pack root.
> For usages within your own pack only, point it to your pack root.

This is invaluable for learning how experienced query authors use a predicate —
find real usage examples instead of guessing from documentation.

## Step 4: Locate Symbols with Position Finders

Use `find_predicate_position` and `find_class_position` to locate where a specific
symbol is defined in a file. These return **1-based** line/column positions.

```text
Tool: find_predicate_position
Parameters:
  file: /path/to/your/query.ql
  name: isSource
Returns: { start_line: 12, start_col: 13, end_line: 12, end_col: 20 }
```

> **Note**: `find_class_position` finds `class` definitions only — it does not find
> `module` definitions. Use `find_predicate_position` for predicates inside modules.

**Combining with LSP tools**: To navigate to a predicate's definition in library code:

1. Use `find_predicate_position` to get its 1-based position
2. Subtract 1 from line/col to convert to 0-based
3. Pass to `codeql_lsp_definition` to jump to the underlying type

## Step 5: Quick-Evaluate Individual Predicates

Use `quick_evaluate` to evaluate a single predicate or class against a database
without running the full query. This is the fastest way to debug whether a predicate
matches what you expect.

```text
Tool: quick_evaluate
Parameters:
  file: /path/to/your/query.ql
  db: /path/to/test-database.testproj
  symbol: isSink
  output_path: /tmp/quickeval-results   # optional, for inspecting bqrs output
```

The tool evaluates just that symbol (predicate or class) and returns the result path.
Use `codeql_bqrs_decode` on the output to inspect results in CSV or JSON format.

## Step 6: Validate at Multiple Levels

Use the right validation tool for each situation:

| Tool                     | Use When                                | Input              | Resolves Imports?   |
| ------------------------ | --------------------------------------- | ------------------ | ------------------- |
| `validate_codeql_query`  | Quick structural check                  | Inline QL string   | No (heuristic only) |
| `codeql_lsp_diagnostics` | Syntax/semantic validation of fragments | Inline QL string   | No                  |
| `codeql_query_compile`   | Full compilation check                  | On-disk `.ql` file | Yes                 |
| `codeql_test_run`        | End-to-end result validation            | Test directory     | Yes                 |

**`codeql_lsp_diagnostics`** validates QL syntax and semantics for inline code snippets,
but **cannot resolve `import` statements** (like `import javascript`). Use it for:

- Checking predicate signatures and QL syntax
- Verifying `from`/`where`/`select` clause structure
- Catching type errors in import-free QL fragments

For queries with imports, always use `codeql_query_compile` on the saved file.

## Iterative Development Loop

```text
1. Write/modify a clause in the query file (save to disk)
     ↓
2. codeql_lsp_completion → verify context is valid (non-empty = good)
     ↓
3. codeql_query_compile → check for compilation errors
     ↓
4. codeql_test_run → validate against expected results
     ↓
5. If unexpected results: quick_evaluate on individual predicates
     ↓
6. If predicate is wrong: codeql_lsp_completion to explore the API
     ↓
7. If types are unclear: codeql_lsp_definition to read the source
     ↓
8. If stuck: codeql_lsp_references to find usage examples
     ↓
9. Repeat from step 1
```

## Worked Example: Building a Taint-Tracking Query

This example shows the tools in action for building a JavaScript XSS query.

### 1. Create the query file and install dependencies

Write a `.ql` file with `import javascript` and a skeleton `from`/`where`/`select`.
Run `codeql_pack_install` on the pack directory.

### 2. Explore sink types

Request completions in the `from` clause to discover `DataFlow::PropWrite`:

```text
codeql_lsp_completion(file_path=..., line=9, character=5, workspace_uri=pack_root)
→ 155 completions including PropWrite, CallNode, MethodCallNode, ...
```

### 3. Explore `PropWrite` member predicates

After typing `pw.` in the `where` clause, request completions:

```text
codeql_lsp_completion(file_path=..., line=12, character=9, workspace_uri=pack_root)
→ 43 predicates: getPropertyName(), getRhs(), getBase(), writes(), ...
```

### 4. Navigate to `RemoteFlowSource` definition

```text
codeql_lsp_definition(file_path=..., line=11, character=30, workspace_uri=pack_root)
→ RemoteFlowSources.qll line 14 in codeql/javascript-all
```

### 5. Compile and test incrementally

```text
codeql_query_compile(query=file_path)  →  check for errors
codeql_test_run(tests=[test_dir], learn=true)  →  populate .expected files
```

### 6. Debug a predicate in isolation

```text
find_predicate_position(file=..., name="isSink")  →  line 16, col 13
quick_evaluate(file=..., db=test.testproj, symbol="isSink")  →  inspect results
```

## Important Notes

- **All LSP tools use 0-based positions**. `find_class_position` and
  `find_predicate_position` return 1-based positions. Convert before combining.
- **`workspace_uri` must be the pack root** (the directory containing
  `codeql-pack.yml`). Without it, completions and definitions will be empty.
- **Run `codeql_pack_install` first**. LSP tools require resolved dependencies.
- **`codeql_lsp_diagnostics` cannot resolve imports**. For `import javascript`
  and similar, use `codeql_query_compile` on the on-disk file instead.
- **`find_class_position` finds `class` only**, not `module` definitions.
  Use grep or `find_predicate_position` for predicates inside modules.
- **`codeql_lsp_references` scope** depends on `workspace_uri`. Point it at
  a library pack root to find usages across library code.
