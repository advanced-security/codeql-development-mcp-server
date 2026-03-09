# MCP Server Bundled Queries

This resource describes the tools queries bundled with the CodeQL Development MCP Server. These queries run via `codeql_query_run` and provide structural insight into how source code is represented in a CodeQL database. Use them to understand code structure before writing detection queries.

For general QL query writing guidance (syntax, metadata, `from`/`where`/`select`, testing conventions), see `codeql://learning/query-basics`.

## Bundled Tools Queries

The server bundles four tools queries that operate on CodeQL databases:

| Query           | Purpose                                           | Output Format             |
| --------------- | ------------------------------------------------- | ------------------------- |
| `PrintAST`      | Visualize the Abstract Syntax Tree of source code | `@kind graph` (graphtext) |
| `PrintCFG`      | Visualize the Control Flow Graph of a function    | `@kind graph` (graphtext) |
| `CallGraphFrom` | Show all functions called FROM a given function   | `@kind graph` (graphtext) |
| `CallGraphTo`   | Show all call sites that call TO a given function | `@kind graph` (graphtext) |

All four queries use `@kind graph` metadata and produce output in graphtext format.

## PrintAST

**Purpose**: Outputs a hierarchical representation of the Abstract Syntax Tree showing parent-child relationships between declarations, statements, and expressions.

**When to use**: Before writing any CodeQL query, run `PrintAST` on your test source code to understand which QL classes represent which source constructs and which predicates are available for matching.

**How to run**:

```text
Tool: codeql_query_run
Parameters:
  queryName: "PrintAST"
  queryLanguage: "<language>"
  database: "<path-to-database>"
  sourceFiles: "<comma-separated-filenames>"   (optional — filter to specific files)
  format: "graphtext"
  interpretedOutput: "<output-directory>"
```

**Output**: A tree showing each AST node with its QL class name, properties, and position in the hierarchy. This reveals exactly which QL classes and predicates to use in `from`/`where`/`select` clauses.

## PrintCFG

**Purpose**: Produces a Control Flow Graph representation showing the order in which statements and expressions execute, including branching paths.

**When to use**: When writing queries that reason about execution order, reachability, or branching logic (e.g., "is this check always performed before this call?").

**How to run**:

```text
Tool: codeql_query_run
Parameters:
  queryName: "PrintCFG"
  queryLanguage: "<language>"
  database: "<path-to-database>"
  sourceFunction: "<function-name>"   (optional — target a specific function)
  format: "graphtext"
  interpretedOutput: "<output-directory>"
```

**Output**: Nodes representing CFG basic blocks and edges representing possible execution transitions (successor relationships).

## CallGraphFrom

**Purpose**: Shows all functions called FROM a specified source function — the outbound call dependencies.

**When to use**: When analyzing what a function does by tracing the functions it invokes. Useful for understanding call chains and identifying potential data flow paths.

**How to run**:

```text
Tool: codeql_query_run
Parameters:
  queryName: "CallGraphFrom"
  queryLanguage: "<language>"
  database: "<path-to-database>"
  sourceFunction: "<function-name>"
  format: "graphtext"
  interpretedOutput: "<output-directory>"
```

**Output**: A graph showing each call site within the source function and the target function being called.

## CallGraphTo

**Purpose**: Shows all call sites that invoke a specified target function — the inbound callers.

**When to use**: When performing impact analysis to understand where a function is used, or when identifying all locations that pass data to a particular sink function.

**How to run**:

```text
Tool: codeql_query_run
Parameters:
  queryName: "CallGraphTo"
  queryLanguage: "<language>"
  database: "<path-to-database>"
  targetFunction: "<function-name>"
  format: "graphtext"
  interpretedOutput: "<output-directory>"
```

**Output**: A graph showing each caller function and the specific call site where the target function is invoked.

## Language Support

| Language   | PrintAST | PrintCFG | CallGraphFrom | CallGraphTo |
| ---------- | :------: | :------: | :-----------: | :---------: |
| actions    |    ✓     |    ✓     |               |             |
| cpp        |    ✓     |    ✓     |       ✓       |      ✓      |
| csharp     |    ✓     |    ✓     |       ✓       |      ✓      |
| go         |    ✓     |    ✓     |       ✓       |      ✓      |
| java       |    ✓     |    ✓     |       ✓       |      ✓      |
| javascript |    ✓     |    ✓     |       ✓       |      ✓      |
| python     |    ✓     |    ✓     |       ✓       |      ✓      |
| ruby       |    ✓     |    ✓     |       ✓       |      ✓      |
| swift      |    ✓     |    ✓     |       ✓       |      ✓      |

Note: The `actions` language supports PrintAST and PrintCFG only (no call graph queries).

## Recommended Workflow

Use the `tools_query_workflow` prompt for a guided step-by-step workflow:

1. **Identify or create a database**: Use `list_codeql_databases` or `codeql_database_create`
2. **Run PrintAST**: Understand how the source code maps to QL classes
3. **Run PrintCFG**: Understand control flow for the functions of interest
4. **Run CallGraphFrom / CallGraphTo**: Trace call relationships to identify sources and sinks
5. **Write detection queries**: Use the insights from steps 2–4 to select the right QL classes and predicates

## Related Resources

- `codeql://learning/query-basics` — QL query writing reference (syntax, metadata, patterns, testing)
- `codeql://server/overview` — MCP server orientation guide
- `codeql://server/tools` — Complete tool reference
- `codeql://learning/test-driven-development` — TDD workflow for CodeQL queries
- `codeql://languages/{language}/ast` — Language-specific AST class reference
