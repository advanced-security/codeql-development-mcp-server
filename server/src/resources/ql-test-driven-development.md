# Test-Driven Development for CodeQL Queries

This guide describes the test-driven development (TDD) workflow for CodeQL query development using the QL MCP Server primitives. The MCP server provides tools, resources, and prompts that enable AI agents to orchestrate the complete TDD process.

## Overview

Test-driven development for CodeQL queries follows the classic TDD cycle:

1. **Write Tests First** - Define expected behavior through test cases
2. **Run Tests (Red)** - Verify tests fail initially
3. **Implement Query** - Write minimal query logic to pass tests
4. **Run Tests (Green)** - Verify tests pass
5. **Refactor** - Improve query while keeping tests green
6. **Repeat** - Add more tests for additional functionality

## MCP-Based TDD Workflow

The QL MCP Server provides tools that wrap CodeQL CLI commands, enabling programmatic orchestration of the TDD workflow.

### Step 1: Create Query Structure

Create the initial query structure using the `create_codeql_query` tool:

```typescript
{
  basePath: '/path/to/query/base',
  queryName: 'MySecurityQuery',
  language: 'javascript',
  description: 'Detects security vulnerability X'
}
```

This creates:

- Query file: `src/MySecurityQuery/MySecurityQuery.ql`
- Test reference: `test/MySecurityQuery/MySecurityQuery.qlref` (contains relative path to query)
- Test code: `test/MySecurityQuery/MySecurityQuery.js` (or appropriate language extension)

The `.qlref` file contains the relative path from the test pack's src directory to the query file:

```text
MySecurityQuery/MySecurityQuery.ql
```

Alternatively, you can create the structure manually:

```bash
mkdir -p /path/to/query/base/src/MySecurityQuery
mkdir -p /path/to/query/base/test/MySecurityQuery
# Create your .ql query file
touch /path/to/query/base/src/MySecurityQuery/MySecurityQuery.ql
# Create your .qlref file that references the query
echo "MySecurityQuery/MySecurityQuery.ql" > /path/to/query/base/test/MySecurityQuery/MySecurityQuery.qlref
# Create test code file
touch /path/to/query/base/test/MySecurityQuery/MySecurityQuery.js
```

### Step 2: Install Dependencies

Use `codeql_pack_install` to install required library dependencies:

```typescript
{
  packPath: '/path/to/query/base/src';
}
```

Repeat for the test pack to ensure test infrastructure is available.

### Step 3: Write Test Cases

Create test source files in the test directory that represent:

- **Positive cases**: Code that should trigger the query
- **Negative cases**: Code that should NOT trigger the query
- **Edge cases**: Boundary conditions and corner cases

Create a `.expected` file with the expected query results.

**MCP Resources to Reference:**

- `codeql://languages/{language}/ast` - Language AST reference
- `codeql://languages/{language}/security` - Security patterns

### Step 4: Extract Test Database

Use `codeql_test_extract` to create a minimal database from test files:

```typescript
{
  testPath: "/path/to/query/base/test/MySecurityQuery",
  searchPath: "/path/to/query/base"
}
```

This creates a `.testproj` database that can be queried.

### Step 5: Analyze Test Code Structure

Use `codeql_query_run` with the PrintAST query to understand the test code structure:

```typescript
{
  queryName: "PrintAST",
  queryLanguage: "javascript",
  database: "/path/to/test/database.testproj",
  output: "/path/to/ast-results.bqrs",
  format: "graphtext",
  interpretedOutput: "/path/to/ast-output/"
}
```

This generates a textual representation of the AST in graphtext format, helping you understand what classes and predicates to use.

### Step 6: Implement Query Logic

Write the query implementation based on:

- AST analysis from Step 5
- Language-specific patterns from MCP resources
- Expected results defined in test cases

**MCP Resources to Reference:**

- `codeql://languages/{language}/ast` - AST class hierarchy
- `codeql://languages/{language}/security` - Security query patterns
- `codeql://patterns/performance` - Performance optimization patterns

### Step 7: Compile Query

Use `codeql_query_compile` to validate syntax:

```typescript
{
  query: "/path/to/MySecurityQuery.ql",
  searchPath: "/path/to/query/base",
  checkOnly: true
}
```

Fix compilation errors before proceeding.

### Step 8: Run Tests

Use `codeql_test_run` to execute tests:

```typescript
{
  testPath: "/path/to/test/MySecurityQuery/MySecurityQuery.qlref",
  searchPath: "/path/to/query/base"
}
```

Compare actual results with expected results:

- **Tests pass**: Proceed to refactoring
- **Tests fail**: Return to Step 6 and adjust query logic

### Step 9: Accept Results (When Correct)

Use `codeql_test_accept` to update expected results:

```typescript
{
  testPath: "/path/to/test/MySecurityQuery",
  searchPath: "/path/to/query/base"
}
```

Only accept results when you've verified they are correct.

### Step 10: Refactor and Iterate

With passing tests:

1. Refactor query for clarity and performance
2. Run tests again to ensure behavior is preserved
3. Add new test cases for additional scenarios
4. Repeat the cycle

## Performance Optimization

The MCP server provides performance advantages:

- **Persistent Session State**: Database metadata cached across tool invocations
- **Native Format Interpretation**: Built-in result interpretation using `codeql bqrs interpret` with `format` parameter
- **Smart Caching**: Query compilation results reused when possible

### Performance Analysis Tools

- `codeql_generate_log_summary` - Analyze query performance from evaluator logs
- `codeql_pack_ls` - Validate pack dependencies
- `codeql_resolve_metadata` - Extract and cache query metadata

## MCP Tools Quick Reference

### Essential TDD Tools

| Tool                          | Purpose                  | Key Parameters                                      |
| ----------------------------- | ------------------------ | --------------------------------------------------- |
| `create_codeql_query`         | Create query scaffolding | basePath, queryName, language, description, queryId |
| `codeql_pack_install`         | Install dependencies     | packPath, force                                     |
| `codeql_test_extract`         | Create test database     | testPath, searchPath                                |
| `codeql_query_run`            | Execute query            | query/queryName, database, output, evaluationOutput |
| `codeql_query_compile`        | Compile and validate     | query, searchPath, checkOnly                        |
| `codeql_test_run`             | Run tests                | testPath, searchPath                                |
| `codeql_test_accept`          | Accept test results      | testPath, searchPath                                |
| `codeql_bqrs_decode`          | Decode results           | bqrsPath, format, output                            |
| `codeql_bqrs_info`            | Get result metadata      | bqrsPath, format                                    |
| `codeql_query_format`         | Format query code        | query, inPlace                                      |
| `codeql_generate_query_help`  | Generate documentation   | query, format, output                               |
| `codeql_generate_log_summary` | Analyze performance      | logPath, format, output                             |
| `codeql_resolve_metadata`     | Extract query metadata   | query, format                                       |
| `codeql_resolve_tests`        | Validate test structure  | testPath, format                                    |

### MCP Resources

| Resource URI                             | Description                     |
| ---------------------------------------- | ------------------------------- |
| `codeql://languages/{language}/ast`      | Language-specific AST reference |
| `codeql://languages/{language}/security` | Security patterns and templates |
| `codeql://patterns/performance`          | Performance optimization guide  |
| `codeql://learning/getting-started`      | CodeQL getting started guide    |
| `codeql://learning/query-basics`         | Query fundamentals              |

## Best Practices

### Writing Effective Tests

1. **Start Simple**: Begin with obvious positive and negative cases
2. **Cover Edge Cases**: Test boundary conditions and unusual inputs
3. **Test Real Code**: Use realistic code samples when possible
4. **Document Expected Behavior**: Explain why each test case should/shouldn't match

### Query Development

1. **Use AST Analysis**: Always run PrintAST on test cases first
2. **Reference Language Resources**: Consult MCP resources for patterns
3. **Compile Frequently**: Check syntax early and often
4. **Optimize Later**: Get correct results first, then optimize performance

### Test Organization

1. **One Concept Per Test**: Each test directory should test one scenario
2. **Clear Naming**: Use descriptive names for test files
3. **Maintain Expected Files**: Keep .expected files up to date
4. **Version Control**: Commit tests with query implementation

## Example Workflow

Here's a complete example of developing a SQL injection query:

```typescript
// 1. Generate scaffolding
{ language: "javascript", output: "./queries", name: "SqlInjection" }

// 2. Install dependencies
{ packPath: "./queries/src" }
{ packPath: "./queries/test" }

// 3. Write test code (manual step - create test files)

// 4. Extract test database
{ testPath: "./queries/test/SqlInjection", searchPath: "./queries" }

// 5. Analyze AST (for @kind graph queries like PrintAST)
{
  queryName: "PrintAST",
  queryLanguage: "javascript",
  database: "./queries/test/SqlInjection/SqlInjection.testproj",
  format: "graphtext",
  interpretedOutput: "./queries/ast-output/"
}

// 6. Implement query (manual step - write .ql file)

// 7. Compile
{ query: "./queries/src/SqlInjection/SqlInjection.ql", checkOnly: true }

// 8. Run tests
{ testPath: "./queries/test/SqlInjection/SqlInjection.qlref", searchPath: "./queries" }

// 9. Accept results (if correct)
{ testPath: "./queries/test/SqlInjection", searchPath: "./queries" }
```

## Troubleshooting

### Common Issues

**Tests won't extract:**

- Check searchPath includes pack directory
- Verify test code has valid syntax for the language
- Ensure qlpack.yml is properly configured

**Query won't compile:**

- Check import statements
- Verify pack dependencies are installed
- Review compilation error messages

**Tests fail unexpectedly:**

- Compare actual vs expected results
- Re-run PrintAST to verify AST understanding
- Check for typos in class/predicate names

**Performance issues:**

- Use `evaluator-log` with `codeql_query_run`
- Analyze logs with `codeql_generate_log_summary`
- Consult `codeql://patterns/performance` resource
