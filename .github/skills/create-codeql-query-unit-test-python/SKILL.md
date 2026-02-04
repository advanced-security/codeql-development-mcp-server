---
name: create-codeql-query-unit-test-python
description: Create comprehensive unit tests for CodeQL queries targeting Python code. Use this skill when you need to create, validate, or enhance test coverage for Python CodeQL queries using the CodeQL Development MCP Server tools.
---

# Create CodeQL Query Unit Test for Python

This skill guides you through creating comprehensive unit tests for CodeQL queries that analyze Python code.

## When to Use This Skill

- Creating new unit tests for a Python CodeQL query
- Adding test cases to existing Python query tests
- Validating Python query behavior against known code patterns
- Testing Python security queries, code quality queries, or analysis queries

## Prerequisites

Before creating tests, ensure you have:

- A CodeQL query (`.ql` file) that you want to test
- Understanding of what Python code patterns the query should detect
- Knowledge of Python language features and frameworks relevant to your query
- Access to CodeQL Development MCP Server tools
- A query pack directory where your query is organized

## Python Test Structure

### Directory Layout

Organize tests in your query pack's test directory:

```
<query-pack>/test/{QueryName}/
├── {QueryName}.qlref           # Reference to the query being tested
├── Example1.py                 # Primary test source file
├── Example2.py                 # Additional test cases (optional)
├── {QueryName}.expected        # Expected query results
└── {QueryName}.testproj/       # Generated test database (auto-created)
```

### File Naming Conventions

- **Test source files**: Use `Example1.py`, `Example2.py`, etc. or `test.py`
- **Query reference**: `{QueryName}.qlref` (exact match to query directory name)
- **Expected results**: `{QueryName}.expected` (exact match to query name)

## Step-by-Step Guide

### Step 1: Create Test Directory

Create the test directory structure within your query pack:

```bash
mkdir -p <query-pack>/test/{QueryName}
```

### Step 2: Create Query Reference File

Create `{QueryName}.qlref` with the relative path to your query:

```
{QueryName}/{QueryName}.ql
```

**Example** (`FindInsecureDeserialization.qlref`):

```
FindInsecureDeserialization/FindInsecureDeserialization.ql
```

**Important**: The path is relative to your query pack's source directory (where your queries are organized).

### Step 3: Write Test Source Code

Create `Example1.py` with comprehensive test cases:

**Positive Cases** (should detect):

```python
import pickle
import os

def unsafe_deserialize(user_data):
    obj = pickle.loads(user_data)  # Should detect: unsafe pickle

def unsafe_command(user_input):
    os.system("ls " + user_input)  # Should detect: command injection
```

**Negative Cases** (should NOT detect):

```python
import json

def safe_deserialize(user_data):
    obj = json.loads(user_data)  # Safe JSON parsing

def safe_file_read(filename):
    if validate_filename(filename):
        with open(filename, 'r') as f:
            return f.read()  # Validated input
```

**Key Python Patterns to Test:**

- **Web Frameworks**: Django ORM injection, Flask template injection, FastAPI parameter handling
- **Dynamic Code**: `eval()`, `exec()`, `compile()`, dynamic imports
- **Deserialization**: `pickle`, `yaml.load()`, unsafe JSON alternatives
- **Command Execution**: `subprocess.run()` with `shell=True`, `os.system()`
- **Path Traversal**: `os.path.join()` with user input, file operations
- **Data Science**: Pandas `DataFrame.eval()`, NumPy operations with user data

See complete examples in existing test files.

### Step 4: Create Expected Results File

Create `{QueryName}.expected` with the expected query output:

```
| file         | line | col | endLine | endCol | message                          |
| Example1.py  | 6    | 11  | 6       | 28     | Unsafe pickle deserialization    |
| Example1.py  | 10   | 5   | 10      | 34     | Command injection vulnerability  |
```

**Column Definitions:**

- `file`: Test source file name (e.g., `Example1.py`)
- `line`: Starting line number (1-indexed)
- `col`: Starting column number (1-indexed)
- `endLine`: Ending line number
- `endCol`: Ending column number
- `message`: Expected alert message from the query

**Important Notes:**

- Line and column numbers are 1-indexed (first line is 1, first character is column 1)
- Message text should match query output exactly
- Use consistent spacing with `|` separators
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

- Parses your Python test code
- Creates a CodeQL database at `test/{QueryName}/{QueryName}.testproj/`
- Extracts AST and semantic information
- Prepares database for query execution

**Python Extraction Notes:**

- Supports Python 2 and Python 3 syntax
- Handles decorators, async/await, type hints
- Processes multiple source files and modules
- Includes standard library modeling
- Extracts framework-specific patterns (Django, Flask, FastAPI)

### Step 6: Analyze Python Code Structure (Optional)

Before finalizing your query, use `PrintAST` to understand the Python AST structure:

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

**Key Python AST Nodes to Look For:**

- **Functions**: `FunctionDef`, `FunctionExpr`, `Lambda`
- **Classes**: `ClassDef`, `ClassExpr`
- **Calls**: `Call`, `MethodCall`
- **Expressions**: `Attribute`, `Subscript`, `Name`, `Fstring`
- **Statements**: `AssignStmt`, `If`, `For`, `While`, `Try`, `With`
- **Imports**: `Import`, `ImportStar`, `ImportMember`
- **Decorators**: `FunctionDef` with decorator list
- **Comprehensions**: `ListComp`, `DictComp`, `SetComp`, `GeneratorExp`
- **Async/Await**: `AsyncFunctionDef`, `Await`

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

1. Create `Example2.py` with additional scenarios
2. Update `{QueryName}.expected` with new expected results
3. Re-extract test database with `codeql_test_extract`
4. Run tests again with `codeql_test_run`

## Python-Specific Best Practices

### 1. Test Python Language Features

- **Dynamic Typing**: Type hints, duck typing, runtime type checking
- **Decorators**: Function and class decorators
- **Context Managers**: `with` statements, `__enter__`/`__exit__`
- **Generators**: `yield`, generator expressions
- **Comprehensions**: List/dict/set comprehensions
- **Async/Await**: Asynchronous functions and coroutines

### 2. Test Web Framework Patterns

**Django**: Raw SQL injection, ORM misuse, template injection
**Flask**: Route parameter injection, template rendering, session handling
**FastAPI**: Query parameter validation, dependency injection

### 3. Test Data Flow

```python
def source():
    return get_user_input()  # Source

def intermediate(data):
    return data.upper()  # Pass-through

def sink(data):
    eval(data)  # Sink - should detect tainted flow
```

### 4. Test Security Patterns

- **Deserialization**: pickle, yaml.load, marshal
- **SQL Injection**: String concatenation in queries
- **Command Injection**: shell=True, os.system
- **Template Injection**: render_template_string with user input
- **Path Traversal**: Unvalidated file paths

## MCP Tools Reference

### Test Creation and Validation

- **`codeql_test_extract`**: Extract test databases from Python source code
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

## Common Python Testing Pitfalls

❌ **Don't:**

- Forget to include necessary import statements
- Write tests with syntax errors
- Use Python 2 syntax when targeting Python 3 queries
- Ignore framework-specific patterns when testing framework queries
- Skip testing dynamic features (eval, exec, imports)
- Forget to test both sync and async patterns
- Use hardcoded paths that don't exist

✅ **Do:**

- Write valid, runnable Python code
- Include comments explaining each test case
- Test both positive and negative cases
- Cover edge cases and boundary conditions
- Use realistic Python patterns from real applications
- Test relevant framework usage (Django, Flask, FastAPI)
- Include async/await tests for async queries
- Test comprehensions and generator expressions when relevant
- Follow PEP 8 style guidelines for readability

## Quality Checklist

Before considering your Python tests complete:

- [ ] Test directory created with correct naming
- [ ] `.qlref` file correctly references query
- [ ] `Example1.py` includes comprehensive test cases
- [ ] Test code is valid Python with no syntax errors
- [ ] All Python features used by query are tested
- [ ] Framework-specific patterns tested (if applicable)
- [ ] Positive cases (should detect) are included
- [ ] Negative cases (should not detect) are included
- [ ] Edge cases are covered
- [ ] `.expected` file has correct format with proper columns
- [ ] Line and column numbers in `.expected` are accurate
- [ ] Test database extracted successfully with `codeql_test_extract`
- [ ] Tests run successfully with `codeql_test_run`
- [ ] All tests pass (actual matches expected)
- [ ] Additional test files added if needed (Example2.py, etc.)
- [ ] Tests verified at language level (all Python tests pass)

## Example: Complete Python Test Structure

### Query: FindInsecureDeserialization

Detects insecure deserialization operations in Python code.

#### Directory Structure

```
server/ql/python/tools/test/FindInsecureDeserialization/
├── FindInsecureDeserialization.qlref
├── Example1.py
├── FindInsecureDeserialization.expected
└── FindInsecureDeserialization.testproj/  (auto-generated)
```

#### FindInsecureDeserialization.qlref

```
FindInsecureDeserialization/FindInsecureDeserialization.ql
```

#### Example1.py

```python
import pickle
import json
import yaml

# Test case 1: Unsafe pickle (should detect)
def test_unsafe_pickle(user_data):
    obj = pickle.loads(user_data)  # Unsafe: arbitrary code execution
    return obj

# Test case 2: Safe JSON (should NOT detect)
def test_safe_json(user_data):
    obj = json.loads(user_data)  # Safe: JSON doesn't execute code
    return obj

# Test case 3: Unsafe YAML (should detect)
def test_unsafe_yaml(user_data):
    obj = yaml.load(user_data)  # Unsafe: should use safe_load
    return obj

# Test case 4: Safe YAML (should NOT detect)
def test_safe_yaml(user_data):
    obj = yaml.safe_load(user_data)  # Safe: restricted loading
    return obj

# Test case 5: Conditional pickle (edge case - should detect)
def test_conditional_pickle(data, is_trusted):
    if not is_trusted:
        return None
    return pickle.loads(data)  # Unsafe: still exploitable

# Test case 6: Pickle with file (should detect)
def test_pickle_file(filename):
    with open(filename, 'rb') as f:
        obj = pickle.load(f)  # Unsafe: file could be malicious
    return obj
```

#### FindInsecureDeserialization.expected

```
| file         | line | col | endLine | endCol | message                           |
| Example1.py  | 7    | 11  | 7       | 28     | Unsafe pickle deserialization     |
| Example1.py  | 17   | 11  | 17      | 28     | Unsafe YAML deserialization       |
| Example1.py  | 29   | 12  | 29      | 29     | Unsafe pickle deserialization     |
| Example1.py  | 34   | 15  | 34      | 28     | Unsafe pickle deserialization     |
```

## Troubleshooting

### Test Extraction Fails

- Verify Python code runs without errors
- Check for syntax errors in test files
- Ensure all imported modules are available
- Review Python version compatibility (2 vs 3)
- Check for indentation errors

### Test Results Don't Match Expected

- Compare actual output with `.expected` file
- Verify line and column numbers are correct (1-indexed)
- Check message text matches exactly
- Review query logic for correctness
- Ensure AST node types match expectations

### Tests Pass Locally But Fail in CI

- Ensure consistent Python version
- Check for platform-specific code
- Verify all dependencies are available
- Review test database extraction settings
- Check framework version compatibility

## Related Resources

- [Python Query Development Prompt](https://github.com/advanced-security/codeql-development-template/blob/main/.github/prompts/python_query_development.prompt.md) - Comprehensive Python query development guide
- [CodeQL TDD Generic Skill](../create-codeql-query-tdd-generic/SKILL.md) - General test-driven development workflow
- [Python QSpec Reference](../../../server/src/resources/qspec-reference-python.md) - Python-specific QSpec patterns
- [Python AST Documentation](https://codeql.github.com/docs/codeql-language-guides/codeql-for-python/) - Official Python AST reference
- [Generate QSpec for Python](../../prompts/generate-qspec-python.prompt.md) - Python QSpec generation guidance

## Success Criteria

Your Python query unit tests are successful when:

1. ✅ Test structure follows conventions
2. ✅ Python test code is valid and runnable
3. ✅ Test database extracts without errors
4. ✅ All tests pass consistently
5. ✅ Comprehensive coverage of Python features
6. ✅ Framework-specific patterns tested (if applicable)
7. ✅ Both positive and negative cases included
8. ✅ Edge cases properly handled
9. ✅ Expected results accurately reflect query behavior
