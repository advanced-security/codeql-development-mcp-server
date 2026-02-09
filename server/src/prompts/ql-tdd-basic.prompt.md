---
agent: agent
---

# Test-Driven CodeQL Query Development Checklist

Use this checklist to guide test-driven development of CodeQL queries. Follow the TDD cycle: write tests first, implement query logic, and iterate until tests pass.

For advanced techniques including AST/CFG visualization, see: `codeql://prompts/ql-tdd-advanced`
For detailed guidance, reference the MCP resource: `codeql://learning/test-driven-development`

## TDD Workflow Checklist

### Phase 1: Project Setup

- [ ] **Create Query Structure**
  - Tool: `create_codeql_query`
  - Specify: basePath, queryName, language, description (optional)
  - Creates: src/QueryName/QueryName.ql, test/QueryName/QueryName.qlref, test/QueryName/test-code-file
  - The .qlref file will contain the relative path: `QueryName/QueryName.ql`
  - Verify: directory structure follows CodeQL conventions with intermediate directories

- [ ] **Install Pack Dependencies**
  - Tool: `codeql_pack_install`
  - Install src pack dependencies
  - Install test pack dependencies
  - Verify: imports resolve without errors

### Phase 2: Test Design (Red Phase)

- [ ] **Design Test Cases**
  - Create positive test cases (should match)
  - Create negative test cases (should not match)
  - Create edge case tests
  - Document expected behavior in comments

- [ ] **Define Expected Results**
  - Create .expected file with anticipated matches
  - Specify exact match locations (file, line, column)
  - Include expected alert messages

- [ ] **Extract Test Database**
  - Tool: `codeql_test_extract`
  - Extract database from test code
  - Verify: .testproj directory created

### Phase 3: Analysis and Understanding

- [ ] **Analyze Test Code AST**
  - Tool: `codeql_query_run` with queryName: "PrintAST"
  - Use format: "graphtext" for @kind graph queries
  - Review AST structure and identify relevant classes

- [ ] **Explore Available Classes and Predicates**
  - Tool: `codeql_lsp_completion` at cursor position in `from` clause
  - Set `workspace_uri` to the pack root for dependency resolution
  - Browse completions with documentation to discover relevant types

- [ ] **Navigate to Type Definitions**
  - Tool: `codeql_lsp_definition` on a class or predicate name
  - Review the definition to understand available member predicates
  - Tool: `codeql_lsp_references` to find usage examples in the pack

- [ ] **Reference Language Documentation**
  - Resource: `codeql://languages/{language}/ast`
  - Resource: `codeql://languages/{language}/security` (if applicable)
  - Identify AST classes and predicates needed

### Phase 4: Implementation (Green Phase)

- [ ] **Write Query Metadata**
  - Add @name annotation
  - Add @description annotation
  - Add @kind annotation (problem, path-problem, graph, etc.)
  - Add @id and other required metadata

- [ ] **Implement Query Logic**
  - Import required libraries
  - Define necessary classes (if any)
  - Define helper predicates
  - Implement main query clause

- [ ] **Compile Query**
  - Tool: `codeql_query_compile`
  - Fix any compilation errors
  - Verify: query compiles successfully

- [ ] **Run Tests**
  - Tool: `codeql_test_run`
  - Compare actual vs expected results
  - If tests fail: adjust query logic and recompile
  - If tests pass: proceed to validation

### Phase 5: Validation and Acceptance

- [ ] **Verify Test Results**
  - Review all test matches
  - Confirm no false positives
  - Confirm no false negatives
  - Check edge cases behave correctly

- [ ] **Accept Test Results** (only when correct)
  - Tool: `codeql_test_accept`
  - Update .expected files
  - Commit accepted results

### Phase 6: Refactoring and Enhancement

- [ ] **Refactor Query**
  - Improve code clarity
  - Extract common logic to predicates
  - Add code comments and documentation
  - Tool: `codeql_query_format` for consistent formatting

- [ ] **Optimize Performance** (if needed)
  - Run with evaluator-log enabled
  - Tool: `codeql_generate_log_summary`
  - Resource: `codeql://patterns/performance`
  - Optimize expensive operations

- [ ] **Generate Documentation**
  - Tool: `codeql_generate_query_help`
  - Review and enhance QLDoc comments
  - Document query purpose and limitations

### Phase 7: Additional Testing

- [ ] **Add More Test Cases**
  - Identify additional scenarios
  - Add tests for new edge cases
  - Extract new test databases
  - Run expanded test suite

- [ ] **Validate Against Real Code** (optional)
  - Tool: `codeql_database_create` for real codebase
  - Tool: `codeql_query_run` against real database
  - Review results for false positives/negatives

## Quick Command Reference

### Essential Tools

```typescript
// Create query structure
create_codeql_query: {
  basePath: "/path/to/query/base",
  queryName: "MySecurityQuery",
  language: "javascript",
  description: "Detects security vulnerability X"
}

// Install dependencies
codeql_pack_install: {
  packPath: "/path/to/pack"
}

// Extract test database
codeql_test_extract: {
  testPath: "/path/to/test/QueryName",
  searchPath: "/path/to/base"
}

// Analyze AST (for @kind graph queries)
codeql_query_run: {
  queryName: "PrintAST",
  queryLanguage: "javascript",
  database: "/path/to/test.testproj",
  format: "graphtext",
  interpretedOutput: "/path/to/ast-output/"
}

// Compile query
codeql_query_compile: {
  query: "/path/to/Query.ql",
  searchPath: "/path/to/base",
  checkOnly: true
}

// Run tests
codeql_test_run: {
  testPath: "/path/to/test/Query.qlref",
  searchPath: "/path/to/base"
}

// Accept results
codeql_test_accept: {
  testPath: "/path/to/test/Query",
  searchPath: "/path/to/base"
}
```

## TDD Principles to Remember

1. **Red → Green → Refactor**: Always start with failing tests
2. **Test First**: Write tests before implementation
3. **Small Steps**: Make minimal changes to pass each test
4. **Frequent Testing**: Run tests after each change
5. **One Concept Per Test**: Each test should verify one behavior
6. **Keep Tests Simple**: Test code should be easy to understand
7. **Refactor Confidently**: Tests enable safe refactoring

## Common Pitfalls to Avoid

- ❌ Writing query before tests
- ❌ Accepting test results without verification
- ❌ Skipping compilation step
- ❌ Not using PrintAST to understand test code
- ❌ Not using `codeql_lsp_completion` to discover available types
- ❌ Creating tests that are too complex
- ❌ Ignoring false positives in results
- ❌ Not refactoring after tests pass

## Success Criteria

Your query development is complete when:

- ✅ All tests pass
- ✅ No false positives in test results
- ✅ No false negatives (all expected cases caught)
- ✅ Query compiles without errors or warnings
- ✅ Code is well-documented with QLDoc comments
- ✅ Performance is acceptable
- ✅ Edge cases are covered by tests
- ✅ Query follows CodeQL best practices

## Next Steps After Completion

1. **Integration Testing**: Test against real codebases
2. **Peer Review**: Have another developer review the query
3. **Documentation**: Update project documentation
4. **Regression Testing**: Add to CI/CD pipeline
5. **Monitor Performance**: Track query performance over time
