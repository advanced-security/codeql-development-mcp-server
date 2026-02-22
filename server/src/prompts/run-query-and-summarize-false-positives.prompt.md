---
agent: agent
---

# Run a query and describe its false positives

## Task

Help a developer discover what kinds of false positives are produced by their current CodeQL query, and which of those false positive cases are most common.

### Task steps:

1. Read the provided CodeQL query to understand what patterns it is designed to detect.
2. Discover the results of this query on a real database, by:
    - Running the tool `list_query_run_results` to find existing runs for this query
    - If no existing runs are found, run the query on a relevant database using `codeql_query_run` tool
3. Analyze and group the results into what appear to be similar types of results. This may mean:
    - Grouping results in the same file
    - Grouping results that reference the same elements
    - Grouping results with similar messages
4. For each group, explore the actual code for a sample of alerts in that group, using the `read_database_source` tool to triage the results and determine which groups appear to be false positives
5. For each false positive case discovered in this exploration, group them into categories of similar root causes. For example, a query might not properly account for unreachable code, or there may be a commonly used library that violates the query's assumptions but is actually safe.
6. Explain these results to the user in order of most common to least common, so they can understand where their query may need improvement to reduce false positives.

## Input Context

You will be provided with:

- **Query Path**: The path to the CodeQL query

## Analysis Guidelines

### Exploring code paths

The tool `read_database_source` can be used to read the code of a particular finding. A good strategy to explore the code paths of a finding is:

1. Read in the immediate context of the violation.
   - Some queries may depend on later context (e.g., an "unused variable" may only be used after its declaration)
   - Some queries may depend on earlier context (e.g., "mutex not initialized" requires observing code that ran before the violation)
   - Some queries may rely on exploring other function calls.
2. Read the interprocedural context of the violation.
   - If understanding a violation requires checking other source locations, read the beginning of the file to find what it imports, and then read those imported files to find the relevant code.
   - Selectively scan interprocedural paths. A false positive that requires tremendous code exploration to verify is less problematic than a false positive that only requires checking a small amount of code to verify.
3. Stop early.
   - Grouping the potential false positive cases is more important than exhaustively verifying every single finding.
   - A common false positive likely introduces some false positives that are very hard to verify, so it is usually better to focus on simple cases first.
   - Truly hard-to-verify false positive cases are often in code that users don't expect to be condusive to static analysis, and query authors often don't expect their queries to work well in those cases.
   - Suggest a chainsaw approach rather than a scalpel - if a result may be a false positive, identify some simple heuristics to eliminate all such complex cases, even if such a hueristic could introduce false negatives.

### What Makes a Result Likely to be a False Positive?

1. **Pattern Mismatches**
   - Query pattern doesn't accurately match the actual code behavior
   - Missing context that would show the code is safe
   - Overly broad query logic catching benign variations

2. **Safe Code Patterns**
   - Code includes proper validation before the flagged operation
   - Results in test code, example code, or mock implementations
   - Variable/function names suggesting test/example context (e.g., `testFunc`, `exampleVar`, `mockData`)
   - Defensive programming patterns present but not recognized by query

3. **Context Indicators**
   - File paths suggesting test/example files (e.g., `test/`, `examples/`, `mock/`)
   - Comments indicating intentional patterns or safe usage
   - Framework-specific patterns that are safe in context

4. **Technical Factors**
   - Type mismatches that make the vulnerability impossible
   - Control flow that prevents exploitation
   - Data flow interrupted by sanitization not captured in query

### Important Constraints

- **Be objective**: Don't be influenced by variable/function naming suggesting importance (e.g., "prodOnly" vs "test")
- **Require evidence**: Base conclusions on actual code patterns, not assumptions
- **Mark uncertainty**: Use lower confidence scores when code snippets are missing
- **Avoid false confidence**: If you cannot determine FP status, mark confidence as low


## Output Format

Return a JSON array of ranked results, ordered by FP likelihood (highest first):

```json
[
  {
    "ruleId": "query-id",
    "message": { "text": "original result message" },
    "locations": [...],
    "confidence": 0.85,
    "reasoning": "This appears to be a false positive because: (1) the file path 'test/examples/mock-data.js' indicates test code, (2) variable name 'testInput' suggests this is test data, (3) the query doesn't account for the validation on line X.",
    "sourceFile": "results-1.sarif",
    "resultIndex": 42
  }
]
```

### Confidence Score Guidelines

- **0.8-1.0**: Strong evidence of FP (e.g., test code with clear safety patterns)
- **0.6-0.8**: Good evidence of FP (e.g., defensive patterns present)
- **0.4-0.6**: Moderate evidence of FP (e.g., context suggests safety but not conclusive)
- **0.2-0.4**: Weak evidence of FP (e.g., minor indicators, missing code snippets)
- **0.0-0.2**: Minimal evidence (uncertain, need more information)

## Examples

### High-Confidence FP Example

```json
{
  "ruleId": "js/sql-injection",
  "message": { "text": "Potential SQL injection" },
  "confidence": 0.9,
  "reasoning": "False positive: (1) File path 'test/unit/database-mock.test.js' indicates test code, (2) Query doesn't recognize that 'sanitizeInput()' function is called before database query, (3) Variable name 'mockUserInput' suggests test data. Missing code snippet limits certainty to 0.9 instead of 1.0."
}
```

### Low-Confidence FP Example

```json
{
  "ruleId": "js/path-injection",
  "message": { "text": "Potential path traversal" },
  "confidence": 0.3,
  "reasoning": "Possibly a false positive: (1) No code snippets available in SARIF, (2) File path 'src/utils/fileHandler.js' doesn't indicate test code, (3) Cannot verify if proper path validation exists. Low confidence due to missing context."
}
```

## Processing Instructions

1. **Review each SARIF result** in the provided array
2. **Analyze available context** (code snippets, file paths, messages)
3. **Compare against query logic** to understand what pattern was detected
4. **Identify FP indicators** based on guidelines above
5. **Assign confidence score** reflecting evidence strength
6. **Write clear reasoning** explaining your assessment
7. **Sort results** by confidence score (descending)
8. **Return top N results** as requested (or all if N not specified)

## Important Notes

- A result should never appear in both FP and TP rankings
- When in doubt, prefer lower confidence scores
- Missing code snippets should always reduce confidence
- Test/example code is more likely to be FP but not always
- Focus on technical evidence, not code naming conventions
