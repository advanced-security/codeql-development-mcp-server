---
agent: agent
---

# Iterative CodeQL Development with LSP Tools

Use this workflow to iteratively develop and refine CodeQL queries using the LSP-powered tools.
These tools let you inspect, validate, and navigate QL code at a granular level — working with
specific classes, predicates, and expressions rather than running full queries.

## When to Use This Workflow

- Exploring unfamiliar CodeQL libraries to discover available classes and predicates
- Incrementally building a query clause-by-clause with real-time feedback
- Navigating from a class usage to its definition to understand its API
- Finding all usages of a predicate across a codebase
- Validating query fragments before assembling a complete query

## Prerequisites

- A CodeQL pack with `codeql-pack.yml` and installed dependencies (`codeql_pack_install`)
- Query files must be on disk (LSP tools operate on files, not inline code)
- The `workspace_uri` parameter should point to the pack root or workspace root

## Step 1: Discover Available Types

Use `codeql_lsp_completion` to explore what types are available after an `import` statement.

**Example**: After writing `import javascript` in a `.ql` file, request completions inside the
`from` clause to see all available classes:

- Tool: `codeql_lsp_completion`
- Parameters: `file_path` = your query file, `line` = the `from` line, `character` = after the space
- Tip: Set `workspace_uri` to the pack root for dependency resolution

The completions include class names with documentation, so you can discover types like
`File`, `Function`, `CallExpr`, etc. without leaving the editor.

## Step 2: Navigate to Definitions

Once you've chosen a class (e.g., `File`), use `codeql_lsp_definition` to jump to its
definition and understand its member predicates.

- Tool: `codeql_lsp_definition`
- Parameters: position the cursor on the class name in your query
- Returns: the file URI and line range of the class definition

This is especially useful for understanding what predicates a class offers
(e.g., `File` has `getBaseName()`, `getExtension()`, `getAbsolutePath()`).

## Step 3: Find All References

Use `codeql_lsp_references` to find how a class or predicate is used across the pack.

- Tool: `codeql_lsp_references`
- Parameters: position the cursor on the symbol
- Returns: all locations where the symbol is used

This helps you find examples of how experienced query authors use a particular
predicate, which is invaluable for learning patterns.

## Step 4: Validate Incrementally

After each modification to your query file:

1. Save the file to disk
2. Use `codeql_lsp_completion` at the cursor position to verify the language server
   understands the context (non-empty completions = good parse state)
3. Use `codeql_query_compile` for a full compilation check
4. Use `codeql_test_run` to validate against expected results

## Step 5: Quick Evaluate Specific Parts

Use `find_class_position` and `find_predicate_position` to locate specific
symbols, then use `quick_evaluate` to evaluate just that class or predicate
against a database — without running the full query.

- Tool: `find_class_position` — find where a class is defined (line/column)
- Tool: `find_predicate_position` — find where a predicate is defined
- Tool: `quick_evaluate` — evaluate just that symbol against a database

## Iterative Development Loop

```text
1. Write/modify a clause in the query file
     ↓
2. codeql_lsp_completion → verify context is valid
     ↓
3. codeql_query_compile → check for errors
     ↓
4. codeql_test_run → validate results
     ↓
5. If failing: use codeql_lsp_definition to understand types
     ↓
6. If stuck: use codeql_lsp_references to find usage examples
     ↓
7. Repeat from step 1
```

## Important Notes

- **`codeql_lsp_diagnostics` works with inline code** but cannot resolve imports
  (like `import javascript`) because the inline code isn't associated with a pack.
  For import-dependent validation, use `codeql_query_compile` on the actual file.
- **`codeql_lsp_completion` needs `workspace_uri`** pointing to the pack root for
  dependency resolution. Without it, completions will be empty.
- **File-based LSP tools** (`completion`, `definition`, `references`) operate on files
  that are part of a pack with resolved dependencies. Always run `codeql_pack_install`
  first.
