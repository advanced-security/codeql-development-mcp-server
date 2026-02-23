---
agent: agent
---

# Explain a CodeQL Query (Workshop Learning Content)

This prompt guides you through gathering comprehensive context about a CodeQL query using MCP server tools, then generating detailed explanations suitable for CodeQL workshop learning content.

## Purpose

The `explain_codeql_query` prompt is designed for creating **learning content** for CodeQL workshops and workshop improvements. It produces in-depth, educational explanations of how a query works, including visual diagrams.

For creating/updating **query documentation files** (`.md` or `.qhelp`), use the `document_codeql_query` prompt instead.

## Required Inputs

- **queryPath**: Path to the CodeQL query file (`.ql` or `.qlref`)
- **language**: Target programming language (actions, cpp, csharp, go, java, javascript, python, ruby, swift)
- **databasePath** (optional): Path to a real CodeQL database for profiling

## Agent AI Instructions

**Critical**: The evaluator logs and profiler outputs from CodeQL can be very large files. Instead of reading them line by line, use grep-style CLI commands to investigate these files efficiently. Key patterns to search for:

- Pipeline evaluation times: `grep -E "Pipeline|eval [0-9]+ms" <logfile>`
- Predicate evaluation order: `grep -E "Evaluation done|evaluated" <logfile>`
- Tuple counts: `grep -E "tuples|rows" <logfile>`
- RA operations: `grep -E "SCAN|JOIN|AGGREGATE" <logfile>`

## Choosing a Database

Several steps below require a CodeQL database. Determine which database to use:

1. **User-provided `databasePath`** — use this if provided and valid (check with #codeql_resolve_database).
2. **Test database** — if Step 1 finds tests, run them in Step 3 to create a `.testproj` database.
3. **No database available** — skip Steps 4-6, and base the explanation on source code analysis only.

Store the chosen database path as `$DB` for use in Steps 4-6.

## Workflow Checklist

You MUST use the following MCP server tools in sequence to gather context before generating your explanation:

### Phase 1: Query Discovery and Validation

- [ ] **Step 1: Locate query files**
  - Tool: #find_codeql_query_files
  - Parameters: `queryPath` = provided query path
  - Gather: Query source file, test files, expected results, metadata location
  - Note: If tests exist, record the test directory path for later steps

- [ ] **Step 2: Validate query structure**
  - Tool: #validate_codeql_query
  - Parameters: `query` = contents of the query file
  - Gather: Structural validation results, heuristic warnings/suggestions

### Phase 2: Test Execution and Database Creation

- [ ] **Step 3: Run existing tests** (if tests exist from Step 1)
  - Tool: #codeql_test_run
  - Parameters: `tests` = array of test directories from Step 1
  - Purpose: Ensures test database is created and current with test code
  - Gather: Test pass/fail status, test database path (`.testproj` directory)
  - **If no tests exist**: Skip this step. Use user-provided `databasePath` as `$DB`.

### Phase 3: Code Structure Analysis (requires `$DB`)

Skip this phase entirely if no database is available.

- [ ] **Step 4: Generate PrintAST output**
  - Tool: #codeql_query_run
  - Parameters:
    - `queryName`: `"PrintAST"`
    - `queryLanguage`: provided language
    - `database`: `$DB`
    - `sourceFiles`: test source file names (or representative source files from the database)
    - `format`: `"graphtext"`
  - Gather: AST hierarchy showing code structure representation

- [ ] **Step 5: Generate PrintCFG output** (for key functions)
  - Tool: #codeql_query_run
  - Parameters:
    - `queryName`: `"PrintCFG"`
    - `queryLanguage`: provided language
    - `database`: `$DB`
    - `sourceFunction`: key function name(s) from test code or query source
    - `format`: `"graphtext"`
  - Gather: Control flow graph showing execution paths

### Phase 4: Query Profiling and Evaluation Order (requires `$DB`)

Skip this phase entirely if no database is available.

- [ ] **Step 6a: Run the query with evaluator logging**
  - Tool: #codeql_query_run (or #codeql_database_analyze)
  - Run the query against `$DB` with evaluator logging enabled
  - The tool returns the path to the evaluator log file (`.jsonl`)

- [ ] **Step 6b: Profile from evaluator logs**
  - Tool: #profile_codeql_query_from_logs
  - Parameters:
    - `evaluatorLog`: path to the evaluator log file from Step 6a
  - Gather: Pipeline execution order, predicate timing data, tuple counts
  - **Critical**: This reveals the actual bottom-up evaluation order of predicates

- [ ] **Step 7: Analyze evaluator log** (for large logs)
  - Use CLI grep commands to extract key performance data from evaluator logs:
  - Replace `<evaluator-log-file>` with the log file path from Step 6a

  ```bash
  # Find pipeline evaluation order and timing
  grep -E "Pipeline.*evaluated|eval [0-9]+ms" <evaluator-log-file>

  # Find predicate evaluation completion
  grep "Evaluation done" <evaluator-log-file>

  # Extract tuple counts for understanding data sizes
  grep -E "tuples|resultSize" <evaluator-log-file>

  # Find the most expensive operations
  grep -E "eval [0-9]{4,}ms" <evaluator-log-file> | sort -t'[' -k2 -rn | head -20
  ```

- [ ] **Step 8: Quick evaluate specific predicates** (as needed)
  - First, locate the predicate: Tool: #find_predicate_position with `file` and `name`
  - Then evaluate: Tool: #quick_evaluate with `file`, `db`, and `symbol`
  - Use when: You need more context on how a specific predicate or class behaves
  - Note: #find_class_position finds `class` definitions only, not `module` definitions
  - Note: #find_predicate_position returns 1-based positions; LSP tools use 0-based

### Phase 5: Generate Explanation

Based on all gathered context, generate your explanation with both **verbal** and **visual** components.

## Key Aspects to Analyze in Profiler Output

Understanding the query profiler output is critical for explaining how the query actually works. Look for:

1. **Evaluation Order**: Which predicates are evaluated first (base predicates) vs last (dependent predicates)
2. **Pipeline Timing**: Time taken for each pipeline stage - indicates complexity
3. **Tuple Counts**: Number of results at each stage - shows data flow volume
4. **RA Operations**: The relational algebra operations (SCAN, JOIN, AGGREGATE) reveal query execution strategy
5. **Dependencies**: Which predicates depend on others (shown by evaluation order)

## Output Format

### Verbal Explanation Structure

Generate a single markdown document with these sections in order:

1. **Query Overview** — 2-3 sentence summary of what the query detects and why it matters.
2. **Query Metadata** — Table with: Name, Description, Kind, ID, Tags, Precision, Severity (from `@` annotations).
3. **What This Query Detects** — Security implications (CWE/OWASP if applicable), why the pattern is problematic, real-world attack scenarios.
4. **How the Query Works** — Two subsections:
   - **Bottom-Up Evaluation Order**: Evaluation timeline table (Order, Predicate/Pipeline, Time ms, Tuples) derived from profiler data. Explain that CodeQL evaluates bottom-up.
   - **Key Components**: Imports, classes and characteristic predicates, helper predicates, data flow configuration (sources, sinks, sanitizers, additional flow steps), main query `from`/`where`/`select`.
5. **Test Code Analysis** (if database was available) — AST structure insights from PrintAST, control flow insights from PrintCFG.
6. **Example Patterns** — Positive test cases (should match) and negative test cases (should not match) with explanations.
7. **Performance Characteristics** (if profiler data available) — Most expensive predicates, highest tuple counts, optimization opportunities.
8. **Limitations and Edge Cases** — Patterns the query might miss, known false positive scenarios.

### Visual Explanation: Mermaid Evaluation Diagram

Generate a `mermaid` `flowchart BU` (bottom-up) diagram showing the evaluation order derived from profiler data. Guidelines:

- Use subgraphs to group predicates by evaluation phase (base, intermediate, flow analysis, final select)
- Label nodes with actual predicate/class names from the query
- Show dependency edges between predicates
- Annotate expensive operations with timing (e.g., `[500ms]`)
- Direction must be `BU` to reflect bottom-up evaluation

## Important Notes

- **Always use tools first**: Do not generate explanations based only on query source code. Use the MCP tools to gather actual runtime data.
- **Use grep for large files**: Evaluator logs can be huge. Use CLI grep commands to extract relevant data efficiently.
- **Evaluation order matters**: CodeQL evaluates bottom-up, not top-down. The profiler output reveals the true execution order.
- **Focus on learning**: This is for workshop content, so include educational context and explanations suitable for CodeQL learners.
- **Visual diagrams**: Always include a mermaid diagram showing evaluation order.
- **Reference documentation**: For actual QL evaluation semantics, see [Evaluation of QL programs](https://codeql.github.com/docs/ql-language-reference/evaluation-of-ql-programs/)
