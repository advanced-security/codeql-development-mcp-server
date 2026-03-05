---
agent: agent
---

# Find Overlapping Queries and Libraries

Use the MCP server tools to discover existing `.ql` query files and `.qll` library
files whose content may overlap with a new query design — **before** writing any new
code — so that reusable building blocks can be identified and incorporated rather than
reimplemented from scratch.

"Overlap" here includes:

- A shared library (`.qll`) that already models a concept central to the new query
  (e.g. a class representing placement-new expressions, or a predicate identifying
  types with non-trivial destructors)
- An existing query (`.ql`) whose logic intersects the new query's domain (e.g. an
  existing query that already detects misuse of placement-new, or already reasons
  about destructor triviality)
- Utility predicates or classes in either file type that could be imported and reused
  directly, reducing the amount of new code needed

## Use This Prompt When

- Starting a new query and wanting to know what library support already exists for
  the concepts it must model
- Unsure whether a query (or a close variant) already exists in the codebase
- Looking for concrete QL code examples of how to model a particular language
  construct or pattern in the target language
- Performing an audit of a query suite to identify potential consolidation
  opportunities

## Prerequisites

1. A clear description of the new query's **purpose and target constructs** (e.g.
   "detect placement-new calls on objects whose type has a non-trivial destructor")
2. The **target language** (e.g. `cpp`, `java`, `python`)
3. Optionally, the **pack root** — the directory containing `codeql-pack.yml` for the
   pack that will own the new query; this is used to locate project-specific libraries
   and existing queries in the same suite

## Overview of the Approach

The core idea is to decompose the new query's description into a set of **key
concepts**, then search the available `.qll` library files and existing `.ql` query
files for content that relates to those concepts. Finally, report which files contain
relevant material and highlight the specific classes, predicates, or modules that
could be reused.

1. **Extract key concepts** from the query description
2. **Resolve available library sources** for the target language and pack
3. **Find candidate `.qll` files** — ranked by naming proximity to the key concepts
4. **Enumerate symbols in candidate `.qll` files** to identify reusable definitions
5. **Find candidate `.ql` query files** in the same pack and its dependencies
6. **Inspect overlapping queries** to understand their scope and find reusable logic
7. **Report findings** — which files and which specific definitions are most relevant

## Step 1: Extract Key Concepts

Before touching any tools, decompose the query description into a set of
**searchable key concepts**: concrete noun phrases (AST node types, predicates,
language-specific constructs) that are likely to appear in file names or class/
predicate names.

For example, "placement-new calls on objects whose type has a non-trivial destructor"
decomposes into:

- `PlacementNew` / `placement_new` / `NewExpr`
- `NonTrivial` / `non_trivial` / `Trivial`
- `Destructor` / `destructor` / `Dtor`

Record these key concept terms — they drive every subsequent search.

## Step 2: Resolve Available Library Sources

Use `codeql_resolve_library-path` to find every source root visible to the target
pack. If no pack root is known yet, use either a representative existing `.ql` file
in the same language, or the language's default library root (typically
`~/.codeql/packages`).

```text
Tool: codeql_resolve_library-path
Parameters:
  query:         /path/to/any-existing-query.ql   # or use --additional-packs
  format:        json
```

Read the returned list of source roots. For each root, list the directory tree to
understand the overall structure before narrowing your search:

```text
Tool: list_directory
Parameters:
  path: /returned/source/root
```

Do **not** preemptively discard any source root based on its name alone. The
structure of each root must be understood before filtering.

## Step 3: Find Candidate `.qll` Files

For each source root, gather all `.qll` file paths:

```text
Shell: find /source/root -name "*.qll" | sort
```

Scan every path using the key concept terms from Step 1. A file is a **candidate**
if its path or filename contains one or more of those terms, or if it lives in a
directory whose name suggests domain relevance (e.g. `memory/`, `destructors/`,
`initialization/`).

Prioritize candidates as follows:

- `.qll` files in the same directory as the planned new query — **highest priority**
- `.qll` files elsewhere in the same pack — **very high priority**
- `.qll` files in project-specific library packs — **high priority**
- `.qll` files in downloaded direct dependencies — **standard priority**
- `.qll` files in transitive dependencies — **lower priority**

Aim to identify the **top 5–10 most promising candidate `.qll` files** before
proceeding. Breadth is important here: a small `.qll` file named `Destructor.qll`
is more immediately useful than a 5000-line `Types.qll`, but both should be noted if
relevant.

## Step 4: Enumerate Symbols in Candidate `.qll` Files

For each shortlisted candidate `.qll` file, retrieve its top-level definitions:

```text
Tool: codeql_lsp_document_symbols
Parameters:
  file_path:     /path/to/Candidate.qll
  names_only:    true
  workspace_uri: /path/to/pack-root   # plain directory containing codeql-pack.yml
```

Note: `workspace_uri` must be a **plain directory path**, not a `file://` URI. All
line/character positions returned by LSP tools are **0-based**.

Scan the returned `symbols` array for classes, predicates, and modules whose names
contain or are closely related to the key concept terms. For any promising symbol,
expand its definition using `find_predicate_position` or `find_class_position` and
then `read_file` to inspect the actual implementation.

Note: `find_predicate_position` and `find_class_position` use **1-based** line
numbers.

Record each relevant symbol as:

```
File: /path/to/Candidate.qll
Symbol: ClassName / predicateName
Relevance: <which key concept it addresses>
Summary: <one-sentence description of what it does>
```

## Step 5: Find Candidate Existing `.ql` Query Files

Existing queries are an equally important source of reusable logic.

First, list all `.ql` files in the target pack (and any closely related packs) using
the MCP tool `codeql_resolve_queries` or a recursive directory listing:

```text
Tool: codeql_resolve_queries
Parameters:
  directory: /path/to/pack-root
  format:    json
```

Or equivalently:

```text
Shell: find /pack-root -name "*.ql" | sort
```

Scan every file name using the key concept terms from Step 1. A query file is a
**candidate** if:

- Its file name contains one or more key concept terms, or
- It lives in a subdirectory whose name suggests domain overlap, or
- Its containing rule directory (e.g. `RULE-X-Y-Z/`) has a description that overlaps
  with the new query's domain (check `qlpack.yml` query metadata or directory names
  if available)

## Step 6: Inspect Overlapping Query Files

For each candidate `.ql` file identified in Step 5:

1. Read the file header (first 60 lines) to understand what the query detects:

   ```text
   Tool: read_file
   Parameters:
     file_path:  /path/to/ExistingQuery.ql
     start_line: 1
     end_line:   60
   ```

2. Use `codeql_lsp_document_symbols` to enumerate its own top-level definitions:

   ```text
   Tool: codeql_lsp_document_symbols
   Parameters:
     file_path:     /path/to/ExistingQuery.ql
     names_only:    true
     workspace_uri: /path/to/pack-root
   ```

3. For any symbol whose name or kind maps to a key concept, retrieve its full
   definition using `find_predicate_position` / `find_class_position` and `read_file`
   to determine whether the logic could be reused by the new query.

4. Note the import statements in the existing query. Any shared `.qll` imported
   there is a strong signal that the same import could benefit the new query.

Aim to identify **which specific lines or definitions** are most relevant — not just
which file — so that the report gives actionable guidance.

## Step 7: Report Findings

### Relevant Library Definitions (`.qll` files)

Present a table of reusable definitions found in library files:

| Symbol                 | File                                                       | Kind      | Key Concept  | Notes                                            |
| ---------------------- | ---------------------------------------------------------- | --------- | ------------ | ------------------------------------------------ |
| `PlacementNewExpr`     | `semmle/code/cpp/ir/dataflow/internal/DataFlowUtil.qll:12` | class     | PlacementNew | Models placement-new allocation sites            |
| `hasTrivialDestructor` | `semmle/code/cpp/Type.qll:340`                             | predicate | Destructor   | Returns true if the type's destructor is trivial |

For each entry, state:

- **How to import it**: the `import` statement needed to access the symbol
- **How it maps**: which part of the new query could use this definition
- **Limitation** (if any): cases where the existing definition does not fully cover
  the new query's needs

### Overlapping Existing Queries (`.ql` files)

Present a table of existing queries whose logic intersects:

| Query file                   | Rule                 | What it detects                                | Overlap area                             |
| ---------------------------- | -------------------- | ---------------------------------------------- | ---------------------------------------- |
| `RULE-7-5-3/PlacementNew.ql` | MISRA C++ Rule 7.5.3 | Placement-new calls without matching destroy — | Placement-new enumeration, type analysis |

For each overlapping query, state:

- **Shared logic**: the specific class or predicate definitions that could be lifted
  into a shared `.qll` or imported directly
- **Divergence**: how the existing query's intent differs from the new query's intent,
  so the developer understands what cannot be reused directly

### Summary Recommendation

End with a short paragraph (3–5 sentences) summarising:

1. Which existing definitions provide the **strongest starting points** for the new
   query
2. Whether a **shared `.qll`** should be created to house logic that would otherwise
   be duplicated
3. Which aspects of the new query appear to have **no existing foundation** and will
   require original implementation

## Worked Example

> **Query description**: Detect placement-new calls in C++ involving object types
> that have a non-trivial destructor, because the caller is responsible for manually
> invoking the destructor and may forget to do so.
>
> **Language**: `cpp`
>
> **Pack root**: `/workspace/cpp/misra/src`

**Key concepts extracted**: `PlacementNew`, `NewExpr`, `NonTrivial`, `Trivial`,
`Destructor`, `Dtor`

**Step 2** — resolve library paths for a representative query:

```text
Tool: codeql_resolve_library-path
Parameters:
  query: /workspace/cpp/misra/src/rules/RULE-7-5-1/SomeQuery.ql
```

Returns roots such as:

- `/workspace/cpp/common/src` (project library)
- `/workspace/cpp/misra/src` (pack being worked on)
- `~/.codeql/packages/codeql/cpp-all/1.4.0` (standard library)

**Step 3** — scanning `~/.codeql/packages/codeql/cpp-all/1.4.0` for `*.qll`:

Candidates matching key concepts:

- `semmle/code/cpp/exprs/New.qll` — contains `NewExpr`, likely covers placement-new
- `semmle/code/cpp/Type.qll` — may contain destructor triviality predicates
- `semmle/code/cpp/Destructor.qll` (if it exists) — direct match on `Destructor`

**Step 4** — `codeql_lsp_document_symbols` on `New.qll`:

```json
{ "name": "NewExpr",         "kind": 5 }
{ "name": "NewArrayExpr",    "kind": 5 }
{ "name": "PlacementNewExpr","kind": 5 }   ← highly relevant
```

`PlacementNewExpr` in `New.qll` exactly models placement-new allocations —
this class should be imported and used directly in the new query rather than
reimplementing it.

**Step 5** — scanning `/workspace/cpp/misra/src` for `*.ql`:

Candidates matching key concepts:

- `rules/RULE-12-2-1/DestructorMustBeCalledExplicitly.ql` — destructor relevance
- `rules/RULE-6-2-2/PlacementNewLifetime.ql` — placement-new relevance

**Step 6** — reading `PlacementNewLifetime.ql` header:

The file imports `semmle.code.cpp.exprs.New` and defines a local predicate
`placementNewTarget()` that wraps `PlacementNewExpr.getAllocatedType()`.
This predicate and the surrounding type-resolution logic can serve as a template.

# Conclusion

Do **not** write or modify any code during this analysis.

As you work through this task, ask yourself:

- Have I changed any code, even though that was not my task, or am I about to?
  Stop, do not change any code!
- Did I extract enough key concepts to drive a thorough file-name search?
- Did I inspect both library `.qll` files **and** existing `.ql` query files?
- Did I identify specific symbols (not just files) that are relevant?
- Did I report the import path needed to access each reusable symbol?
- Did I summarise which parts of the new query still require original implementation?
- Did I use the suggested tools to their fullest extent before concluding?
- Did I report any difficulties encountered while resolving library paths or reading
  files?
