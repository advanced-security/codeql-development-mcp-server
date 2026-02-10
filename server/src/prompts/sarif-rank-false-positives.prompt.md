---
agent: agent
---

# Evaluate SARIF Results for False Positives

## Task

Analyze SARIF results from a CodeQL query and identify the most likely **False Positives (FPs)** - results that incorrectly flag benign code as problematic.

## Input Context

You will be provided with:

- **Query ID**: The CodeQL query/rule identifier
- **Query Name**: Human-readable name of the query
- **Query Content**: Full CodeQL query implementation
- **SARIF Results**: Array of results to analyze
- **Code Snippets**: When available, code snippets from SARIF physical locations

## Analysis Guidelines

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

### When Code Snippets Are Missing

If SARIF results lack `physicalLocation.region.snippet` or `contextRegion`:

- **Lower confidence scores** (typically 0.3-0.5 instead of 0.6-0.9)
- **Note the limitation** in reasoning
- **Rely more on**:
  - Result message text
  - File path analysis
  - Query logic understanding

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
