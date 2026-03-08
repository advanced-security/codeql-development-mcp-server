# Performance Optimization Patterns

This resource describes how to evaluate and improve the performance of CodeQL queries using the MCP server's profiling tools. Rather than prescribing generic optimization rules, it focuses on using the `profile_codeql_query_from_logs` tool and the `explain_codeql_query` prompt to make evidence-based performance improvements.

## Primary Performance Tool: `profile_codeql_query_from_logs`

The `profile_codeql_query_from_logs` tool is the primary means of evaluating the actual performance of a CodeQL query. It parses existing CodeQL evaluator logs into a structured performance profile without re-running the query.

### Workflow

1. **Run the query**: Use `codeql_query_run` with `evaluationOutput` set to a directory path. This generates evaluator log files.
2. **Generate a log summary**: Use `codeql_generate_log-summary` to create a human-readable summary of the evaluator log.
3. **Profile**: Use `profile_codeql_query_from_logs` to parse the evaluator log into a structured performance profile identifying expensive predicates, pipeline stages, and tuple counts.
4. **Identify bottlenecks**: Review the profile output for predicates with high evaluation times or unexpectedly large result sets.
5. **Refine**: Modify the query to address identified bottlenecks, then re-run and re-profile to verify improvements.

Alternatively, use `profile_codeql_query` to profile a query by running it against a specific database and analyzing the resulting evaluator log in a single step.

### What the Profile Shows

- **Predicate evaluation times** — which predicates are the most expensive
- **Tuple counts** — how many intermediate results each predicate produces
- **Pipeline stages** — the internal evaluation plan chosen by the CodeQL engine
- **RA (relational algebra) operations** — join orders, aggregation steps, and recursive evaluations

## Using `explain_codeql_query` for Performance Understanding

The `explain_codeql_query` prompt generates a detailed explanation of a query, including Mermaid evaluation diagrams that visualize the data flow and evaluation order. This is useful for understanding _why_ a query may be slow before profiling.

## Key Performance Concepts

The following concepts are relevant when interpreting profiling output. Verify these against actual profiling data rather than applying them blindly.

### Large Intermediate Result Sets

When a predicate produces significantly more tuples than expected, it may indicate:

- Missing or insufficiently restrictive filter conditions in the `where` clause
- A cross-product between two large relations that should be joined more tightly

**How to detect**: Look for predicates in the profile output with high tuple counts relative to their expected output size.

### Recursive Predicate Costs

Recursive predicates (e.g., transitive closures via `+` or `*`) can be expensive when the underlying relation is large. The profiler shows iteration counts and per-iteration tuple growth.

**How to detect**: Look for recursive predicates with many iterations or high per-iteration costs in the profile output.

### Join Order Sensitivity

The CodeQL evaluator chooses a join order for predicates in the `where` clause. In some cases, the chosen order may not be optimal.

**How to detect**: Look for pipeline stages where a large intermediate result is produced before being filtered down. The profiler shows tuple counts at each stage.

### Improving "Performance" — Two Dimensions

The word "performance" for CodeQL queries has two meanings:

1. **Runtime efficiency** — how fast the query evaluates. Addressed by reducing tuple counts, improving join orders, and simplifying recursive predicates.
2. **Result quality** — how accurate the query's output is (precision and recall). Addressed by refining source/sink/sanitizer definitions, adding or removing filter conditions, and testing against diverse codebases.

The `profile_codeql_query_from_logs` tool addresses runtime efficiency. For result quality, use the `run_query_and_summarize_false_positives` prompt and the `sarif_rank_false_positives` / `sarif_rank_true_positives` prompts.

## Performance Review for GitHub Actions CodeQL Scans

When reviewing CodeQL performance in the context of GitHub Actions CI/CD scans, key areas to examine include:

### Code Exclusion

Excluding non-essential files from analysis (vendored dependencies, generated code, test files) is one of the most impactful performance improvements. Any interpreted language or compiled language using `build-mode: none` can use a `paths-ignore` array in the CodeQL configuration file to exclude paths.

### Hardware Sizing

Recommended runner sizes based on lines of code:

- Small (< 100K lines): 8 GB RAM, 2 cores
- Medium (100K–1M lines): 16 GB RAM, 4–8 cores
- Large (> 1M lines): 64 GB RAM, 8 cores

### Monorepo Splitting

For monorepos with multiple independent applications separated by process/network boundaries, consider splitting CodeQL scans by application. This reduces database size and enables parallel scanning via Actions matrix strategies.

## Related Tools and Prompts

| Tool / Prompt                                    | Purpose                                                              |
| ------------------------------------------------ | -------------------------------------------------------------------- |
| `profile_codeql_query`                           | Profile a query run against a database (runs the query and profiles) |
| `profile_codeql_query_from_logs`                 | Profile from existing evaluator logs (no re-run needed)              |
| `codeql_generate_log-summary`                    | Generate a human-readable evaluator log summary                      |
| `codeql_query_run`                               | Execute a query (set `evaluationOutput` to capture logs)             |
| `explain_codeql_query` prompt                    | Understand query evaluation flow with Mermaid diagrams               |
| `run_query_and_summarize_false_positives` prompt | Assess result quality (precision)                                    |

## Related Resources

- `codeql://server/overview` — MCP server orientation guide
- `codeql://learning/query-basics` — Query structure and compilation tools
- `codeql://server/tools` — Complete tool reference
- `codeql://learning/test-driven-development` — TDD workflow for iterative query improvement
