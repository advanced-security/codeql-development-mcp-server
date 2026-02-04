---
name: improve-codeql-query-detection-cpp
description: Improve detection capabilities of existing CodeQL queries for C++ by analyzing false positives and false negatives, refining query logic, and validating improvements through testing. Use this skill when you need to enhance the accuracy and coverage of C++ security or code quality queries using the CodeQL Development MCP Server tools.
---

# Improve CodeQL Query Detection for C++

This skill guides you through improving the detection capabilities of existing CodeQL queries for C++ code by reducing false positives and catching more true positives (reducing false negatives).

## When to Use This Skill

- Improving detection accuracy of an existing C++ CodeQL query
- Reducing false positives (incorrect alerts) from a query
- Catching more true vulnerabilities (reducing false negatives)
- Refining query logic based on real-world code patterns
- Enhancing query precision through better data flow analysis
- Optimizing query performance while maintaining accuracy

## Prerequisites

Before improving a query, ensure you have:

- An existing CodeQL query (`.ql` file) for C++ that you want to improve
- Existing test cases for the query
- Understanding of what the query is intended to detect
- Access to CodeQL Development MCP Server tools
- Examples of false positives or false negatives to address
- A query pack directory where your query is organized

## Improvement Workflow

### Phase 1: Analyze Current Query Behavior

#### Step 1: Understand the Query Intent

Review the existing query to understand:

1. **Query Purpose**: What vulnerability or code pattern is it detecting?
2. **Current Logic**: How does the query identify issues?
3. **Known Limitations**: Are there documented false positives or false negatives?

**Use MCP tool `codeql_query_compile`** to ensure the query compiles:

```json
{
  "queryPath": "<query-pack>/src/{QueryName}/{QueryName}.ql",
  "searchPath": ["<query-pack>"]
}
```

#### Step 2: Review Existing Test Cases

Examine current test files in your query pack's test directory:

1. **Positive cases**: Code patterns that should be detected
2. **Negative cases**: Code patterns that should NOT be detected
3. **Edge cases**: Boundary conditions

**Run existing tests** using `codeql_test_run`:

```json
{
  "testPath": "<query-pack>/test/{QueryName}",
  "searchPath": ["<query-pack>"]
}
```

Analyze test results to establish baseline behavior.

#### Step 3: Identify Improvement Areas

Categorize issues into:

**False Positives (Query alerts on safe code):**

- Query is too broad or imprecise
- Missing sanitization or validation checks
- Not accounting for safe coding patterns
- Ignoring proper null checks or bounds checks

**False Negatives (Query misses actual issues):**

- Query is too narrow or specific
- Missing data flow paths
- Not considering all vulnerable patterns
- Ignoring indirect or complex call chains

### Phase 2: Create Test Cases for Known Issues

Before modifying the query, create test cases that demonstrate the issues.

#### Add False Positive Test Cases

Create test code that is **safe** but currently triggers false alerts:

```cpp
// False positive: Query incorrectly flags this as unsafe
void safeFunction() {
    int* ptr = getUserInput();
    if (ptr != nullptr && validatePointer(ptr)) {
        *ptr = 42;  // Should NOT be detected - pointer is validated
    }
}
```

#### Add False Negative Test Cases

Create test code that is **unsafe** but currently not detected:

```cpp
// False negative: Query should detect this but doesn't
void unsafeFunction() {
    int* ptr = getPointerFromComplexPath();
    // Indirect null pointer dereference through helper
    processPointer(ptr);  // Should be detected - no null check
}

void processPointer(int* p) {
    *p = 42;  // Dereference without null check
}
```

#### Update Test Files

1. **Add new test cases** to existing `Example1.cpp` or create `Example2.cpp`
2. **Document each case** with clear comments explaining the issue
3. **Update `.expected` file** with expected results after fixes

**Re-extract test database** using `codeql_test_extract`:

```json
{
  "testPath": "<query-pack>/test/{QueryName}",
  "searchPath": ["<query-pack>"]
}
```

**Run tests** to confirm new test cases fail as expected:

```json
{
  "testPath": "<query-pack>/test/{QueryName}",
  "searchPath": ["<query-pack>"]
}
```

### Phase 3: Analyze C++ Code Patterns

Use AST analysis to understand code structure better.

#### Run PrintAST Query

Use `codeql_query_run` to analyze AST structure:

```json
{
  "query": "<query-pack>/src/PrintAST/PrintAST.ql",
  "database": "<query-pack>/test/{QueryName}/{QueryName}.testproj",
  "searchPath": ["<query-pack>"],
  "format": "text"
}
```

#### Decode AST Results

Use `codeql_bqrs_decode` to view human-readable AST:

```json
{
  "format": "text",
  "bqrsFile": "<path-to-results.bqrs>",
  "outputPath": "scratch/ast-analysis.txt"
}
```

#### Study Patterns

Identify AST patterns for:

- Safe code that should be excluded (for false positives)
- Unsafe code that should be included (for false negatives)
- Guard conditions and validation patterns
- Data flow paths through functions

### Phase 4: Improve Query Logic

#### Strategy A: Reduce False Positives

Add predicates to recognize validation and sanitization:

- Check for guard conditions (null checks, bounds checks)
- Recognize validation function calls
- Add barriers to stop flow at validation points
- Exclude expressions that have been validated

#### Strategy B: Catch More Issues (Reduce False Negatives)

Expand detection to catch more cases:

- Include more source patterns (parameters, return values, global variables)
- Add custom flow steps for wrapper functions and field access
- Enhance data flow configuration with additional sources and sinks
- Consider indirect flows through helper functions

#### Strategy C: Use Flow-State for Context-Sensitive Analysis

For complex scenarios requiring validation tracking:

- Define flow states (e.g., validated vs unvalidated)
- Track state changes through validation functions
- Use `DataFlow::StateConfigSig` for context-sensitive analysis
- Apply barriers based on flow state

### Phase 5: Test and Validate Improvements

#### Compile Improved Query

Use `codeql_query_compile` to check for errors:

```json
{
  "queryPath": "<query-pack>/src/{QueryName}/{QueryName}.ql",
  "searchPath": ["<query-pack>"]
}
```

Fix any compilation errors before proceeding.

#### Run Tests

Use `codeql_test_run` to validate improvements:

```json
{
  "testPath": "<query-pack>/test/{QueryName}",
  "searchPath": ["<query-pack>"]
}
```

**Analyze Results:**

✅ **Success Indicators:**

- False positives eliminated (safe code no longer flagged)
- False negatives caught (unsafe code now detected)
- All positive test cases still detected
- No new false positives introduced

❌ **Need Further Refinement:**

- Still missing some unsafe patterns
- Still flagging some safe patterns
- Query breaks existing valid detections

#### Iterate on Query Logic

If tests don't pass:

1. **Analyze differences**: Compare actual vs expected results
2. **Refine predicates**: Adjust source/sink/barrier definitions
3. **Add debug output**: Use `select` statements to inspect intermediate results
4. **Re-run tests**: Repeat until all tests pass

### Phase 6: Expand Test Coverage

Once core improvements work, add more test scenarios:

- STL containers and iterators
- Template instantiations
- Class hierarchies and inheritance
- Modern C++ features (lambdas, smart pointers, move semantics)
- Different compilation modes or standards

For each scenario:

1. Add test code to existing or new test files
2. Update `.expected` file with expected results
3. Re-extract test database
4. Run tests and verify results

### Phase 7: Refactor and Optimize

Once tests pass, improve code quality:

1. **Extract Helper Predicates**: Move complex logic into reusable predicates
2. **Add QLDoc Documentation**: Update query metadata and documentation
3. **Format Query**: Use `codeql_query_format` for consistent formatting
4. **Verify Integration**: Run language-level tests to ensure no regressions

### Phase 8: Performance Optimization (Optional)

If query performance is an issue, consider:

- **Materialization**: Use `cached` for expensive predicates that are reused
- **Limit Search Space**: Focus on relevant functions or code patterns
- **Choose Appropriate Flow**: Use local flow for intra-procedural, global flow for inter-procedural analysis

## C++-Specific Considerations

When improving C++ queries, consider these language-specific aspects:

### Memory Safety

- Track `new`/`delete` pairs for memory leaks
- Detect use-after-free patterns
- Check buffer bounds and array access
- Analyze pointer aliasing and lifetime

### Data Flow Patterns

- Flow through references (`&`, `&&`)
- Smart pointer operations (`unique_ptr`, `shared_ptr`)
- Virtual function dispatch and polymorphism
- Template instantiation tracking

### Common C++ Constructs

- RAII patterns and resource management
- Move semantics and rvalue references
- Lambda expressions and captures
- STL containers and iterators

## MCP Tools Reference

### Query Development and Testing

- **`codeql_query_compile`**: Compile queries and check for syntax errors
- **`codeql_query_format`**: Format query files for consistency
- **`codeql_query_run`**: Run queries (PrintAST, etc.) for analysis
- **`codeql_test_extract`**: Extract test databases from C++ code
- **`codeql_test_run`**: Run tests and compare with expected results
- **`codeql_test_accept`**: Accept new baseline (use with caution)

### Result Analysis

- **`codeql_bqrs_decode`**: Decode binary results to readable format
- **`codeql_bqrs_interpret`**: Interpret results in various formats
- **`codeql_bqrs_info`**: Get metadata about result files

## Common Improvement Strategies

### Strategy 1: Add Validation Recognition

Reduce false positives by recognizing sanitization and validation:

```ql
predicate isSanitized(Expr e) {
  exists(FunctionCall sanitize |
    sanitize.getTarget().hasName(["sanitize", "validate", "check"]) and
    DataFlow::localExprFlow(sanitize, e)
  )
}
```

### Strategy 2: Expand Source Coverage

Reduce false negatives by including more sources:

```ql
predicate isSource(DataFlow::Node source) {
  source.asExpr().(FunctionCall).getTarget().hasName(["getInput", "getUserData"]) or
  source.asParameter().getFunction().hasName(["main", "handleRequest"])
}
```

### Strategy 3: Add Data Flow Barriers

Stop flow at validation points:

```ql
predicate isBarrier(DataFlow::Node node) {
  exists(FunctionCall sanitize |
    sanitize.getTarget().hasName(["sanitize", "escape"]) and
    sanitize.getAnArgument() = node.asExpr()
  )
}
```

## Debugging Techniques

When flow paths are missing or incorrect:

- Use **partial flow** to debug missing edges: `FlowExploration::hasPartialFlow(source, sink, _)`
- Add **debug selects** to inspect intermediate results
- Use **PrintAST** to understand code structure better

## Quality Checklist

Before considering query improvements complete:

- [ ] False positives identified and addressed
- [ ] False negatives identified and addressed
- [ ] New test cases added for both false positives and false negatives
- [ ] Test database re-extracted with new test cases
- [ ] All tests pass (actual matches expected)
- [ ] Query compiles without errors or warnings
- [ ] Query formatted with `codeql_query_format`
- [ ] QLDoc documentation updated
- [ ] Helper predicates extracted for clarity
- [ ] Performance is acceptable
- [ ] Integration tests pass (language-level tests)
- [ ] No regressions in existing valid detections

## Common Pitfalls

❌ **Don't:**

- Over-generalize and introduce new false positives
- Remove valid detections while fixing false positives
- Make changes without corresponding test cases
- Accept test results without verification
- Ignore performance implications of changes
- Skip integration testing

✅ **Do:**

- Create test cases before modifying query
- Make incremental changes and test frequently
- Document why each change improves detection
- Balance precision and recall
- Consider real-world C++ code patterns
- Validate improvements with comprehensive tests
- Use AST analysis to understand code structure

## Related Resources

- [C++ Query Development Prompt](https://github.com/advanced-security/codeql-development-template/blob/main/.github/prompts/cpp_query_development.prompt.md) - Comprehensive C++ query development guide
- [Create CodeQL Query Unit Test for C++](../create-codeql-query-unit-test-cpp/create-codeql-query-unit-test-cpp.md) - Testing guidance
- [Test-Driven CodeQL Query Development](../create-codeql-query-tdd-generic/SKILL.md) - TDD workflow for queries
- [CodeQL C++ Documentation](https://codeql.github.com/docs/codeql-language-guides/codeql-for-cpp/) - Official C++ AST reference

## Success Criteria

Your query improvement is successful when:

1. ✅ False positives are eliminated or significantly reduced
2. ✅ False negatives are caught (improved coverage)
3. ✅ All existing valid detections still work
4. ✅ Comprehensive test coverage for improvements
5. ✅ All tests pass consistently
6. ✅ Query is well-documented and maintainable
7. ✅ Performance is acceptable for production use
8. ✅ No regressions in integration tests
