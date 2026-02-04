---
mode: agent
---

# Evaluate SARIF Results for True Positives

## Task

Analyze SARIF results from a CodeQL query and identify the most likely **True Positives (TPs)** - results that correctly identify real security vulnerabilities or code quality issues.

## Input Context

You will be provided with:

- **Query ID**: The CodeQL query/rule identifier
- **Query Name**: Human-readable name of the query
- **Query Content**: Full CodeQL query implementation
- **SARIF Results**: Array of results to analyze
- **Code Snippets**: When available, code snippets from SARIF physical locations

## Analysis Guidelines

### What Makes a Result Likely to be a True Positive?

1. **Pattern Matches**
   - Query pattern accurately identifies the problematic code behavior
   - Result shows clear evidence of the vulnerability or issue
   - Code matches the exact pattern the query was designed to detect

2. **Vulnerable Code Patterns**
   - User input flows to dangerous sink without proper sanitization
   - Missing security checks or validation
   - Incorrect use of security-sensitive APIs
   - Clear violation of security best practices

3. **Production Code Context**
   - File paths suggesting production code (e.g., `src/`, `lib/`, `app/`)
   - NOT in test/example directories
   - Function/variable names suggesting real business logic
   - Code appears to be part of actual application functionality

4. **Technical Factors**
   - Data flow from untrusted source to dangerous operation
   - Missing or insufficient sanitization
   - Exploitable control flow
   - Real security or quality implications

### Important Constraints

- **Be objective**: Don't be influenced by variable/function naming suggesting importance
- **Require evidence**: Base conclusions on actual vulnerability patterns, not assumptions
- **Mark uncertainty**: Use lower confidence scores when code snippets are missing
- **Avoid false confidence**: If you cannot determine TP status, mark confidence as low
- **Consider false positives**: Be skeptical - real vulnerabilities often have subtle mitigations

### When Code Snippets Are Missing

If SARIF results lack `physicalLocation.region.snippet` or `contextRegion`:

- **Lower confidence scores** (typically 0.3-0.5 instead of 0.6-0.9)
- **Note the limitation** in reasoning
- **Rely more on**:
  - Result message text
  - File path analysis
  - Query logic understanding

## Output Format

Return a JSON array of ranked results, ordered by TP likelihood (highest first):

```json
[
  {
    "ruleId": "query-id",
    "message": { "text": "original result message" },
    "locations": [...],
    "confidence": 0.85,
    "reasoning": "This appears to be a true positive because: (1) the file path 'src/api/user-controller.js' indicates production code, (2) user input from request parameter flows directly to SQL query without sanitization, (3) no validation or prepared statement usage detected.",
    "sourceFile": "results-1.sarif",
    "resultIndex": 15
  }
]
```

### Confidence Score Guidelines

- **0.8-1.0**: Strong evidence of TP (e.g., clear vulnerability with exploit path)
- **0.6-0.8**: Good evidence of TP (e.g., production code with problematic pattern)
- **0.4-0.6**: Moderate evidence of TP (e.g., pattern matches but context unclear)
- **0.2-0.4**: Weak evidence of TP (e.g., possible issue but missing context)
- **0.0-0.2**: Minimal evidence (uncertain, need more information)

## Examples

### High-Confidence TP Example

```json
{
  "ruleId": "js/sql-injection",
  "message": { "text": "Unsanitized user input in SQL query" },
  "confidence": 0.9,
  "reasoning": "True positive: (1) File path 'src/controllers/UserController.js' indicates production code, (2) User input from req.query.userId flows directly to SQL query string concatenation, (3) No prepared statements or sanitization visible in code snippet, (4) Classic SQL injection pattern. Confidence is 0.9 not 1.0 due to possibility of sanitization elsewhere in call chain."
}
```

### Moderate-Confidence TP Example

```json
{
  "ruleId": "js/path-injection",
  "message": { "text": "Potential path traversal vulnerability" },
  "confidence": 0.6,
  "reasoning": "Likely true positive: (1) File path 'src/utils/fileHandler.js' suggests production utility code, (2) User-controlled filename parameter used in fs.readFile(), (3) No visible path validation, but code snippet is limited. Moderate confidence due to incomplete context - may have validation in calling code."
}
```

### Low-Confidence TP Example (Missing Snippets)

```json
{
  "ruleId": "java/unsafe-deserialization",
  "message": { "text": "Unsafe deserialization of user data" },
  "confidence": 0.4,
  "reasoning": "Possibly a true positive: (1) File path 'src/main/java/com/app/handlers/DataHandler.java' indicates production code, (2) Message suggests unsafe deserialization pattern, (3) No code snippets available in SARIF to verify actual vulnerability or confirm absence of mitigations. Confidence is low due to missing context."
}
```

## Processing Instructions

1. **Review each SARIF result** in the provided array
2. **Analyze available context** (code snippets, file paths, messages)
3. **Compare against query logic** to understand what pattern was detected
4. **Identify TP indicators** based on guidelines above
5. **Look for counter-evidence** (mitigations, safe patterns) that would make it an FP
6. **Assign confidence score** reflecting evidence strength
7. **Write clear reasoning** explaining your assessment
8. **Sort results** by confidence score (descending)
9. **Return top N results** as requested (or all if N not specified)

## Important Notes

- A result should never appear in both FP and TP rankings
- When in doubt, prefer lower confidence scores
- Missing code snippets should always reduce confidence
- Production code location increases TP likelihood but is not conclusive
- Focus on technical vulnerability evidence, not code naming conventions
- Consider that even production code can have intentional patterns that look vulnerable but are safe
