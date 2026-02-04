---
name: create-codeql-query-tdd-generic
description: Develop CodeQL tool queries using test-driven development with the CodeQL Development MCP Server. Use this when creating new CodeQL queries or enhancing existing ones for any supported language (actions, cpp, csharp, go, java, javascript, python, ruby, swift).
---

# Test-Driven CodeQL Query Development

This skill guides you through developing CodeQL tool queries using test-driven development (TDD) with the CodeQL Development MCP Server tools.

## Context

You are developing CodeQL queries organized in query packs:

- **Query packs**: Typically `<query-pack>/src/` - Contains tool query implementations
- **Test packs**: Typically `<query-pack>/test/` - Contains test cases and expected results
- **Supported languages**: actions, cpp, csharp, go, java, javascript, python, ruby, swift

Adapt the directory structure to match your project's query pack organization.

## TDD Workflow

### Phase 1: Requirements and Planning

Before writing any code:

1. **Understand the Query Purpose**
   - What should this tool query detect or analyze?
   - What inputs does it need?
   - What outputs should it produce?

2. **Define Test Scenarios**
   - Positive cases: Code that should match
   - Negative cases: Code that should not match
   - Edge cases: Boundary conditions

### Phase 2: Write Tests First (Red)

#### Create Test Structure

For a new query named `{QueryName}` for language `{language}`:

1. **Create test directory** within your query pack:

   ```
   <query-pack>/test/{QueryName}/
   ```

2. **Create test source code** (`test.{ext}`):
   - Include positive test cases (code that should be detected)
   - Include negative test cases (code that should NOT be detected)
   - Include edge cases (unusual but valid scenarios)
   - Add comments explaining what each section tests

3. **Create expected results file** (`{QueryName}.expected`):

   ```
   | file    | line | col | endLine | endCol | message           |
   | test.js | 2    | 1   | 4       | 2      | Function: myFunc  |
   ```

4. **Create test reference file** (`{QueryName}.qlref`):
   ```
   src/{QueryName}/{QueryName}.ql
   ```
   (Path relative to the query pack directory)

#### Extract Test Database

Use the `codeql_test_extract` tool:

```json
{
  "testPath": "<query-pack>/test/{QueryName}",
  "searchPath": ["<query-pack>"]
}
```

This creates a test database at `<query-pack>/test/{QueryName}/{QueryName}.testproj/`.

### Phase 3: Analyze Test Code Structure

Before implementing the query, understand the AST structure of your test code:

1. **Run PrintAST query** using `codeql_query_run` (if available in your query pack):

   ```json
   {
     "queryPath": "<query-pack>/src/PrintAST/PrintAST.ql",
     "database": "<query-pack>/test/{QueryName}/{QueryName}.testproj",
     "searchPath": ["<query-pack>"],
     "outputFormat": "sarif-latest"
   }
   ```

2. **Interpret results** using `codeql_bqrs_interpret`:

   ```json
   {
     "file": "<path-to-results.bqrs>",
     "format": "graphtext",
     "output": "<path-to-output.txt>",
     "t": ["kind=graph", "id=<query-id>"]
   }
   ```

3. **Study the AST output** to identify:
   - Relevant AST node classes
   - Properties to query
   - Relationships between nodes
   - Predicates to use

### Phase 4: Implement Query (Green)

#### Create Query Implementation

1. **Create query directory** within your query pack:

   ```
   <query-pack>/src/{QueryName}/
   ```

2. **Write query** (`{QueryName}.ql`):

   ```ql
   /**
    * @name {Query Name}
    * @description {Detailed description}
    * @kind problem
    * @id {language}/tools/{query-name}
    */

   import {language}

   from {ASTClass} element
   where
     // Implement logic based on AST analysis
     {conditions}
   select element, "{Message}"
   ```

3. **Compile query** using `codeql_query_compile`:

   ```json
   {
     "queryPath": "<query-pack>/src/{QueryName}/{QueryName}.ql",
     "searchPath": ["<query-pack>"]
   }
   ```

   Fix any compilation errors before proceeding.

4. **Run tests** using `codeql_test_run`:

   ```json
   {
     "testPath": "<query-pack>/test/{QueryName}",
     "searchPath": ["<query-pack>"]
   }
   ```

   **Interpret Results**:
   - ✅ Tests pass: Move to refactoring
   - ❌ Tests fail: Compare actual vs expected, adjust query, repeat

### Phase 5: Refactor (Clean)

Once tests pass:

1. **Improve Code Quality**
   - Extract complex logic to predicates
   - Add helpful comments
   - Improve variable names
   - Enhance QLDoc documentation

2. **Format query** using `codeql_query_format`:

   ```json
   {
     "queryPath": "<query-pack>/src/{QueryName}/{QueryName}.ql",
     "inPlace": true
   }
   ```

3. **Re-run tests** using `codeql_test_run` to verify refactoring didn't break anything.

### Phase 6: Expand Test Coverage

1. **Add more test cases**: Create additional test files (`test2.{ext}`, `test3.{ext}`)
2. **Update expected results**: Add new entries to `.expected` file
3. **Re-extract** using `codeql_test_extract`
4. **Run tests** and adjust query if needed

### Phase 7: Integration

1. **Install pack dependencies** using `codeql_pack_install`:

   ```json
   {
     "packPath": "<query-pack>/src"
   }
   ```

   ```json
   {
     "packPath": "<query-pack>/test"
   }
   ```

2. **Verify all tests pass** by running tests for the entire query pack:
   ```json
   {
     "testPath": "<query-pack>/test",
     "searchPath": ["<query-pack>"]
   }
   ```

## MCP Tools Used

This skill uses the following CodeQL Development MCP Server tools:

- **`codeql_test_extract`**: Extract test databases from test code
- **`codeql_test_run`**: Run CodeQL query tests and compare with expected results
- **`codeql_test_accept`**: Accept test results as new baselines (when appropriate)
- **`codeql_query_compile`**: Compile CodeQL queries and check for errors
- **`codeql_query_run`**: Run queries against databases (e.g., PrintAST for AST analysis)
- **`codeql_query_format`**: Format CodeQL query files
- **`codeql_bqrs_interpret`**: Interpret BQRS result files to human-readable formats (SARIF, CSV, graph formats)
- **`codeql_pack_install`**: Install query pack dependencies

## Example Tool Queries

### PrintAST

- **Purpose**: Display AST structure for source files
- **Use Case**: Understanding code structure before writing queries

### CallGraphFrom

- **Purpose**: Find all functions called from a given function
- **Use Case**: Analyzing code dependencies and call chains

### CallGraphTo

- **Purpose**: Find all functions that call a given function
- **Use Case**: Impact analysis and reverse dependencies

## Quality Checklist

Before considering your query complete:

- [ ] Tests are comprehensive (positive, negative, edge cases)
- [ ] All tests pass
- [ ] Query compiles without warnings
- [ ] Code is well-documented with QLDoc comments
- [ ] Query follows CodeQL best practices
- [ ] All tests pass at language level
- [ ] Code is properly formatted

## Common Pitfalls

- ❌ Implementing query before writing tests
- ❌ Not analyzing AST structure with PrintAST first
- ❌ Accepting test results without verification
- ❌ Writing tests that are too complex
- ❌ Not testing edge cases
- ❌ Ignoring compilation warnings
- ❌ Skipping the refactoring phase

## Success Criteria

Your query development is successful when:

1. All tests pass consistently
2. Query behavior matches specification
3. Code is clean and well-documented
4. Integration tests pass
5. Query can be invoked via MCP server
6. Performance is acceptable for intended use cases
