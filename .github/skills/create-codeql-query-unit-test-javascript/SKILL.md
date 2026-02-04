---
name: create-codeql-query-unit-test-javascript
description: Create comprehensive unit tests for CodeQL queries targeting JavaScript code. Use this skill when you need to create, validate, or enhance test coverage for JavaScript CodeQL queries using the CodeQL Development MCP Server tools.
---

# Create CodeQL Query Unit Test for JavaScript

This skill guides you through creating comprehensive unit tests for CodeQL queries that analyze JavaScript code.

## When to Use This Skill

- Creating new unit tests for a JavaScript CodeQL query
- Adding test cases to existing JavaScript query tests
- Validating JavaScript query behavior against known code patterns
- Testing JavaScript security queries, code quality queries, or analysis queries

## Prerequisites

Before creating tests, ensure you have:

- A CodeQL query (`.ql` file) that you want to test
- Understanding of what JavaScript code patterns the query should detect
- Knowledge of JavaScript language features and frameworks relevant to your query
- Access to CodeQL Development MCP Server tools

## JavaScript Test Structure

### Directory Layout

```
<query-pack>/test/{QueryName}/
├── {QueryName}.qlref           # Reference to the query being tested
├── Example1.js                 # Primary test source file
├── Example2.js                 # Additional test cases (optional)
├── helper.js                   # Helper modules if needed (optional)
├── {QueryName}.expected        # Expected query results
└── {QueryName}.testproj/       # Generated test database (auto-created)
```

### File Naming Conventions

- **Test source files**: Use `Example1.js`, `Example2.js`, etc. or `test.js`
- **Helper files**: Use `.js` extension (e.g., `helper.js`, `utils.js`)
- **Query reference**: `{QueryName}.qlref` (exact match to query directory name)
- **Expected results**: `{QueryName}.expected` (exact match to query name)

## Step-by-Step Guide

### Step 1: Create Test Directory

Create the test directory structure:

```bash
mkdir -p <query-pack>/test/{QueryName}
```

### Step 2: Create Query Reference File

Create `{QueryName}.qlref` with the relative path to your query:

```
{QueryName}/{QueryName}.ql
```

**Example** (`FindXssVulnerability.qlref`):

```
FindXssVulnerability/FindXssVulnerability.ql
```

**Important**: Path is relative to your query pack's source directory.

### Step 3: Write Test Source Code

Create `Example1.js` with comprehensive test cases covering:

#### Test Case Types

**Positive** (should detect):

```javascript
document.getElementById('content').innerHTML = userInput; // XSS
eval(userCode); // Code injection
```

**Negative** (should NOT detect):

```javascript
const sanitized = escapeHtml(userInput);
document.getElementById('content').innerHTML = sanitized; // Safe
```

**Edge cases**:

```javascript
async function asyncUnsafe(userInput) {
  const data = await fetch('/api/data?q=' + userInput);
}
```

#### JavaScript-Specific Test Patterns

**Browser**: `document.write(userInput)`, `element.innerHTML = userInput`, `location.href = userInput`

**Node.js**: `exec('ls ' + userInput)`, `fs.writeFileSync(userInput, data)`

**Express.js**:

```javascript
app.get('/user/:id', (req, res) => {
  const query = 'SELECT * FROM users WHERE id = ' + req.params.id; // Unsafe
  db.query(query, [req.params.id]); // Safe with parameterization
});
```

**React**: `<div dangerouslySetInnerHTML={{ __html: userInput }} />` (unsafe) vs `<div>{userInput}</div>` (safe)

**Async patterns**: Test promises, async/await, callbacks
**Modern JS**: Arrow functions, template literals, destructuring

**Include Comments**: Document each test case:

```javascript
// Test case 1: DOM XSS via innerHTML (should detect)
function test1(userInput) {
  document.getElementById('output').innerHTML = userInput;
}
```

### Step 4: Create Expected Results File

Create `{QueryName}.expected` with the expected query output:

```
| file         | line | col | endLine | endCol | message                          |
| Example1.js  | 3    | 5   | 3       | 45     | DOM-based XSS vulnerability      |
| Example1.js  | 8    | 5   | 8       | 15     | Code injection through eval      |
```

**Column Definitions:**

- `file`: Test source file name (e.g., `Example1.js`)
- `line`: Starting line number (1-indexed)
- `col`: Starting column number (1-indexed)
- `endLine`: Ending line number
- `endCol`: Ending column number
- `message`: Expected alert message from the query

**Important Notes:**

- Both line and column numbers are 1-indexed (starting from 1)
- Message text should match query output exactly
- Order results by file, then line, then column

### Step 5: Extract Test Database

Use the `codeql_test_extract` MCP tool to create a test database:

```json
{
  "testPath": "<query-pack>/test/{QueryName}",
  "searchPath": ["<query-pack>"]
}
```

**What This Does:**

- Processes your JavaScript test code
- Creates a CodeQL database at `test/{QueryName}/{QueryName}.testproj/`
- Extracts AST and semantic information
- Prepares database for query execution

**JavaScript Extraction Notes:**

- Supports ES5, ES6+, and modern JavaScript features
- Handles both CommonJS and ES modules
- Processes JSX and TypeScript files
- Includes Node.js and browser API modeling
- Extracts framework-specific patterns (Express, React, etc.)

### Step 6: Analyze JavaScript Code Structure (Optional)

Before finalizing your query, use `PrintAST` to understand the JavaScript AST structure:

#### Run PrintAST Query

Use the `codeql_query_run` MCP tool:

```json
{
  "query": "<query-pack>/src/PrintAST/PrintAST.ql",
  "database": "<query-pack>/test/{QueryName}/{QueryName}.testproj",
  "searchPath": ["<query-pack>"],
  "format": "text"
}
```

#### Interpret AST Results

Use `codeql_bqrs_decode` to view the AST:

```json
{
  "format": "text",
  "bqrsFile": "<path-to-results.bqrs>",
  "outputPath": "<output-file.txt>"
}
```

**Key JavaScript AST Nodes to Look For:**

- **Functions**: `Function`, `ArrowFunctionExpr`, `MethodDefinition`
- **Classes**: `ClassDefinition`, `ClassExpr`
- **Expressions**: `CallExpr`, `VarAccess`, `PropAccess`, `DotExpr`
- **Statements**: `ExprStmt`, `IfStmt`, `ReturnStmt`, `ThrowStmt`
- **Async**: `AwaitExpr`, `PromiseExpr`
- **DOM**: `DOMElement`, `DOMProperty`
- **Literals**: `StringLiteral`, `TemplateLiteral`, `ObjectExpr`

### Step 7: Run Tests

Execute your tests using the `codeql_test_run` MCP tool:

```json
{
  "testPath": "<query-pack>/test/{QueryName}",
  "searchPath": ["<query-pack>"]
}
```

**Interpreting Results:**

✅ **Tests Pass**: Output matches `.expected` file exactly

- All expected alerts are found
- No unexpected alerts are produced
- Line and column numbers match

❌ **Tests Fail**: Differences between actual and expected

- Missing alerts: Query didn't find expected patterns
- Extra alerts: Query found unexpected patterns
- Position mismatch: Line/column numbers don't match

### Step 8: Iterate Until Tests Pass

If tests fail, analyze the differences:

1. **Review actual query output**: Check what the query actually found
2. **Compare with expected results**: Identify discrepancies
3. **Update query or expected file**:
   - If query is wrong: Fix the query logic
   - If expected is wrong: Update `.expected` file
4. **Re-run tests**: Use `codeql_test_run` again
5. **Repeat until all tests pass**

#### Accepting New Results (Use Carefully)

If the actual results are correct and you want to update the baseline:

```json
{
  "testPath": "<query-pack>/test/{QueryName}",
  "searchPath": ["<query-pack>"]
}
```

Use `codeql_test_accept` tool, but **only** after verifying the results are correct.

### Step 9: Add More Test Cases

Expand test coverage by adding more test files:

1. Create `Example2.js` with additional scenarios
2. Update `{QueryName}.expected` with new expected results
3. Re-extract test database with `codeql_test_extract`
4. Run tests again with `codeql_test_run`

## JavaScript-Specific Best Practices

### 1. Test JavaScript Language Features

Include tests for JavaScript features relevant to your query:

- **Dynamic Types**: Test type coercion and implicit conversions
- **Closures**: Test variable capture in nested functions
- **Prototypes**: Test prototype chain and constructor patterns
- **Async Operations**: Test promises, async/await, callbacks
- **Modules**: Test CommonJS and ES6 module patterns
- **Template Literals**: Test string interpolation vulnerabilities

### 2. Test Framework Patterns When Relevant

**Express**: `app.get('/route', (req, res) => res.send(req.query.param))`
**React**: `<div>{prop}</div>` vs `<div dangerouslySetInnerHTML={{__html: prop}} />`

### 3. Test Data Flow Patterns

```javascript
function source() {
  return userInput;
}
function sink(data) {
  eval(data);
}
sink(source()); // Test flow from source to sink
```

### 4. Test Security Patterns

**XSS**: `element.innerHTML = userInput` or template literals
**SQL Injection**: `"SELECT * FROM users WHERE id = " + userId`
**Command Injection**: `exec('ls ' + userPath)`
**Prototype Pollution**: Unsafe object merging

## MCP Tools Reference

### Test Creation and Validation

- **`codeql_test_extract`**: Extract test databases from JavaScript source code
- **`codeql_test_run`**: Run query tests and compare with expected results
- **`codeql_test_accept`**: Accept actual results as new baseline (use with caution)

### Query Development

- **`codeql_query_compile`**: Compile CodeQL queries and check for syntax errors
- **`codeql_query_format`**: Format CodeQL query files
- **`codeql_query_run`**: Run queries (e.g., PrintAST) against test databases

### Result Analysis

- **`codeql_bqrs_decode`**: Decode binary query results to human-readable text
- **`codeql_bqrs_interpret`**: Interpret results in various formats (SARIF, CSV, graph)
- **`codeql_bqrs_info`**: Get metadata about query results

### Pack Management

- **`codeql_pack_install`**: Install query pack dependencies before testing

## Common JavaScript Testing Pitfalls

❌ **Don't:**

- Forget to test both browser and Node.js patterns when applicable
- Skip testing asynchronous patterns (promises, async/await)
- Ignore framework-specific security patterns
- Forget to test modern JavaScript features (arrow functions, template literals)
- Use invalid JavaScript syntax
- Skip testing edge cases like prototype pollution or type coercion

✅ **Do:**

- Write valid, executable JavaScript code
- Include comments explaining each test case
- Test both positive and negative cases
- Cover edge cases and boundary conditions
- Use realistic JavaScript patterns from real applications
- Test relevant framework usage (Express, React, etc.)
- Include async/await and promise tests when relevant
- Test both CommonJS and ES6 module patterns

## Quality Checklist

Before considering your JavaScript tests complete:

- [ ] Test directory created with correct naming
- [ ] `.qlref` file correctly references query
- [ ] `Example1.js` includes comprehensive test cases
- [ ] Test code is valid JavaScript
- [ ] All JavaScript features used by query are tested
- [ ] Framework-specific patterns tested (if applicable)
- [ ] Positive cases (should detect) are included
- [ ] Negative cases (should not detect) are included
- [ ] Edge cases are covered
- [ ] `.expected` file has correct format with proper columns
- [ ] Line and column numbers in `.expected` are accurate
- [ ] Test database extracted successfully with `codeql_test_extract`
- [ ] Tests run successfully with `codeql_test_run`
- [ ] All tests pass (actual matches expected)
- [ ] Additional test files added if needed (Example2.js, etc.)

## Example: Complete JavaScript Test Structure

### Query: FindDomXss

```
<query-pack>/test/FindDomXss/
├── FindDomXss.qlref          # Content: FindDomXss/FindDomXss.ql
├── Example1.js               # Test cases (see below)
├── FindDomXss.expected       # Expected results
└── FindDomXss.testproj/      # Auto-generated
```

**Example1.js**:

```javascript
// Positive: innerHTML XSS
function test1(userInput) {
  document.getElementById('output').innerHTML = userInput;
}

// Negative: textContent (safe)
function test2(userInput) {
  document.getElementById('output').textContent = userInput;
}

// Positive: Template literal with innerHTML XSS
function test3(userInput) {
  element.innerHTML = `<p>${userInput}</p>`;
}
```

**FindDomXss.expected**:

```
| file         | line | col | endLine | endCol | message                      |
| Example1.js  | 3    | 5   | 3       | 56     | DOM-based XSS via innerHTML  |
| Example1.js  | 13   | 5   | 13      | 43     | DOM-based XSS in template    |
```

## Troubleshooting

### Test Extraction Fails

- Verify JavaScript code is syntactically valid
- Check for missing dependencies or imports
- Ensure proper module syntax (CommonJS vs ES6)
- Review extraction error messages

### Test Results Don't Match Expected

- Compare actual output with `.expected` file
- Verify line and column numbers are correct (1-indexed)
- Check message text matches exactly
- Review query logic for correctness

### Tests Pass Locally But Fail in CI

- Ensure consistent JavaScript runtime version
- Check for platform-specific code
- Verify all dependencies are available
- Review test database extraction settings

## Related Resources

- [JavaScript Query Development Prompt](https://github.com/advanced-security/codeql-development-template/blob/main/.github/prompts/javascript_query_development.prompt.md)
- [CodeQL TDD Generic Skill](../create-codeql-query-tdd-generic/SKILL.md)
- [JavaScript QSpec Reference](../../../server/src/resources/qspec-reference-javascript.md)
- [JavaScript AST Documentation](https://codeql.github.com/docs/codeql-language-guides/codeql-for-javascript/)
- [Generate QSpec for JavaScript](../../prompts/generate-qspec-javascript.prompt.md)

## Success Criteria

Your JavaScript query unit tests are successful when:

1. ✅ Test structure follows conventions
2. ✅ JavaScript test code is valid and executable
3. ✅ Test database extracts without errors
4. ✅ All tests pass consistently
5. ✅ Comprehensive coverage of JavaScript features
6. ✅ Framework-specific patterns tested (if applicable)
7. ✅ Both positive and negative cases included
8. ✅ Edge cases properly handled
9. ✅ Expected results accurately reflect query behavior
