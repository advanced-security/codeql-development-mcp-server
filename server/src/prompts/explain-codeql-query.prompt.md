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

### Phase 3: Code Structure Analysis (if test database exists)

- [ ] **Step 4: Generate PrintAST output**
  - Tool: #codeql_query_run
  - Parameters:
    - `queryName`: `"PrintAST"`
    - `queryLanguage`: provided language
    - `database`: test database path from Step 3
    - `sourceFiles`: test source file names
    - `format`: `"graphtext"`
  - Gather: AST hierarchy showing code structure representation

- [ ] **Step 5: Generate PrintCFG output** (for key functions)
  - Tool: #codeql_query_run
  - Parameters:
    - `queryName`: `"PrintCFG"`
    - `queryLanguage`: provided language
    - `database`: test database path from Step 3
    - `sourceFunction`: key function name(s) from test code
    - `format`: `"graphtext"`
  - Gather: Control flow graph showing execution paths

### Phase 4: Query Profiling and Evaluation Order

- [ ] **Step 6: Profile the query**
  - Tool: #profile_codeql_query
  - Parameters:
    - `queryPath`: the query file path
    - `database`: If `databasePath` input was provided and valid, use it; otherwise use test database from Step 3
  - Gather: Query evaluator log, pipeline execution order, timing data
  - **Critical**: This reveals the actual bottom-up evaluation order of predicates

- [ ] **Step 7: Analyze evaluator log** (for large logs)
  - Use CLI grep commands to extract key performance data from evaluator logs:
  - Replace `<evaluator-log-file>` with the actual log file path from Step 6

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

```markdown
## Query Overview

[2-3 sentence summary of what this query detects and why it matters]

## Query Metadata

| Property    | Value                                    |
| ----------- | ---------------------------------------- |
| Name        | [from @name]                             |
| Description | [from @description]                      |
| Kind        | [problem/path-problem/diagnostic/metric] |
| ID          | [from @id]                               |
| Tags        | [from @tags]                             |
| Precision   | [high/medium/low]                        |
| Severity    | [error/warning/recommendation]           |

## What This Query Detects

[Detailed explanation of the vulnerability/issue being detected, including:]

- Security implications (CWE, OWASP if applicable)
- Why this pattern is problematic
- Real-world attack scenarios or code quality impacts

## How the Query Works

### Bottom-Up Evaluation Order

[Explain how CodeQL evaluates this query from the profiler data. CodeQL always evaluates queries "bottom-up" - starting with base predicates and building up to the final select clause.]

**Evaluation Timeline** (from profiler data):

| Order | Predicate/Pipeline           | Time (ms) | Tuples  |
| ----- | ---------------------------- | --------- | ------- |
| 1     | [first evaluated predicate]  | [time]    | [count] |
| 2     | [second evaluated predicate] | [time]    | [count] |
| ...   | ...                          | ...       | ...     |

### Key Components

#### Imports and Dependencies

[List and explain imports]

#### Classes and Characteristic Predicates

[For each class, explain what it represents and its characteristic predicate]

#### Helper Predicates

[Explain each predicate, its purpose, parameters, and return type]

#### Data Flow Configuration (if applicable)

- **Sources**: [what defines a source]
- **Sinks**: [what defines a sink]
- **Sanitizers/Barriers**: [what stops the flow]
- **Additional Flow Steps**: [custom flow propagation]

#### Main Query (from/where/select)

[Explain the final query structure]

## Test Code Analysis

### AST Structure

[Summarize key insights from PrintAST output - what AST classes represent the test code patterns]

### Control Flow

[Summarize key insights from PrintCFG output - execution paths through key functions]

## Example Patterns

### Positive Test Cases (Should Match)

[Code patterns that should trigger the query, with explanation]

### Negative Test Cases (Should Not Match)

[Code patterns that should NOT trigger the query, with explanation]

## Performance Characteristics

[Based on profiler data, note:]

- Most expensive predicates (by evaluation time)
- Predicates with highest tuple counts
- Any potential performance optimizations

## Limitations and Edge Cases

[Note any patterns the query might miss or known false positive scenarios]
```

### Visual Explanation: Mermaid Evaluation Diagram

Generate a mermaid diagram showing the bottom-up evaluation order based on profiler data:

```mermaid
flowchart BU
    subgraph "Base Predicates (Evaluated First)"
        A[Predicate1] --> B[Predicate2]
        C[Class1.member] --> B
    end

    subgraph "Intermediate Predicates"
        B --> D[HelperPredicate]
        D --> E[DataFlowConfig.isSource]
        D --> F[DataFlowConfig.isSink]
    end

    subgraph "Flow Analysis"
        E --> G[DataFlow::hasFlow]
        F --> G
    end

    subgraph "Final Query (Evaluated Last)"
        G --> H[select clause]
    end
```

**Diagram Guidelines:**

- Direction: Bottom-Up (`BU`) to reflect actual evaluation
- Group predicates by evaluation phase
- Show dependencies between predicates
- Label with actual predicate/class names from the query
- Use timing data from profiler to order predicates accurately
- Annotate expensive operations with timing (e.g., `[500ms]`)

## Important Notes

- **Always use tools first**: Do not generate explanations based only on query source code. Use the MCP tools to gather actual runtime data.
- **Use grep for large files**: Evaluator logs can be huge. Use CLI grep commands to extract relevant data efficiently.
- **Evaluation order matters**: CodeQL evaluates bottom-up, not top-down. The profiler output reveals the true execution order.
- **Focus on learning**: This is for workshop content, so include educational context and explanations suitable for CodeQL learners.
- **Visual diagrams**: Always include a mermaid diagram showing evaluation order.
- **Reference documentation**: For actual QL evaluation semantics, see [Evaluation of QL programs](https://codeql.github.com/docs/ql-language-reference/evaluation-of-ql-programs/)
