---
name: create-codeql-query-unit-test-csharp
description: Create comprehensive unit tests for CodeQL queries targeting C# code. Use this skill when you need to create, validate, or enhance test coverage for C# CodeQL queries using the CodeQL Development MCP Server tools.
---

# Create CodeQL Query Unit Test for C#

This skill guides you through creating unit tests for CodeQL queries that analyze C# code.

## When to Use This Skill

- Creating new unit tests for a C# CodeQL query
- Adding test cases to existing C# query tests
- Validating C# query behavior against known code patterns

## Prerequisites

- A CodeQL query (`.ql` file) that you want to test
- Understanding of what C# code patterns the query should detect
- Access to CodeQL Development MCP Server tools

## C# Test Structure

### Directory Layout

Organize tests in your query pack's test directory:

```
<query-pack>/test/{QueryName}/
├── {QueryName}.qlref           # Reference to the query being tested
├── Example1.cs                 # Primary test source file
├── Example2.cs                 # Additional test cases (optional)
├── {QueryName}.expected        # Expected query results
└── {QueryName}.testproj/       # Generated test database (auto-created)
```

### File Naming Conventions

- **Test source files**: Use `Example1.cs`, `Example2.cs`, etc. or `test.cs`
- **Query reference**: `{QueryName}.qlref` (exact match to query directory name)
- **Expected results**: `{QueryName}.expected` (exact match to query name)

## Step-by-Step Guide

### Step 1: Create Test Directory

```bash
mkdir -p <query-pack>/test/{QueryName}
```

### Step 2: Create Query Reference File

Create `{QueryName}.qlref` with the relative path to your query:

```
{QueryName}/{QueryName}.ql
```

**Important**: Path is relative to your query pack's source directory (where your queries are organized).

### Step 3: Write Test Source Code

Create `Example1.cs` with test cases:

**Positive Cases** (should be detected):

```csharp
using System;
using System.IO;
using System.Runtime.Serialization.Formatters.Binary;

// Test case: Unsafe pattern
public class UnsafeExample
{
    public void UnsafeOperation(string input)
    {
        var formatter = new BinaryFormatter();
        var stream = new MemoryStream(Convert.FromBase64String(input));
        var obj = formatter.Deserialize(stream);  // Should detect
    }
}
```

**Negative Cases** (should NOT be detected):

```csharp
using System;

// Test case: Safe pattern
public class SafeExample
{
    public void SafeOperation(string input)
    {
        if (IsValid(input))
        {
            // Safe operation
        }
    }

    private bool IsValid(string input) => !string.IsNullOrEmpty(input);
}
```

**C#-Specific Considerations**:

- Include necessary `using` statements
- Test relevant C# features (properties, LINQ, async/await, pattern matching)
- For security queries, include .NET-specific patterns (SQL injection with `SqlCommand`, XSS with `HttpUtility`)
- Test ASP.NET patterns for web queries

### Step 4: Create Expected Results File

Create `{QueryName}.expected`:

```
| file         | line | col | endLine | endCol | message                    |
| Example1.cs  | 12   | 19  | 12      | 46     | Unsafe deserialization     |
```

- Column/line numbers are 1-indexed
- Match query output exactly

### Step 5: Extract Test Database

Use `codeql_test_extract`:

```json
{
  "testPath": "<query-pack>/test/{QueryName}",
  "searchPath": ["<query-pack>"]
}
```

Creates database at `test/{QueryName}/{QueryName}.testproj/`.

### Step 6: Analyze Code Structure (Optional)

Run `PrintAST` to understand C# AST:

```json
{
  "query": "<query-pack>/src/PrintAST/PrintAST.ql",
  "database": "<query-pack>/test/{QueryName}/{QueryName}.testproj",
  "searchPath": ["<query-pack>"]
}
```

Key C# AST nodes: `Class`, `Method`, `Property`, `MethodCall`, `QueryExpr`, `AwaitExpr`

### Step 7: Run Tests

Execute tests with `codeql_test_run`:

```json
{
  "testPath": "<query-pack>/test/{QueryName}",
  "searchPath": ["<query-pack>"]
}
```

✅ **Pass**: Output matches `.expected` exactly
❌ **Fail**: Differences require query or expected file updates

### Step 8: Iterate Until Tests Pass

1. Review actual query output
2. Compare with expected results
3. Update query logic or `.expected` file
4. Re-run tests
5. Repeat until passing

Use `codeql_test_accept` to update baseline (only after verification).

### Step 9: Add More Test Cases

Create additional files (`Example2.cs`, etc.), update `.expected`, re-extract database, and re-run tests.

## MCP Tools Reference

- **`codeql_test_extract`**: Extract test databases from C# source code
- **`codeql_test_run`**: Run query tests and compare with expected results
- **`codeql_test_accept`**: Accept actual results as new baseline (use with caution)
- **`codeql_query_compile`**: Compile CodeQL queries
- **`codeql_query_run`**: Run queries (e.g., PrintAST)
- **`codeql_bqrs_decode`**: Decode binary query results
- **`codeql_pack_install`**: Install query pack dependencies

## Common Pitfalls

❌ **Don't:**

- Forget `using` statements
- Use incorrect file extensions (`.cs` not `.cpp`)
- Skip negative test cases
- Hardcode expected line numbers without verifying

✅ **Do:**

- Write compilable C# code
- Include positive, negative, and edge cases
- Document each test case with comments
- Verify line/column numbers in `.expected` match source

## Example: Complete Test Structure

### Query: FindUnsafeDeserialization

```
<query-pack>/test/FindUnsafeDeserialization/
├── FindUnsafeDeserialization.qlref
├── Example1.cs
├── FindUnsafeDeserialization.expected
└── FindUnsafeDeserialization.testproj/  (auto-generated)
```

**FindUnsafeDeserialization.qlref**:

```
FindUnsafeDeserialization/FindUnsafeDeserialization.ql
```

**Example1.cs**:

```csharp
using System;
using System.IO;
using System.Runtime.Serialization.Formatters.Binary;
using System.Threading.Tasks;

// Test case 1: Unsafe deserialization (should detect)
public class TestCase1
{
    public void UnsafeDeserialize(byte[] data)
    {
        var formatter = new BinaryFormatter();
        var stream = new MemoryStream(data);
        var obj = formatter.Deserialize(stream);  // Unsafe: untrusted data
    }
}

// Test case 2: Safe with validation (should NOT detect)
public class TestCase2
{
    public void SafeDeserialize(byte[] data)
    {
        if (ValidateSignature(data))
        {
            var formatter = new BinaryFormatter();
            var stream = new MemoryStream(data);
            var obj = formatter.Deserialize(stream);  // Safe: validated
        }
    }

    private bool ValidateSignature(byte[] data) => true;
}

// Test case 3: Async context (should detect)
public class TestCase3
{
    public async Task<object> DeserializeAsync(byte[] data)
    {
        await Task.Delay(10);
        var formatter = new BinaryFormatter();
        var stream = new MemoryStream(data);
        return formatter.Deserialize(stream);  // Unsafe: async
    }
}
```

**FindUnsafeDeserialization.expected**:

```
| file         | line | col | endLine | endCol | message                |
| Example1.cs  | 13   | 19  | 13      | 46     | Unsafe deserialization |
| Example1.cs  | 40   | 16  | 40      | 43     | Unsafe deserialization |
```

## Related Resources

- [C# Query Development Prompt](https://github.com/advanced-security/codeql-development-template/blob/main/.github/prompts/csharp_query_development.prompt.md)
- [CodeQL TDD Generic Skill](../create-codeql-query-tdd-generic/SKILL.md)
- [C# AST Documentation](https://codeql.github.com/docs/codeql-language-guides/codeql-for-csharp/)

## Success Criteria

- ✅ Test structure follows conventions
- ✅ C# test code compiles and is valid
- ✅ Test database extracts without errors
- ✅ All tests pass consistently
- ✅ Both positive and negative cases included
- ✅ Expected results accurately reflect query behavior
