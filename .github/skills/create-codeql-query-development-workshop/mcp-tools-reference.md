# MCP Tools Reference for Workshop Creation

This document provides detailed guidance on using CodeQL Development MCP Server tools to create workshop materials.

## Tool Categories

### Query Analysis Tools

- `find_codeql_query_files` - Locate query files and related resources
- `explain_codeql_query` - Understand query purpose and implementation
- `codeql_resolve_metadata` - Extract query metadata

### Test Management Tools

- `codeql_test_extract` - Create test databases
- `codeql_test_run` - Execute query tests
- `codeql_test_accept` - Update expected results

### Query Execution Tools

- `codeql_query_run` - Run queries against databases
- `codeql_query_compile` - Validate query syntax
- `codeql_bqrs_interpret` - Generate output from query results

### Database Tools

- `codeql_database_create` - Create CodeQL databases
- `codeql_resolve_database` - Validate database structure

## Query Analysis Phase

### Find Query Files

Use `find_codeql_query_files` to locate all files related to a source query:

```json
{
  "queryPath": "/path/to/production/Query.ql"
}
```

Returns:

```json
{
  "queryFile": "/path/to/production/Query.ql",
  "testDirectory": "/path/to/production/test/QueryTest/",
  "testFiles": ["test.cpp", "QueryTest.expected", "QueryTest.qlref"],
  "metadata": {
    "name": "Find unsafe pointers",
    "kind": "problem",
    "id": "cpp/unsafe-pointer"
  }
}
```

### Explain Query

Use `explain_codeql_query` to understand query logic:

```json
{
  "queryPath": "/path/to/production/Query.ql"
}
```

Returns natural language explanation of:

- Query purpose
- Key predicates and their roles
- Data flow configurations
- Sources and sinks
- Filter conditions

Use this to plan workshop stages and decomposition.

### Extract Metadata

Use `codeql_resolve_metadata` to get structured metadata:

```json
{
  "queryPath": "/path/to/production/Query.ql"
}
```

Returns:

```json
{
  "name": "Find unsafe pointers",
  "description": "Identifies potentially unsafe pointer usage",
  "kind": "problem",
  "problem.severity": "warning",
  "id": "cpp/unsafe-pointer",
  "precision": "high"
}
```

## Test Database Creation

### Extract Test Database

Use `codeql_test_extract` to create databases for test directories:

```json
{
  "testPath": "<workshop_dir>/exercises-tests/Exercise1",
  "searchPath": ["<workshop_dir>/exercises"]
}
```

This creates `Exercise1.testproj/` in the test directory.

For solutions tests:

```json
{
  "testPath": "<workshop_dir>/solutions-tests/Exercise1",
  "searchPath": ["<workshop_dir>/solutions"]
}
```

### Validate Database

Use `codeql_resolve_database` to check database structure:

```json
{
  "database": "<workshop_dir>/exercises-tests/Exercise1/Exercise1.testproj"
}
```

Returns database metadata including language and source root.

## Test Execution

### Run Tests

Use `codeql_test_run` to execute query tests:

```json
{
  "testPath": "<workshop_dir>/solutions-tests/Exercise1",
  "searchPath": ["<workshop_dir>/solutions"]
}
```

Returns:

```json
{
  "passed": true,
  "failures": [],
  "testCases": 1,
  "duration": "1.2s"
}
```

For failed tests:

```json
{
  "passed": false,
  "failures": [
    {
      "test": "Exercise1",
      "expected": 5,
      "actual": 3,
      "diff": "Expected result at line 10 missing"
    }
  ]
}
```

### Run All Tests

Test entire directories:

```json
{
  "testPath": "<workshop_dir>/solutions-tests",
  "searchPath": ["<workshop_dir>/solutions"]
}
```

### Update Expected Results

Use `codeql_test_accept` when actual results are correct:

```json
{
  "testPath": "<workshop_dir>/solutions-tests/Exercise1",
  "searchPath": ["<workshop_dir>/solutions"]
}
```

This updates `Exercise1.expected` with actual results.

**Use with caution**: Only accept results after validating they are correct.

## Query Compilation

### Validate Query Syntax

Use `codeql_query_compile` to check queries compile:

```json
{
  "query": "<workshop_dir>/solutions/Exercise1.ql",
  "searchPath": ["<workshop_dir>/solutions"]
}
```

Returns compilation errors if any:

```json
{
  "success": false,
  "errors": [
    {
      "message": "Cannot resolve type 'Foo'",
      "location": {
        "file": "Exercise1.ql",
        "line": 10,
        "column": 5
      }
    }
  ]
}
```

## Query Execution

### Run Query Against Database

Use `codeql_query_run` to execute queries:

```json
{
  "query": "<workshop_dir>/solutions/Exercise1.ql",
  "database": "<workshop_dir>/solutions-tests/Exercise1/Exercise1.testproj",
  "searchPath": ["<workshop_dir>/solutions"],
  "outputFormat": "sarif-latest"
}
```

Returns path to BQRS results file.

### Run PrintAST Query

Use predefined tool queries for AST generation:

```json
{
  "queryName": "PrintAST",
  "queryLanguage": "cpp",
  "database": "<workshop_dir>/tests-common/test.testproj",
  "searchPath": [],
  "outputFormat": "bqrs"
}
```

### Run PrintCFG Query

Generate control flow graphs:

```json
{
  "queryName": "PrintCFG",
  "queryLanguage": "cpp",
  "database": "<workshop_dir>/tests-common/test.testproj",
  "searchPath": [],
  "outputFormat": "bqrs"
}
```

## Result Interpretation

### Generate Graph Output

Use `codeql_bqrs_interpret` to convert BQRS to graphtext:

```json
{
  "file": "/path/to/results.bqrs",
  "format": "graphtext",
  "output": "<workshop_dir>/graphs/Exercise1-ast.txt"
}
```

For specific result sets:

```json
{
  "file": "/path/to/results.bqrs",
  "format": "graphtext",
  "output": "<workshop_dir>/graphs/Exercise1-ast.txt",
  "t": ["kind=graph", "id=ast"]
}
```

### Generate CSV Output

```json
{
  "file": "/path/to/results.bqrs",
  "format": "csv",
  "output": "<workshop_dir>/results/Exercise1-results.csv"
}
```

### Generate SARIF Output

```json
{
  "file": "/path/to/results.bqrs",
  "format": "sarif-latest",
  "output": "<workshop_dir>/results/Exercise1-results.sarif"
}
```

## Workshop Creation Workflow

### Phase 1: Analyze Source Query

```javascript
// Pseudocode showing workflow steps - actual tool invocation varies by implementation

// 1. Find all query files
const queryFiles = await find_codeql_query_files({
  queryPath: sourceQueryPath
});

// 2. Explain query logic
const explanation = await explain_codeql_query({
  queryPath: sourceQueryPath
});

// 3. Extract metadata
const metadata = await codeql_resolve_metadata({
  queryPath: sourceQueryPath
});

// Use this information to plan stages
```

### Phase 2: Create Workshop Structure

```javascript
// Create directories (use file system operations)
// Create codeql-pack.yml files
// Create codeql-workspace.yml
```

### Phase 3: Generate Solution Stages

For each stage (working backwards from complete query):

```javascript
// 1. Create solution query file (filesystem)

// 2. Compile to validate syntax
await codeql_query_compile({
  query: `<workshop_dir>/solutions/Exercise${n}.ql`,
  searchPath: ['<workshop_dir>/solutions']
});

// 3. Create test files (filesystem)

// 4. Extract test database
await codeql_test_extract({
  testPath: `<workshop_dir>/solutions-tests/Exercise${n}`,
  searchPath: ['<workshop_dir>/solutions']
});

// 5. Run query to get actual results
await codeql_query_run({
  query: `<workshop_dir>/solutions/Exercise${n}.ql`,
  database: `<workshop_dir>/solutions-tests/Exercise${n}/Exercise${n}.testproj`,
  searchPath: ['<workshop_dir>/solutions']
});

// 6. Run tests
const testResults = await codeql_test_run({
  testPath: `<workshop_dir>/solutions-tests/Exercise${n}`,
  searchPath: ['<workshop_dir>/solutions']
});

// 7. If needed, accept results
if (!testResults.passed) {
  // Review actual results, validate correctness
  await codeql_test_accept({
    testPath: `<workshop_dir>/solutions-tests/Exercise${n}`,
    searchPath: ['<workshop_dir>/solutions']
  });
}
```

### Phase 4: Generate Exercise Stages

For each stage:

```javascript
// 1. Copy solution to exercise (filesystem)
// 2. Remove implementation details (filesystem)
// 3. Add TODO comments and hints (filesystem)

// 4. Create or copy test files
// 5. Extract test database
await codeql_test_extract({
  testPath: `<workshop_dir>/exercises-tests/Exercise${n}`,
  searchPath: ['<workshop_dir>/exercises']
});

// 6. Optionally compile to check syntax
await codeql_query_compile({
  query: `<workshop_dir>/exercises/Exercise${n}.ql`,
  searchPath: ['<workshop_dir>/exercises']
});
```

### Phase 5: Generate Graphs

For stages where AST/CFG helpful:

```javascript
// 1. Run PrintAST
const astResults = await codeql_query_run({
  queryName: 'PrintAST',
  queryLanguage: language,
  database: `<workshop_dir>/tests-common/test.testproj`,
  outputFormat: 'bqrs'
});

// 2. Interpret to graphtext
await codeql_bqrs_interpret({
  file: astResults.bqrsPath,
  format: 'graphtext',
  output: `<workshop_dir>/graphs/Exercise${n}-ast.txt`
});

// 3. Run PrintCFG
const cfgResults = await codeql_query_run({
  queryName: 'PrintCFG',
  queryLanguage: language,
  database: `<workshop_dir>/tests-common/test.testproj`,
  outputFormat: 'bqrs'
});

// 4. Interpret to graphtext
await codeql_bqrs_interpret({
  file: cfgResults.bqrsPath,
  format: 'graphtext',
  output: `<workshop_dir>/graphs/Exercise${n}-cfg.txt`
});
```

### Phase 6: Validate Workshop

```javascript
// Test all solutions
const solutionsResults = await codeql_test_run({
  testPath: '<workshop_dir>/solutions-tests',
  searchPath: ['<workshop_dir>/solutions']
});

if (!solutionsResults.passed) {
  // Handle failures - investigate and fix
}

// Verify exercises compile
for (let n = 1; n <= stageCount; n++) {
  await codeql_query_compile({
    query: `<workshop_dir>/exercises/Exercise${n}.ql`,
    searchPath: ['<workshop_dir>/exercises']
  });
}
```

## Error Handling

### Compilation Errors

```javascript
const compileResult = await codeql_query_compile({
  query: queryPath,
  searchPath: [searchPath]
});

if (!compileResult.success) {
  for (const error of compileResult.errors) {
    console.error(`${error.location.file}:${error.location.line}: ${error.message}`);
  }
  // Fix errors and retry
}
```

### Test Failures

```javascript
const testResult = await codeql_test_run({
  testPath: testPath,
  searchPath: [searchPath]
});

if (!testResult.passed) {
  for (const failure of testResult.failures) {
    console.error(`Test ${failure.test} failed:`);
    console.error(`  Expected ${failure.expected} results, got ${failure.actual}`);
    console.error(`  Diff: ${failure.diff}`);
  }

  // Review actual results
  // If correct, accept them:
  await codeql_test_accept({
    testPath: testPath,
    searchPath: [searchPath]
  });
}
```

### Database Issues

```javascript
try {
  const dbInfo = await codeql_resolve_database({
    database: databasePath
  });
} catch (error) {
  console.error(`Database validation failed: ${error.message}`);

  // Re-extract database
  await codeql_test_extract({
    testPath: testPath,
    searchPath: [searchPath]
  });
}
```

## Tool Sequencing

### Correct Tool Order

For creating a single workshop stage:

1. `find_codeql_query_files` (analyze source)
2. `explain_codeql_query` (understand logic)
3. Create solution query file
4. `codeql_query_compile` (validate syntax)
5. Create test files
6. `codeql_test_extract` (create database)
7. `codeql_query_run` (execute query)
8. `codeql_test_run` (validate results)
9. `codeql_test_accept` (if needed)
10. Create exercise query file
11. `codeql_query_compile` (validate exercise)
12. Generate graphs if needed

### Parallel Operations

Some operations can be parallelized:

**Safe to parallelize:**

- Compiling multiple queries
- Running tests for different stages
- Generating graphs for different stages

**Must be sequential:**

- Extract database before running tests
- Compile before running query
- Run query before interpreting results

## Performance Tips

### Minimize Database Creation

- Reuse test databases when test code is identical
- Create shared databases in tests-common/
- Only extract when test code changes

### Batch Test Execution

Run tests for entire directories:

```javascript
// Instead of running each test individually
await codeql_test_run({
  testPath: '<workshop_dir>/solutions-tests',
  searchPath: ['<workshop_dir>/solutions']
});
```

### Cache Query Results

Store BQRS files for reuse:

```javascript
const bqrsPath = await codeql_query_run({...});
// Interpret same BQRS to multiple formats
await codeql_bqrs_interpret({ file: bqrsPath, format: "csv", ... });
await codeql_bqrs_interpret({ file: bqrsPath, format: "sarif-latest", ... });
await codeql_bqrs_interpret({ file: bqrsPath, format: "graphtext", ... });
```

## Troubleshooting

### "Cannot resolve query reference"

Issue: `.qlref` file has wrong path

Solution: Ensure path is relative to exercises/ or solutions/ directory:

```
Exercise1.ql  # Not ../Exercise1.ql or /abs/path/Exercise1.ql
```

### "Test database not found"

Issue: Database not extracted

Solution: Run `codeql_test_extract` before `codeql_test_run`

### "Query compilation failed"

Issue: Syntax errors or missing dependencies

Solution:

1. Check `codeql-pack.yml` has correct dependencies
2. Run `codeql pack install`
3. Review compilation error messages

### "Test results don't match expected"

Issue: Query behavior changed or expected results outdated

Solution:

1. Review actual results from test run
2. Validate correctness
3. Use `codeql_test_accept` to update if correct

## Best Practices

### Always Validate

Compile queries before considering them complete:

```javascript
await codeql_query_compile({
  query: queryPath,
  searchPath: [searchPath]
});
```

### Test Incrementally

Test each stage as you create it:

```javascript
await codeql_test_run({
  testPath: stageTestPath,
  searchPath: [searchPath]
});
```

### Provide Context

Use searchPath to resolve dependencies:

```javascript
{
  query: queryPath,
  searchPath: [
    workshopDir + "/solutions",
    workshopDir + "/common"
  ]
}
```

### Document Assumptions

When accepting test results, document why:

```javascript
// Accepting results after validating:
// - All 5 expected array accesses are found
// - No false positives in output
// - Edge cases handled correctly
await codeql_test_accept({...});
```

## References

- [CodeQL CLI Documentation](https://codeql.github.com/docs/codeql-cli/)
- [SKILL.md](./SKILL.md) - Main workshop creation skill
- [Workshop Structure Reference](./workshop-structure-reference.md)
- [Example Workshops](./examples/)
