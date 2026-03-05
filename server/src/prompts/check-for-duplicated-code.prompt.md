---
agent: agent
---

# Check for Duplicated Code

Use the MCP server tools to identify classes, modules, and predicates defined in a
`.ql` or `.qll` file and check for possible "duplicated code," where duplicated code
is defined to be:

- Reimplementing functionality that already exists in the standard library, or shared project `.qll` files, and
- The local definition is identical, or semantically equivalent, or superior to the library definition, or
- The local definition could be simplified by reusing the existing definition (e.g. a base class already exists that captures some of the shared logic)

Here are some examples:

```ql
import cpp

// Duplicated: `StandardNamespace` already exists in the standard library and is identical
class NamespaceStd extends Namespace {
  NamespaceStd() { this.getName() = "std" }
}

// Duplicated: class should extend `Operator`, not `Function`
class ThrowingOperator extends Function {
  ThrowingOperator() {
    // Duplicated: this check is implied by using base class `Operator`
    this.getName().matches("%operator%") and
    and exists(ThrowExpr te |
      // Duplicated: this is equivalent to `te.getEnclosingFunction() = this`
      te.getParent*() = this.getAChild()
    )
  }

  // Duplicated: member predicate `getDeclaringType()` already does this.
  Class getDefiningClass() { ... }
}

// Duplicated: `ControlFlowNode.getASuccessor()` already exists in `cpp` and is superior
predicate getASuccessor(Stmt a, Stmt b) {
  exists(Block b, int i | a = b.getChild(i) and b = b.getChild(i + 1))
}

// Duplicated: prefer to import `semmle.code.cpp.controlflow.Dominance`, defined in dependency pack `cpp-all`
predicate dominates(Block a, Block b) { ... }
```

Duplicate code removal isn't done arbitrarily, but for several key reasons:

- **Maintainability**: Duplicated code must be maintained separately, may diverge and have different bugs
- **Simplicity**: Relying on existing definitions reduces the amount of code to read and understand
- **Readability**: Existing definitions map wrap complex ideas into readable names
- **Consistency**: A single source of truth makes for a more consistent user experience across queries
- **Completeness/Correctness**: Recreating an already-existing definition can miss edge cases, resulting in false positives or false negatives

## Use This Prompt When

- A query file defines a class or predicate whose name sounds generic (e.g.
  `StandardNamespace`, `Callable`, `SecurityFeature`)
- Refactoring a query that was written before a relevant library predicate existed
- Reviewing a shared `.qll` file to check whether its helpers have been upstreamed
  into the standard library in a newer CodeQL version
- Performing a code-quality audit across a suite of custom queries

## Prerequisites

1. The file path of the `.ql` or `.qll` file to audit for code duplication
2. Understand which packs are imported by `qlpack.yml`
3. Understand where the relevant language library packs are located (e.g. `~/.codeql`)
4. Understand where project-specific library packs are located (e.g. `$LANGUAGE/lib` or `$LANGUAGE/common`)
5. Understand where pack-specific shared `.qll` files are located (e.g. `$PACKROOT/common/*.qll`)

## Overview of the Approach

The core idea is to enumerate every top-level name defined in the file under review.
Then, find candidate `.qll` files, based on file name and path, that are available to
that `.ql` file in review. Then, enumerate the top-level names in each candidate
`.qll` file, to find potential duplicates, dive further if necessary, and then report
the findings as code improvement recommendations to the user.

1. **Read the file** to see its imports and top-level structure
2. **Enumerate top-level definitions** with `codeql_lsp_document_symbols`
3. **Find available .qll files** in the `.ql` file's pack, and its dependencies, including the standard library
4. **Identify promising .qll file candidates** based on their file name and path
5. **Enumerate top-level definitions in candidate `.qll` files** with `codeql_lsp_document_symbols`
6. **Detect overlap, comparing definitions if unclear** (e.g. by using `find_predicate_position` and `find_class_position` tools)
7. **Report findings** as a set of recommendations to the user about which definitions could be improved, by reusing which existing definitions

## Step 1: Read the File and Note Its Imports

```text
Tool: read_file
Parameters:
  file_path: /path/to/query.ql
  start_line: 1
  end_line: 60   # enough to see all imports
```

Record every `import` statement. These are the namespaces the standard library
exposes; duplication is only meaningful for libraries that are already imported (or
easily importable).

## Step 2: Enumerate Top-Level Definitions

Use `codeql_lsp_document_symbols` to retrieve every class, predicate, and module
defined at the top level of the file in a single call:

```text
Tool: codeql_lsp_document_symbols
Parameters:
  file_path: /path/to/query.ql
  names_only: true                    # provides significantly smaller response payload
  workspace_uri: /path/to/pack-root   # directory containing codeql-pack.yml
```

The response contains a `symbols` array. Each entry has:

- `name` — the identifier as written in source
- `kind` — numeric SymbolKind (5 = Class, 12 = Function/predicate, 2 = Module, etc.)
- `range` — the full definition range (0-based lines)
- `selectionRange` — the range of just the name token
- `children` — nested members (for classes and modules)

Top-level symbols are the root nodes of the array; `children` hold member
predicates and fields.

## Step 3. Read the filesystem to find candidate library `.qll` files

Run the tool `codeql_resolve_library-path` with the given ql query file to find where
the available library sources live.

For each source root, run `find $ROOT -name "*.qll"` to find all `.qll` files
available in that pack. Do not preemptively filter this list of qll files. The names
of the files may be broad or nondescriptive. Read all file names for each project to
understand its structure and responsibilities before proceeding to step 3d.

Choose promising candidate `.qll` files you found in the previous step. Pick
candidates that may potentially define behavior relevant to the current query and its
enumerated definitions, based on the candidate filename, path, and priority.

Prioritize as follows:

- `.qll` files in the same directory as the query file have the absolute highest priority
- `.qll` files in the same pack have the next extremely high priority
- `.qll` files in project-specific library packs have the very high priority
- `.qll` files in downloaded direct dependencies have standard priority
- `.qll` files in transitive dependencies have the least priority.

## Step 4: Identify candidate terms in the candidate library `.qll` files

Enumerate the top-level definitions for each candidate `.qll` file using the tool
`codeql_lsp_document_symbols` again. Some top levels may clearly match the name or
purpose of a definition in the query file, while others may only appear as possibly
related.

```text
Tool: codeql_lsp_document_symbols
Parameters:
  file_path: /path/to/library/file.qll
  workspace_uri: /path/to/pack-root
```

## Step 5: Perform final overlap analysis

For each promising candidate, identify the predicate or class definitions that may overlap. One definition will be in the query file (`.ql`) and the other will be in the library file (`.qll`).

Using the tools `find_predicate_position` and `find_class_position`, you can retrieve the full definition of each predicate or class, and compare them to determine whether they are identical, equivalent, overlapping, or if one is a superior implementation that could be reused by the query file.

Dutifully analyze whether the shared library file definition would reduce code duplication in the categories identified before: maintenance, simplicity, readability, consistency, and completeness/correctness. Consider contextual factors such as comments explaining why the local definition differs from the library one, or whether the local definition is a thin wrapper around the library definition that adds value (e.g. by improving naming or adding extra checks).

Do not go on a wild goose chase trying to find every possible overlap. Consider the likelihood of overlap based on the broadness of functionality, and the value that would be brought be reuse. Do not waste significant time on unimportant or unlikely overlaps.

## Step 6: Report Findings

For each duplicate found, report:

| Local name          | Local file    | import path                      | Notes      |
| ------------------- | ------------- | -------------------------------- | ---------- |
| `StandardNamespace` | `query.ql:42` | already imported in `import cpp` | Identical  |
| `myHelper`          | `query.ql:80` | `import myproject.Helpers`       | Equivalent |
| `myHelper`          | `query.ql:80` | `import myproject.Helpers`       | Equivalent |

Recommend one of:

- **Replace**: remove the local definition and use the standard definition directly instead
- **Integrate**: refactor and simplify the local definition by making use of the standard definition
- **Annotate**: add comments to the local definition to explain how it differs from the standard definition and why the duplication is necessary

Additionally, report if any issues came up in using the tools, or finding the qll files.

For each concept for which no duplicate was found, provide at most a **brief** description of what the concept is. Do not provide a long detailed explanation of a non-finding.

# Conclusion

Do **not** perform any updates to any code during this analysis.

As you work through completing this task, ask yourself:

- Have I changed any code, even though that was not my task, or am I about to? Stop, do not change any code!
- Did I sufficiently analyze the definitions such that I likely found most overlapping definitions?
- Will my suggestions improve the maintainability, simplicity, readability, consistency, or completeness/correctness of the codebase?
- Did I report my findings clearly?
- Did I use the suggested LLM tools to their fullest extent?
- Did I follow the steps in the recommended order, and not skip any steps?
- Did I report any issues I had in finding the relevant `.qll` files, or using the tools to analyze definitions?
