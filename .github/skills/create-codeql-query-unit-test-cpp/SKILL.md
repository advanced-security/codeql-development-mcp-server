---
name: create-codeql-query-unit-test-cpp
description: Create comprehensive unit tests for CodeQL queries targeting C++ code. Use this skill when you need to create, validate, or enhance test coverage for C++ CodeQL queries using the CodeQL Development MCP Server tools.
---

# Create CodeQL Query Unit Test for C++

This skill guides you through creating comprehensive unit tests for CodeQL queries that analyze C++ code.

## When to Use This Skill

- Creating new unit tests for a C++ CodeQL query
- Adding test cases to existing C++ query tests
- Validating C++ query behavior against known code patterns
- Testing C++ security queries, code quality queries, or analysis queries

## Prerequisites

Before creating tests, ensure you have:

- A CodeQL query (`.ql` file) that you want to test
- Understanding of what C++ code patterns the query should detect
- Knowledge of C++ language features and standard library relevant to your query
- Access to CodeQL Development MCP Server tools
- A query pack directory where your query is organized

## C++ Test Structure

### Directory Layout

Organize tests in your query pack's test directory:

```
<query-pack>/test/{QueryName}/
├── {QueryName}.qlref           # Reference to the query being tested
├── Example1.cpp                # Primary test source file
├── Example2.cpp                # Additional test cases (optional)
├── test.h                      # Header files if needed (optional)
├── {QueryName}.expected        # Expected query results
└── {QueryName}.testproj/       # Generated test database (auto-created)
```

### File Naming Conventions

- **Test source files**: Use `Example1.cpp`, `Example2.cpp`, etc. or `test.cpp`
- **Header files**: Use `.h` extension (e.g., `test.h`, `Example1.h`)
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
src/{QueryName}/{QueryName}.ql
```

**Example** (`FindUnsafePointers.qlref`):

```
src/FindUnsafePointers/FindUnsafePointers.ql
```

**Important**: The path is relative to your query pack's source directory (where your queries are organized).

### Step 3: Write Test Source Code

Create `Example1.cpp` with comprehensive test cases covering:

#### Positive Test Cases (Should Be Detected)

Code patterns that your query **should** find:

```cpp
// Positive case: Unsafe pointer usage
void unsafeFunction() {
    int* ptr = nullptr;
    *ptr = 42;  // Should be detected: null pointer dereference
}
```

#### Negative Test Cases (Should NOT Be Detected)

Code patterns that your query **should not** flag:

```cpp
// Negative case: Safe pointer usage
void safeFunction() {
    int value = 42;
    int* ptr = &value;
    if (ptr != nullptr) {
        *ptr = 43;  // Should NOT be detected: pointer checked
    }
}
```

#### Edge Cases

Boundary conditions and unusual scenarios:

```cpp
// Edge case: Pointer in complex expression
void edgeCase() {
    int* ptr = new int(42);
    int result = (ptr != nullptr) ? *ptr : 0;  // Ternary with null check
    delete ptr;
}
```

#### C++-Specific Test Patterns

**Memory Management:**

```cpp
#include <memory>

// Test new/delete patterns
void memoryTest() {
    int* data = new int[10];
    delete[] data;  // Test proper deallocation
}

// Test smart pointers
void smartPointerTest() {
    std::unique_ptr<int> ptr = std::make_unique<int>(42);
    // Automatic cleanup
}
```

**Class and Inheritance:**

```cpp
class Base {
public:
    virtual void method() {}
};

class Derived : public Base {
public:
    void method() override {}  // Test virtual method override
};
```

**Templates:**

```cpp
template<typename T>
T templateFunction(T value) {
    return value * 2;  // Test template instantiation
}
```

**Modern C++ Features:**

```cpp
#include <utility>
#include <vector>

// Lambda expressions
auto lambda = [](int x) { return x * 2; };

// Move semantics
void moveTest(std::vector<int>&& vec) {
    std::vector<int> local = std::move(vec);
}

// Range-based for loops
void rangeTest(const std::vector<int>& vec) {
    for (const auto& item : vec) {
        // Process item
    }
}
```

**Include Comments**: Document what each test case validates:

```cpp
// Test case 1: Detects direct null pointer dereference
void test1() {
    int* ptr = nullptr;
    *ptr = 42;  // Expected: Alert on this line
}

// Test case 2: Should not flag checked pointers
void test2() {
    int* ptr = getPointer();
    if (ptr != nullptr) {
        *ptr = 42;  // Expected: No alert (pointer is checked)
    }
}
```

### Step 4: Create Expected Results File

Create `{QueryName}.expected` with the expected query output:

```
| file         | line | col | endLine | endCol | message                          |
| Example1.cpp | 3    | 5   | 3       | 8      | Null pointer dereference         |
| Example1.cpp | 15   | 5   | 15      | 8      | Use after free                   |
```

**Column Definitions:**

- `file`: Test source file name (e.g., `Example1.cpp`)
- `line`: Starting line number (1-indexed)
- `col`: Starting column number (1-indexed)
- `endLine`: Ending line number
- `endCol`: Ending column number
- `message`: Expected alert message from the query

**Important Notes:**

- Column numbers are 1-indexed (first character is column 1)
- Line numbers match the source file exactly
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

- Compiles your C++ test code
- Creates a CodeQL database at `test/{QueryName}/{QueryName}.testproj/`
- Extracts AST and semantic information
- Prepares database for query execution

**C++ Extraction Notes:**

- Supports C++11, C++14, C++17, C++20 features
- Handles templates, macros, and preprocessor directives
- Processes multiple source files and headers
- Includes standard library modeling

### Step 6: Analyze C++ Code Structure (Optional)

Before finalizing your query, use `PrintAST` to understand the C++ AST structure:

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

**Key C++ AST Nodes to Look For:**

- **Functions**: `Function`, `MemberFunction`, `Constructor`
- **Classes**: `Class`, `Struct`, `Union`
- **Pointers**: `PointerType`, `PointerDereferenceExpr`
- **Expressions**: `FunctionCall`, `VariableAccess`, `NewExpr`, `DeleteExpr`
- **Statements**: `BlockStmt`, `IfStmt`, `ReturnStmt`
- **Operators**: `AssignExpr`, `ComparisonOperation`
- **Templates**: `TemplateClass`, `TemplateFunction`

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
- Column and line numbers match

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

1. Create `Example2.cpp` with additional scenarios
2. Update `{QueryName}.expected` with new expected results
3. Re-extract test database with `codeql_test_extract`
4. Run tests again with `codeql_test_run`

## C++-Specific Best Practices

### 1. Test C++ Language Features

Include tests for C++ features relevant to your query:

- **Pointers and References**: Test raw pointers, smart pointers, references
- **Memory Management**: Test `new`/`delete`, `malloc`/`free`, RAII patterns
- **Classes**: Test inheritance, polymorphism, virtual functions
- **Templates**: Test template functions and classes
- **STL**: Test standard library containers and algorithms
- **Modern C++**: Test lambdas, move semantics, `auto`, range-based for

### 2. Test Compilation Options

Consider testing different C++ standards if relevant:

```cpp
// Options file: options
--std=c++17
```

### 3. Include Headers When Needed

For queries involving standard library or custom headers:

```cpp
// Example1.cpp
#include <memory>
#include <vector>
#include "test.h"

void testWithHeaders() {
    std::vector<int> vec;
    std::unique_ptr<int> ptr;
}
```

Create `test.h`:

```cpp
#ifndef TEST_H
#define TEST_H

class CustomClass {
public:
    void method();
};

#endif
```

### 4. Test Complex C++ Patterns

**Data Flow Through Pointers:**

```cpp
void sourceFunction(int** pptr) {
    *pptr = new int(42);  // Source
}

void sinkFunction(int* ptr) {
    if (ptr == nullptr) {
        *ptr = 0;  // Sink - should be detected
    }
}
```

**Virtual Function Dispatch:**

```cpp
class Interface {
public:
    virtual void process() = 0;
};

class Implementation : public Interface {
public:
    void process() override {
        // Test polymorphic call detection
    }
};
```

**Template Specialization:**

```cpp
template<typename T>
void process(T value) {
    // Generic implementation
}

template<>
void process<int>(int value) {
    // Specialized for int - test specialization handling
}
```

### 5. Test Security Patterns

For security queries, include vulnerability patterns:

**Buffer Overflow:**

```cpp
#include <cstring>

void bufferOverflow() {
    char buffer[10];
    strcpy(buffer, "This is too long");  // Should detect overflow
}
```

**Use After Free:**

```cpp
void useAfterFree() {
    int* ptr = new int(42);
    delete ptr;
    *ptr = 43;  // Should detect use-after-free
}
```

**Null Pointer Dereference:**

```cpp
void nullDereference() {
    int* ptr = nullptr;
    *ptr = 42;  // Should detect null dereference
}
```

## MCP Tools Reference

### Test Creation and Validation

- **`codeql_test_extract`**: Extract test databases from C++ source code
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

## Common C++ Testing Pitfalls

❌ **Don't:**

- Forget to include necessary headers
- Write tests that don't compile
- Use C-only features when testing C++ queries
- Ignore template instantiation in tests
- Forget to test both stack and heap allocation
- Skip testing modern C++ features if query targets them

✅ **Do:**

- Write valid, compilable C++ code
- Include comments explaining each test case
- Test both positive and negative cases
- Cover edge cases and boundary conditions
- Use realistic C++ patterns from real codebases
- Test relevant C++ standard library usage
- Include template and class hierarchy tests when relevant

## Quality Checklist

Before considering your C++ tests complete:

- [ ] Test directory created with correct naming
- [ ] `.qlref` file correctly references query
- [ ] `Example1.cpp` includes comprehensive test cases
- [ ] Test code compiles and is valid C++
- [ ] All C++ features used by query are tested
- [ ] Positive cases (should detect) are included
- [ ] Negative cases (should not detect) are included
- [ ] Edge cases are covered
- [ ] `.expected` file has correct format with proper columns
- [ ] Line and column numbers in `.expected` are accurate
- [ ] Test database extracted successfully with `codeql_test_extract`
- [ ] Tests run successfully with `codeql_test_run`
- [ ] All tests pass (actual matches expected)
- [ ] Additional test files added if needed (Example2.cpp, etc.)
- [ ] Tests verified at language level (all C++ tests pass)

## Example: Complete C++ Test Structure

### Query: FindUnsafePointers

Detects unsafe pointer operations in C++ code.

#### Directory Structure

```
server/ql/cpp/tools/test/FindUnsafePointers/
├── FindUnsafePointers.qlref
├── Example1.cpp
├── FindUnsafePointers.expected
└── FindUnsafePointers.testproj/  (auto-generated)
```

#### FindUnsafePointers.qlref

```
src/FindUnsafePointers/FindUnsafePointers.ql
```

#### Example1.cpp

```cpp
#include <memory>

// Test case 1: Null pointer dereference (should detect)
void test1() {
    int* ptr = nullptr;
    *ptr = 42;  // Unsafe: dereferencing null pointer
}

// Test case 2: Safe pointer usage (should NOT detect)
void test2() {
    int value = 42;
    int* ptr = &value;
    if (ptr != nullptr) {
        *ptr = 43;  // Safe: pointer is checked
    }
}

// Test case 3: Use after delete (should detect)
void test3() {
    int* ptr = new int(42);
    delete ptr;
    *ptr = 43;  // Unsafe: use after free
}

// Test case 4: Safe smart pointer (should NOT detect)
void test4() {
    std::unique_ptr<int> ptr = std::make_unique<int>(42);
    *ptr = 43;  // Safe: smart pointer management
}

// Test case 5: Pointer from function (edge case)
int* getPointer() {
    return nullptr;
}

void test5() {
    int* ptr = getPointer();
    *ptr = 42;  // Unsafe: no null check on returned pointer
}
```

#### FindUnsafePointers.expected

```
| file         | line | col | endLine | endCol | message                              |
| Example1.cpp | 6    | 5   | 6       | 8      | Null pointer dereference             |
| Example1.cpp | 23   | 5   | 23      | 8      | Use after free                       |
| Example1.cpp | 39   | 5   | 39      | 8      | Potential null pointer dereference   |
```

## Troubleshooting

### Test Extraction Fails

- Verify C++ code compiles outside CodeQL
- Check for syntax errors in test files
- Ensure all included headers exist
- Review extraction error messages

### Test Results Don't Match Expected

- Compare actual output with `.expected` file
- Verify line and column numbers are correct (1-indexed)
- Check message text matches exactly
- Review query logic for correctness

### Tests Pass Locally But Fail in CI

- Ensure consistent C++ standard version
- Check for platform-specific code
- Verify all dependencies are available
- Review test database extraction settings

## Related Resources

- [C++ Query Development Prompt](https://github.com/advanced-security/codeql-development-template/blob/main/.github/prompts/cpp_query_development.prompt.md) - Comprehensive C++ query development guide
- [CodeQL TDD Generic Skill](../codeql-tdd-generic/SKILL.md) - General test-driven development workflow
- [Test Structure Example](../codeql-tdd-generic/example-test-structure.md) - Language-agnostic test structure
- [C++ AST Documentation](https://codeql.github.com/docs/codeql-language-guides/codeql-for-cpp/) - Official C++ AST reference

## Success Criteria

Your C++ query unit tests are successful when:

1. ✅ Test structure follows conventions
2. ✅ C++ test code compiles and is valid
3. ✅ Test database extracts without errors
4. ✅ All tests pass consistently
5. ✅ Comprehensive coverage of C++ features
6. ✅ Both positive and negative cases included
7. ✅ Edge cases properly handled
8. ✅ Expected results accurately reflect query behavior
