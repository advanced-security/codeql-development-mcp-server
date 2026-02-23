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
   - Truly hard-to-verify false positive cases are often in code that users don't expect to be conducive to static analysis, and query authors often don't expect their queries to work well in those cases.
   - Suggest a chainsaw approach rather than a scalpel - if a result may be a false positive, identify some simple heuristics to eliminate all such complex cases, even if such a heuristic could introduce false negatives.

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

Return a JSON array of false-positive _groups_, ordered by the estimated prevalence or importance of the false-positive pattern (highest first):

```json
[
  {
    "groupLabel": "Test and example code with safe validation",
    "patternSummary": "Results where the flagged operation occurs in test/example files and is always preceded by input validation.",
    "resultCount": 23,
    "estimatedFpProportion": 0.9,
    "confidence": 0.85,
    "commonRootCause": "The query does not recognize common test/example locations or custom validation helpers as making the pattern safe.",
    "sampleResults": [
      {
        "sourceFile": "results-1.sarif",
        "resultIndex": 42,
        "ruleId": "query-id",
        "message": { "text": "original result message" },
        "locations": []
      }
    ],
    "reasoning": "Based on manual inspection of several alerts in this group: (1) results are consistently located under 'test/' or 'examples/' directories, (2) there is clear validation before the flagged operation, and (3) the query does not model the custom validation helpers used in these files."
  }
]
```

### Field Descriptions

- **groupLabel**: Short human-readable name for the false-positive category.
- **patternSummary**: One-sentence description of the common pattern shared by results in this group.
- **resultCount**: Number of SARIF results that belong to this group.
- **estimatedFpProportion**: Estimated proportion of results in this group that are false positives (0.0–1.0).
- **confidence**: Confidence in the group-level assessment (see guidelines below).
- **commonRootCause**: Why the query produces false positives for this pattern.
- **sampleResults**: A small representative sample of results illustrating the pattern.
- **reasoning**: Detailed explanation of how the FP determination was made.

### Confidence Score Guidelines

- **0.8-1.0**: Strong evidence of FP (e.g., test code with clear safety patterns)
- **0.6-0.8**: Good evidence of FP (e.g., defensive patterns present)
- **0.4-0.6**: Moderate evidence of FP (e.g., context suggests safety but not conclusive)
- **0.2-0.4**: Weak evidence of FP (e.g., minor indicators, missing code snippets)
- **0.0-0.2**: Minimal evidence (uncertain, need more information)

## Examples

### High-Confidence FP Group Example

```json
{
  "groupLabel": "Sanitised inputs in test harnesses",
  "patternSummary": "Results in test files where sanitizeInput() is called before the database query.",
  "resultCount": 15,
  "estimatedFpProportion": 0.95,
  "confidence": 0.9,
  "commonRootCause": "Query does not model sanitizeInput() as a sanitizer.",
  "sampleResults": [
    {
      "sourceFile": "results-1.sarif",
      "resultIndex": 7,
      "ruleId": "js/sql-injection",
      "message": { "text": "Potential SQL injection" },
      "locations": []
    }
  ],
  "reasoning": "False positive group: (1) File paths like 'test/unit/database-mock.test.js' indicate test code, (2) Query doesn't recognize that 'sanitizeInput()' is called before database query, (3) All 15 results share this pattern."
}
```

### Low-Confidence FP Group Example

```json
{
  "groupLabel": "File utility handlers with unclear validation",
  "patternSummary": "Results in src/utils/ files where path validation may or may not be present.",
  "resultCount": 4,
  "estimatedFpProportion": 0.5,
  "confidence": 0.3,
  "commonRootCause": "Unclear whether custom path validation is sufficient.",
  "sampleResults": [
    {
      "sourceFile": "results-1.sarif",
      "resultIndex": 22,
      "ruleId": "js/path-injection",
      "message": { "text": "Potential path traversal" },
      "locations": []
    }
  ],
  "reasoning": "Possibly false positive: (1) No code snippets available in SARIF, (2) File path 'src/utils/fileHandler.js' doesn't indicate test code, (3) Cannot verify if proper path validation exists. Low confidence due to missing context."
}
```

## Processing Instructions

1. **Review SARIF results** and group them by common patterns
2. **Analyze available context** (code snippets, file paths, messages) for each group
3. **Compare against query logic** to understand what pattern was detected
4. **Identify FP indicators** based on guidelines above
5. **Assign group-level confidence scores** reflecting evidence strength
6. **Write clear reasoning** for each group explaining the assessment
7. **Sort groups** by estimated prevalence / importance (descending)

## Important Notes

- A result should belong to at most one FP group
- When in doubt, prefer lower confidence scores
- Missing code snippets should always reduce confidence
- Test/example code is more likely to be FP but not always
- Focus on technical evidence, not code naming conventions
