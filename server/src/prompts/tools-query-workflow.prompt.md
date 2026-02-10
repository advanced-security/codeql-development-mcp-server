---
agent: agent
---

# Using CodeQL Development MCP Server Tools Queries

This guide helps you use the built-in "tools" queries (`PrintAST`, `PrintCFG`, `CallGraphFrom`, `CallGraphTo`) that ship with the CodeQL Development MCP Server to understand code structure before writing detection queries.

## Why Use Tools Queries?

Tools queries provide essential insights into how CodeQL represents your source code:

| Query           | Purpose                                          | Use When                                        |
| --------------- | ------------------------------------------------ | ----------------------------------------------- |
| `PrintAST`      | Visualize the Abstract Syntax Tree               | Understanding code structure, finding AST nodes |
| `PrintCFG`      | Visualize Control Flow Graphs                    | Understanding execution paths, loop/branch flow |
| `CallGraphFrom` | Find all functions called by a specific function | Tracing data flow through call chains           |
| `CallGraphTo`   | Find all functions that call a specific function | Understanding function usage patterns           |

## Supported Languages

Tools queries are available for: `actions`, `cpp`, `csharp`, `go`, `java`, `javascript`, `python`, `ruby`, `swift`

## Prerequisites

Before using tools queries, you need:

1. **A CodeQL database** - Either create one or use an existing database
2. **Source files to analyze** - The tools queries filter output to specific files

## Workflow Checklist

### Step 1: Identify or Create Database

- [ ] **Option A: Use existing database**
  - Tool: `codeql_resolve_database`
  - Verify database is valid and note the language

- [ ] **Option B: Create new database**
  - Tool: `codeql_database_create`
  - Parameters: `database`, `language`, `source-root`

### Step 2: Run PrintAST Query

The PrintAST query outputs a hierarchical tree of AST nodes with labels.

- [ ] **Execute PrintAST**
  - Tool: `codeql_query_run`
  - Parameters:
    - `database`: Path to your CodeQL database
    - `queryName`: `"PrintAST"`
    - `queryLanguage`: Your language (e.g., `"javascript"`, `"python"`, `"cpp"`)
    - `sourceFiles`: Comma-separated file names to analyze (e.g., `"main.js,utils.js"`)
    - `format`: `"graphtext"` (for human-readable output)

- [ ] **Verify output contains AST nodes**
  - Look for hierarchical structure with indentation
  - Confirm nodes have `semmle.label` with class names
  - Identify relevant AST classes for your query

**Example AST output structure:**

```
TopLevelFunction
├── FunctionDeclarationEntry
├── Block
│   ├── DeclStmt
│   │   └── LocalVariable
│   ├── ExprStmt
│   │   └── FunctionCall
│   └── ReturnStmt
```

### Step 3: Run PrintCFG Query (if needed)

The PrintCFG query outputs control flow nodes and edges.

- [ ] **Execute PrintCFG**
  - Tool: `codeql_query_run`
  - Parameters:
    - `database`: Path to your CodeQL database
    - `queryName`: `"PrintCFG"`
    - `queryLanguage`: Your language
    - `sourceFunction`: Function name to analyze (e.g., `"processData"`)
    - `format`: `"graphtext"`

- [ ] **Verify output contains nodes and edges**
  - Look for `nodes` section with CFG nodes
  - Look for `edges` section with `→` arrows showing flow
  - Identify control flow patterns (loops, branches)

**Example CFG output structure:**

```
nodes
| node | semmle.label |
| ... | entry: processData |
| ... | if (...) |
| ... | return |

edges
| from | to | semmle.label |
| ... | ... | → |
```

### Step 4: Run CallGraph Queries (if needed)

Call graph queries help trace function relationships.

- [ ] **Execute CallGraphFrom** (to find what a function calls)
  - Tool: `codeql_query_run`
  - Parameters:
    - `database`: Path to your CodeQL database
    - `queryName`: `"CallGraphFrom"`
    - `queryLanguage`: Your language
    - `sourceFunction`: Function name to trace from (e.g., `"main"`)
    - `format`: `"sarif-latest"` or `"csv"`

- [ ] **Execute CallGraphTo** (to find what calls a function)
  - Tool: `codeql_query_run`
  - Parameters:
    - `database`: Path to your CodeQL database
    - `queryName`: `"CallGraphTo"`
    - `queryLanguage`: Your language
    - `targetFunction`: Function name to find callers of (e.g., `"validate"`)
    - `format`: `"sarif-latest"` or `"csv"`

- [ ] **Verify call relationships**
  - Confirm results show caller → callee relationships
  - Note function locations for further analysis

### Step 5: Apply Insights to Query Development

Use the gathered information to inform your query:

- [ ] **From PrintAST**: Identify which AST classes to use in your `from` clause
- [ ] **From PrintCFG**: Understand execution paths for control-flow-sensitive queries
- [ ] **From CallGraph**: Map data flow paths through function boundaries

## Common Patterns

### Pattern 1: Finding All Function Calls

```
1. Run PrintAST on your source file
2. Look for FunctionCall, MethodAccess, or similar nodes
3. Note the parent/child relationships
4. Use those AST classes in your query
```

### Pattern 2: Tracing Data Through Functions

```
1. Run CallGraphFrom on your entry point function
2. Identify which functions are called
3. Run CallGraphTo on sink functions
4. Map the complete path from source to sink
```

### Pattern 3: Understanding Loop Structures

```
1. Run PrintAST to find loop constructs (ForStmt, WhileStmt, etc.)
2. Run PrintCFG on the containing function
3. Identify back edges that represent loop iteration
4. Use CFG analysis for loop-sensitive queries
```

## Troubleshooting

| Issue                 | Likely Cause                          | Resolution                                             |
| --------------------- | ------------------------------------- | ------------------------------------------------------ |
| Empty AST output      | `sourceFiles` parameter not matching  | Use just filenames, not full paths (e.g., `"test.js"`) |
| Empty CFG output      | `sourceFunction` not found            | Check exact function name spelling                     |
| Empty CallGraph       | No calls exist or wrong function name | Verify function exists and has calls                   |
| Query compilation err | Pack dependencies missing             | Run `codeql_pack_install` on the tools pack            |

## MCP Tools Reference

| Tool                      | Purpose                                              |
| ------------------------- | ---------------------------------------------------- |
| `codeql_query_run`        | Execute tools queries with parameters                |
| `codeql_resolve_database` | Validate database before querying                    |
| `codeql_database_create`  | Create database from source code                     |
| `codeql_bqrs_interpret`   | Convert results to different formats                 |
| `codeql_pack_install`     | Install pack dependencies if needed                  |
| `codeql_lsp_completion`   | Explore available types after seeing AST class names |
| `codeql_lsp_definition`   | Navigate to class definitions to see predicates      |
| `codeql_lsp_references`   | Find usage examples of a class or predicate          |

### Using LSP Tools After AST Analysis

After running PrintAST and identifying relevant AST class names, use the LSP tools
to explore those classes in your query file:

1. **Write the class name** in your query's `from` clause and save the file
2. **Run `codeql_lsp_completion`** after the dot to see member predicates:
   - `file_path`: your query file, `line`/`character`: 0-based position after the dot
   - `workspace_uri`: the pack root directory (containing `codeql-pack.yml`)
3. **Run `codeql_lsp_definition`** on an AST class name to see its full API
4. **Run `codeql_lsp_references`** to find usage examples in the pack

> **Note**: LSP tools use 0-based line/character positions. Run `codeql_pack_install`
> before using them — they require resolved dependencies. Set `workspace_uri` to
> a plain directory path (not a `file://` URI).

For the full iterative LSP development workflow, see: `codeql://prompts/ql_lsp_iterative_development`
