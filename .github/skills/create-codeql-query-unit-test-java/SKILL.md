---
name: create-codeql-query-unit-test-java
description: Create comprehensive unit tests for CodeQL queries targeting Java code. Use this skill when you need to create, validate, or enhance test coverage for Java CodeQL queries using the CodeQL Development MCP Server tools.
---

# Create CodeQL Query Unit Test for Java

This skill guides you through creating comprehensive unit tests for CodeQL queries that analyze Java code.

## When to Use This Skill

- Creating new unit tests for a Java CodeQL query
- Adding test cases to existing Java query tests
- Validating Java query behavior against known code patterns
- Testing Java security queries, code quality queries, or analysis queries

## Prerequisites

Before creating tests, ensure you have:

- A CodeQL query (`.ql` file) that you want to test
- Understanding of what Java code patterns the query should detect
- Knowledge of Java language features and frameworks relevant to your query
- Access to CodeQL Development MCP Server tools
- A query pack directory where your query is organized

## Java Test Structure

### Directory Layout

Organize tests in your query pack's test directory:

```
<query-pack>/test/{QueryName}/
├── {QueryName}.qlref           # Reference to the query being tested
├── Example1.java               # Primary test source file
├── Example2.java               # Additional test cases (optional)
├── Helper.java                 # Helper classes if needed (optional)
├── {QueryName}.expected        # Expected query results
└── {QueryName}.testproj/       # Generated test database (auto-created)
```

### File Naming Conventions

- **Test source files**: Use `Example1.java`, `Example2.java`, etc. or `Test.java`
- **Helper files**: Use `.java` extension (e.g., `Helper.java`, `TestData.java`)
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

**Example** (`FindInsecureCrypto.qlref`):

```
src/FindInsecureCrypto/FindInsecureCrypto.ql
```

**Important**: The path is relative to your query pack's source directory (where your queries are organized).

### Step 3: Write Test Source Code

Create `Example1.java` with comprehensive test cases covering:

#### Positive Test Cases (Should Be Detected)

Code patterns that your query **should** find:

```java
import javax.crypto.Cipher;
import java.security.MessageDigest;

public class InsecureCrypto {
    // Positive case: Weak algorithm
    public void weakCipher() throws Exception {
        Cipher cipher = Cipher.getInstance("DES");  // Should be detected: weak algorithm
        // Use cipher...
    }

    // Positive case: Weak hash
    public void weakHash() throws Exception {
        MessageDigest md = MessageDigest.getInstance("MD5");  // Should be detected: weak hash
        // Use digest...
    }
}
```

#### Negative Test Cases (Should NOT Be Detected)

Code patterns that your query **should not** flag:

```java
import javax.crypto.Cipher;
import java.security.MessageDigest;

public class SecureCrypto {
    // Negative case: Strong algorithm
    public void strongCipher() throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");  // Should NOT be detected: strong algorithm
        // Use cipher...
    }

    // Negative case: Strong hash
    public void strongHash() throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");  // Should NOT be detected: strong hash
        // Use digest...
    }
}
```

#### Edge Cases

Boundary conditions and unusual scenarios:

```java
// Edge case: Cipher in configuration
public class EdgeCase {
    private static final String ALGORITHM = "AES";

    public Cipher getCipher() throws Exception {
        return Cipher.getInstance(ALGORITHM + "/CBC/PKCS5Padding");  // Test string concatenation
    }
}
```

#### Java-Specific Test Patterns

Include relevant Java patterns for your query type:

```java
// Test annotations (Spring, JAX-RS, etc.)
@RestController
public class AnnotatedClass {
    @GetMapping("/data")
    public String getData(@RequestParam String param) { }
}

// Test lambda expressions and streams
numbers.stream().filter(n -> n > 0).forEach(System.out::println);

// Test try-with-resources
try (FileReader fr = new FileReader("file.txt")) {
    // Auto-closeable resources
}
```

**Include Comments**: Document what each test case validates:

```java
// Test case 1: Detects weak cryptographic algorithms
public void test1() throws Exception {
    Cipher cipher = Cipher.getInstance("DES");  // Expected: Alert on this line
}

// Test case 2: Should not flag strong algorithms
public void test2() throws Exception {
    Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");  // Expected: No alert
}
```

### Step 4: Create Expected Results File

Create `{QueryName}.expected` with the expected query output:

```
| Example1.java:8:9:8:20 | targetFunc(...) | Call to `targetFunc` from `caller1` |
| Example1.java:12:9:12:20 | targetFunc(...) | Call to `targetFunc` from `caller2` |
```

**Column Definitions:**

- First column: File location in format `file:line:col:endLine:endCol`
- Second column: Code snippet or expression
- Third column: Expected alert message from the query

**Important Notes:**

- Line and column numbers are 1-indexed (first line is 1, first character is column 1)
- Location format uses colon separators: `file:startLine:startCol:endLine:endCol`
- Message text should match query output exactly
- Order results by file, then line, then column

**Alternative format** (if query uses table output):

```
| file          | line | col | endLine | endCol | message                          |
| Example1.java | 8    | 20  | 8       | 43     | Weak cryptographic algorithm     |
| Example1.java | 15   | 25  | 15      | 51     | Use of MD5 hash function         |
```

### Step 5: Extract Test Database

Use the `codeql_test_extract` MCP tool to create a test database:

```json
{
  "testPath": "<query-pack>/test/{QueryName}",
  "searchPath": ["<query-pack>"]
}
```

**What This Does:**

- Compiles your Java test code
- Creates a CodeQL database at `test/{QueryName}/{QueryName}.testproj/`
- Extracts AST and semantic information
- Prepares database for query execution

**Java Extraction Notes:**

- Supports Java 8, 11, 17, 21 features
- Handles annotations, generics, and lambda expressions
- Processes multiple source files and packages
- Includes standard library modeling for JDK classes
- Extracts framework-specific patterns (Spring, Servlet, etc.)

### Step 6: Analyze Java Code Structure (Optional)

Before finalizing your query, use `PrintAST` to understand the Java AST structure:

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

**Key Java AST Nodes to Look For:**

- **Methods**: `Method`, `Constructor`
- **Classes**: `Class`, `Interface`, `EnumType`, `AnnotationType`
- **Expressions**: `MethodCall`, `VarAccess`, `FieldAccess`, `ArrayAccess`
- **Statements**: `BlockStmt`, `IfStmt`, `ReturnStmt`, `TryStmt`
- **Types**: `TypeAccess`, `ParameterizedType`, `ArrayTypeAccess`
- **Annotations**: `Annotation`, `AnnotationElement`
- **Generics**: `TypeVariable`, `WildcardTypeAccess`
- **Lambdas**: `LambdaExpr`, `MethodReference`

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

1. Create `Example2.java` with additional scenarios
2. Update `{QueryName}.expected` with new expected results
3. Re-extract test database with `codeql_test_extract`
4. Run tests again with `codeql_test_run`

## Java-Specific Best Practices

### 1. Test Java Language Features

Include tests for Java features relevant to your query:

- **Object-Oriented**: Test inheritance, polymorphism, interfaces
- **Annotations**: Test framework annotations (Spring, JPA, JAX-RS)
- **Generics**: Test type parameters and wildcards
- **Lambda Expressions**: Test functional interfaces and method references
- **Exception Handling**: Test try-catch-finally, try-with-resources

### 2. Test Framework Patterns When Relevant

If your query targets specific frameworks, include minimal test cases:

```java
// Spring MVC
@GetMapping("/endpoint")
public String handler(@RequestParam String param) { }

// Servlet API
public void doGet(HttpServletRequest req, HttpServletResponse resp) { }

// JPA
@Entity
public class User {
    @Id private Long id;
}
```

### 3. Test Data Flow Patterns

For taint tracking queries, test data flow through method calls:

```java
public void dataFlowExample() {
    String tainted = getSource();  // Source
    processSink(tainted);           // Sink
}
```

## MCP Tools Reference

### Test Creation and Validation

- **`codeql_test_extract`**: Extract test databases from Java source code
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

## Common Java Testing Pitfalls

❌ **Don't:**

- Forget to include necessary imports
- Write tests that don't compile
- Use language features not supported by target Java version
- Ignore framework-specific patterns when testing framework queries
- Forget to test annotation-based configurations
- Skip testing generic types and type erasure
- Use internal APIs without proper context

✅ **Do:**

- Write valid, compilable Java code
- Include comments explaining each test case
- Test both positive and negative cases
- Cover edge cases and boundary conditions
- Use realistic Java patterns from real applications
- Test relevant framework usage (Spring, Jakarta EE, etc.)
- Include annotation and generics tests when relevant
- Test lambda expressions and streams for modern Java queries

## Quality Checklist

Before considering your Java tests complete:

- [ ] Test directory created with correct naming
- [ ] `.qlref` file correctly references query
- [ ] `Example1.java` includes comprehensive test cases
- [ ] Test code compiles and is valid Java
- [ ] All Java features used by query are tested
- [ ] Framework-specific patterns tested (if applicable)
- [ ] Positive cases (should detect) are included
- [ ] Negative cases (should not detect) are included
- [ ] Edge cases are covered
- [ ] `.expected` file has correct format with proper locations
- [ ] Line and column numbers in `.expected` are accurate
- [ ] Test database extracted successfully with `codeql_test_extract`
- [ ] Tests run successfully with `codeql_test_run`
- [ ] All tests pass (actual matches expected)
- [ ] Additional test files added if needed (Example2.java, etc.)
- [ ] Tests verified at language level (all Java tests pass)

## Example: Complete Java Test Structure

### Query: FindInsecureCrypto

Detects insecure cryptographic operations in Java code.

#### Directory Structure

```
server/ql/java/tools/test/FindInsecureCrypto/
├── FindInsecureCrypto.qlref
├── Example1.java
├── FindInsecureCrypto.expected
└── FindInsecureCrypto.testproj/  (auto-generated)
```

#### FindInsecureCrypto.qlref

```
src/FindInsecureCrypto/FindInsecureCrypto.ql
```

#### Example1.java

```java
import javax.crypto.*;
import java.security.*;

// Test case 1: Weak cipher algorithm (should detect)
class WeakCipher {
    public void useDES() throws Exception {
        Cipher cipher = Cipher.getInstance("DES");  // Unsafe: weak algorithm
    }
}

// Test case 2: Strong cipher algorithm (should NOT detect)
class StrongCipher {
    public void useAES() throws Exception {
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");  // Safe: strong algorithm
    }
}

// Test case 3: Weak hash function (should detect)
class WeakHash {
    public void useMD5() throws Exception {
        MessageDigest md = MessageDigest.getInstance("MD5");  // Unsafe: weak hash
    }
}

// Test case 4: Strong hash function (should NOT detect)
class StrongHash {
    public void useSHA256() throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");  // Safe: strong hash
    }
}

// Test case 5: Static IV usage (should detect - edge case)
class StaticIV {
    public void staticInitVector() throws Exception {
        byte[] iv = new byte[16];  // Unsafe: static/zero IV
        Cipher cipher = Cipher.getInstance("AES/CBC/PKCS5Padding");
        cipher.init(Cipher.ENCRYPT_MODE, generateKey(), new IvParameterSpec(iv));
    }

    private SecretKey generateKey() throws Exception {
        return KeyGenerator.getInstance("AES").generateKey();
    }
}
```

#### FindInsecureCrypto.expected

```
| Example1.java:7:24:7:49 | getInstance(...) | Weak cryptographic algorithm: DES |
| Example1.java:21:28:21:56 | getInstance(...) | Weak hash function: MD5 |
| Example1.java:35:20:35:31 | new byte[] | Static initialization vector |
```

## Troubleshooting

### Test Extraction Fails

- Verify Java code compiles outside CodeQL
- Check for syntax errors in test files
- Ensure all required imports exist
- Review Java version compatibility
- Check for missing framework dependencies

### Test Results Don't Match Expected

- Compare actual output with `.expected` file
- Verify line and column numbers are correct (1-indexed)
- Check message text matches exactly
- Review query logic for correctness
- Ensure AST node types match expectations

### Tests Pass Locally But Fail in CI

- Ensure consistent Java version
- Check for platform-specific code
- Verify all dependencies are available
- Review test database extraction settings
- Check framework version compatibility

## Related Resources

- [Java Query Development Prompt](https://github.com/advanced-security/codeql-development-template/blob/main/.github/prompts/java_query_development.prompt.md) - Comprehensive Java query development guide
- [CodeQL TDD Generic Skill](../create-codeql-query-tdd-generic/SKILL.md) - General test-driven development workflow
- [Java QSpec Reference](../../../server/src/resources/qspec-reference-java.md) - Java-specific QSpec patterns
- [Java AST Documentation](https://codeql.github.com/docs/codeql-language-guides/codeql-for-java/) - Official Java AST reference
- [Generate QSpec for Java](../../prompts/generate-qspec-java.prompt.md) - Java QSpec generation guidance

## Success Criteria

Your Java query unit tests are successful when:

1. ✅ Test structure follows conventions
2. ✅ Java test code compiles and is valid
3. ✅ Test database extracts without errors
4. ✅ All tests pass consistently
5. ✅ Comprehensive coverage of Java features
6. ✅ Framework-specific patterns tested (if applicable)
7. ✅ Both positive and negative cases included
8. ✅ Edge cases properly handled
9. ✅ Expected results accurately reflect query behavior
