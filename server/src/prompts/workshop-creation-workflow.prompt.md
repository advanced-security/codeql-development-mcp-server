---
agent: agent
---

# Creating CodeQL Query Development Workshops

This guide helps you create educational CodeQL query development workshops from existing production-grade queries. Workshops teach developers how to build queries incrementally through exercises and solutions.

## Workshop Purpose

A CodeQL workshop transforms a complex, production-ready query into a series of incremental learning stages:

- **Exercises**: Incomplete query stubs with scaffolding and hints
- **Solutions**: Complete working queries for each stage
- **Tests**: Unit tests validating each stage works correctly
- **Documentation**: README with learning objectives and instructions

## Prerequisites

Before creating a workshop, ensure you have:

1. **A production-grade CodeQL query** - The "target" query to decompose
2. **Working unit tests** - Tests that pass for the target query
3. **A CodeQL database** - For running tools queries and validating results

## Workshop Creation Checklist

### Phase 1: Analyze the Target Query

- [ ] **Locate query files**
  - Tool: #find_codeql_query_files
  - Parameters: `queryPath` (path to the `.ql` or `.qlref` file)
  - Note: Returns query file, test files, expected results, and metadata

- [ ] **Understand query logic for workshop content**
  - Prompt: `explain_codeql_query`
  - Parameters: `queryPath`, `language`, and optionally `databasePath`
  - Identify: sources, sinks, sanitizers, flow configuration
  - Generates: detailed explanation with mermaid evaluation diagram

- [ ] **Verify existing tests pass**
  - Tool: #codeql_test_run
  - Parameters: `tests` (array of test directories)
  - Confirm: 100% pass rate before proceeding

### Phase 2: Generate AST/CFG Understanding

> **⚠️ CRITICAL**: Run tools queries to understand the test code structure.

- [ ] **Run PrintAST on test code**
  - Tool: #codeql_query_run
  - Parameters:
    - `queryName`: `"PrintAST"`
    - `queryLanguage`: Your language (e.g., `"cpp"`, `"javascript"`)
    - `database`: Path to test database or extracted `.testproj`
    - `sourceFiles`: Test source file names
    - `format`: `"graphtext"`
  - Verify: Output contains hierarchical AST nodes (not empty)

- [ ] **Run PrintCFG on key functions**
  - Tool: #codeql_query_run
  - Parameters:
    - `queryName`: `"PrintCFG"`
    - `queryLanguage`: Your language
    - `database`: Path to database
    - `sourceFunction`: Key function names from test code
    - `format`: `"graphtext"`
  - Verify: Output contains nodes and edges

- [ ] **Run CallGraph queries** (if query involves data flow)
  - Tool: #codeql_query_run
  - Parameters:
    - `queryName`: `"CallGraphFrom"` or `"CallGraphTo"`
    - `database`: Path to database
    - `sourceFunction` / `targetFunction`: Relevant function names
  - Verify: Output shows call relationships

### Phase 3: Plan Workshop Stages

Decompose the query into 4-8 incremental stages using these strategies:

#### Decomposition Strategies

| Strategy             | Description                                              | Example Progression                   |
| -------------------- | -------------------------------------------------------- | ------------------------------------- |
| Syntactic → Semantic | Start with syntax, add type checking, then data flow     | AST → Types → Local flow → Global     |
| Local → Global       | Start with local analysis, expand to cross-procedural    | Single function → Multiple functions  |
| Simple → Filtered    | High recall first, then add precision filters            | All calls → Specific calls → Filtered |
| Building Blocks      | Define helpers, combine into sources/sinks, connect flow | Predicates → Sources → Sinks → Config |

- [ ] **Document stage progression**
  - Stage 1: Basic syntactic pattern (highest recall)
  - Stage 2-N: Add refinements (types, filters, flow)
  - Final Stage: Complete production query

### Phase 4: Create Workshop Structure

Standard workshop directory layout:

```text
workshop-name/
├── codeql-workspace.yml      # CodeQL workspace configuration
├── README.md                 # Workshop guide with instructions
├── build-databases.sh        # Script to create test databases
├── exercises/                # Student exercise queries
│   ├── codeql-pack.yml
│   ├── Exercise1.ql
│   ├── Exercise2.ql
│   └── ...
├── exercises-tests/          # Tests for exercises
│   ├── codeql-pack.yml
│   ├── Exercise1/
│   │   ├── Exercise1.qlref
│   │   ├── Exercise1.expected
│   │   └── test.ext
│   └── ...
├── solutions/                # Complete solution queries
│   ├── codeql-pack.yml
│   ├── Exercise1.ql
│   ├── Exercise2.ql
│   └── ...
├── solutions-tests/          # Tests for solutions
│   ├── codeql-pack.yml
│   └── ...
├── tests-common/             # Shared test code
│   └── test.ext
└── graphs/                   # AST/CFG visualizations
    └── ast-overview.txt
```

- [ ] **Create codeql-workspace.yml**

  ```yaml
  provide:
    - '*/codeql-pack.yml'
  ```

- [ ] **Create pack files for each directory**
  - `exercises/codeql-pack.yml`: Query pack depending on language library
  - `exercises-tests/codeql-pack.yml`: Test pack depending on exercises
  - `solutions/codeql-pack.yml`: Query pack (same deps as exercises)
  - `solutions-tests/codeql-pack.yml`: Test pack depending on solutions

### Phase 5: Create Solution Queries

For each stage, create a complete solution query. Use the iterative LSP tools
for efficient development (see `codeql://prompts/ql_lsp_iterative_development`):

- Use #codeql_lsp_completion to explore types and member predicates while writing queries
- Use #codeql_lsp_definition to navigate to library class definitions
- Use #find_predicate_position + #quick_evaluate to test predicates in isolation
- Set `workspace_uri` to the solutions pack root for dependency resolution

- [ ] **Stage 1 Solution**: Simplest working version
  - Basic import statements
  - Minimal from/where/select clause
  - Should produce results (high recall, lower precision)

- [ ] **Intermediate Stages**: Progressive refinements
  - Add type constraints
  - Add helper predicates
  - Filter out false positives
  - Add data flow (if applicable)

- [ ] **Final Stage Solution**: Production-quality query
  - Complete metadata (@name, @description, @kind, @id)
  - Full data flow configuration (if applicable)
  - Proper sanitizers and barriers
  - Matches the original target query

### Phase 6: Create Exercise Queries

Transform solutions into exercises by removing implementation details:

- [ ] **Add scaffolding structure**

  ```ql
  /**
   * @name Exercise N - [Topic]
   * @description TODO: Complete this exercise
   * @kind problem
   * @id workshop/exercise-n
   */

  import language

  // TODO: Define predicate to find [something]
  predicate findSomething(Type t) {
    // Your implementation here
    none()
  }

  from Type t
  where findSomething(t)
  select t, "Found something"
  ```

- [ ] **Include helpful comments**
  - Hints about which AST classes to use
  - References to documentation
  - Expected behavior description

- [ ] **Ensure exercises compile**
  - Tool: #codeql_query_compile
  - Exercises should compile (even if tests fail)

### Phase 7: Create Tests

- [ ] **Copy test code to test directories**
  - Use same test code for exercises and solutions
  - Consider `initialize-qltests.sh` script for shared test code

- [ ] **Create .qlref files**
  - Point to query location: `../exercises/ExerciseN.ql`

- [ ] **Create .expected files**
  - Run solution queries to generate expected output
  - Tool: #codeql_test_run with `--learn` flag
  - Or: #codeql_test_accept after running tests

### Phase 8: Validate Workshop

- [ ] **Run all solution tests**
  - Tool: #codeql_test_run
  - Parameters: `tests` pointing to `solutions-tests/`
  - Verify: 100% pass rate

- [ ] **Verify exercise stubs compile**
  - Tool: #codeql_query_compile
  - Parameters: Each exercise query
  - Verify: No compilation errors

- [ ] **Test pack dependencies**
  - Tool: #codeql_pack_install
  - Run in each pack directory
  - Verify: Dependencies resolve correctly

### Phase 9: Create Documentation

- [ ] **Write README.md**
  - Workshop overview and objectives
  - Setup instructions
  - Stage-by-stage learning guide
  - AST/CFG examples from Phase 2

- [ ] **Include AST/CFG visualizations**
  - Save PrintAST output to `graphs/`
  - Reference in README for learning context

## External Workshop Considerations

When creating workshops outside the MCP server repository:

- [ ] **Install pack dependencies first**

  ```bash
  codeql pack install solutions
  codeql pack install solutions-tests
  ```

- [ ] **Check for initialization scripts**
  - Some workshops use `initialize-qltests.sh` to copy test files
  - Run before executing tests

- [ ] **Use absolute paths with MCP tools**
  - External paths must be absolute

## MCP Tools and Prompts Reference

| Tool/Prompt                    | Type   | Purpose                                                      |
| ------------------------------ | ------ | ------------------------------------------------------------ |
| #find_codeql_query_files       | Tool   | Locate query and related files                               |
| `explain_codeql_query`         | Prompt | Generate detailed explanations for workshop learning content |
| `document_codeql_query`        | Prompt | Create/update query documentation files                      |
| `ql_lsp_iterative_development` | Prompt | Iterative query development with LSP tools                   |
| #codeql_query_run              | Tool   | Run tools queries (PrintAST, PrintCFG, etc.)                 |
| #codeql_test_run               | Tool   | Validate tests pass                                          |
| #codeql_test_accept            | Tool   | Accept test results as expected baseline                     |
| #codeql_query_compile          | Tool   | Verify queries compile                                       |
| #codeql_pack_install           | Tool   | Install pack dependencies                                    |
| #codeql_resolve_metadata       | Tool   | Extract query metadata                                       |
| #codeql_lsp_completion         | Tool   | Explore types and member predicates during query writing     |
| #codeql_lsp_definition         | Tool   | Navigate to class/predicate definitions in library code      |
| #find_predicate_position       | Tool   | Locate predicate positions for quick_evaluate                |
| #quick_evaluate                | Tool   | Test individual predicates against a database                |
| #profile_codeql_query          | Tool   | Profile query execution to understand evaluation order       |
| #create_codeql_query           | Tool   | Scaffold new query structure                                 |

## Troubleshooting

| Issue                    | Likely Cause                    | Resolution                                          |
| ------------------------ | ------------------------------- | --------------------------------------------------- |
| "Nothing to extract"     | Missing test source files       | Run `initialize-qltests.sh` or copy from shared dir |
| Pack not found           | Older pack version not cached   | Run `codeql pack install` in pack directory         |
| Empty AST/CFG output     | Wrong sourceFiles/Function      | Use just filenames, verify function name spelling   |
| Tests fail unexpectedly  | Expected file outdated          | Re-run solution and accept with #codeql_test_accept |
| Exercise doesn't compile | Missing imports or syntax error | Ensure valid QL syntax with `none()` placeholder    |
