# Java Quality Queries Workshop 1: Method Testing Isolated Exception

This workshop teaches you how to develop a CodeQL query that detects non-isolated exception testing patterns in JUnit tests.

## Learning Objectives

By completing this workshop, you will learn:

1. **Exercise 1**: How to identify JUnit 4 and JUnit 5 test methods using CodeQL
2. **Exercise 2**: How to find methods that declare checked exceptions in their throws clause
3. **Exercise 3**: How to detect `assertThrows()` and `fail()` test assertion patterns
4. **Exercise 4**: How to combine all concepts to detect ambiguous exception testing patterns

## Background: The Problem

When testing if code throws a given exception, avoid ambiguous tests where multiple methods are called within the same test assertion and where the same exception type could be thrown by more than one method.

### Non-Compliant Example

```java
@Test
public void testNonCompliant() {
    // BAD: Both methods can throw IOException - which one is being tested?
    Assert.assertThrows(IOException.class, () ->
        example.exceptionOnNotZero(example.exceptionOnNegative(-1))
    );
}
```

### Compliant Example

```java
@Test
public void testCompliant() {
    // GOOD: Single method call in the assertion
    Assert.assertThrows(IOException.class, () ->
        example.exceptionOnNegative(-1)
    );
}
```

## Prerequisites

- CodeQL CLI installed (version 2.15.0 or later)
- VS Code with CodeQL extension
- Basic understanding of Java and JUnit testing
- Familiarity with CodeQL query basics

## Setup

1. Navigate to the workshop directory:

   ```bash
   cd .github/skills/create-codeql-query-development-workshop/java-quality-queries-workshop-1
   ```

2. Install pack dependencies:

   ```bash
   codeql pack install solutions
   codeql pack install solutions-tests
   codeql pack install exercises
   codeql pack install exercises-tests
   ```

3. Extract test databases (done automatically by `codeql test run`):
   ```bash
   codeql test extract solutions-tests/Exercise1
   ```

## Workshop Structure

```
java-quality-queries-workshop-1/
├── exercises/           # Your exercise queries (incomplete)
│   ├── Exercise1.ql    # Find JUnit test methods
│   ├── Exercise2.ql    # Find exception-throwing methods
│   ├── Exercise3.ql    # Find assertThrows/fail patterns
│   └── Exercise4.ql    # Detect non-isolated exception tests
├── solutions/           # Reference implementations
│   └── *.ql            # Complete solutions for each exercise
├── exercises-tests/     # Tests for your exercises
├── solutions-tests/     # Tests for solutions
├── tests-common/        # Shared test code and stubs
│   ├── ExampleClass.java
│   ├── JUnit4_Test.java
│   ├── JUnit5_Test.java
│   └── stubs/          # JUnit library stubs
└── graphs/              # AST visualizations (generated)
```

## How to Use This Workshop

### Step 1: Study the Test Code

Look at the test code in `tests-common/` to understand what patterns we're detecting:

- `ExampleClass.java` - Production class with methods that throw `IOException`
- `JUnit4_Test.java` - JUnit 4 tests with compliant and non-compliant cases
- `JUnit5_Test.java` - JUnit 5 tests with similar patterns

### Step 2: Work Through Exercises

For each exercise:

1. **Open the exercise file** in `exercises/Exercise{N}.ql`
2. **Read the TODO comments** - they explain what to implement
3. **Implement the missing logic** based on hints
4. **Run tests** to validate your implementation:
   ```bash
   codeql test run exercises-tests/Exercise{N}
   ```

### Step 3: Check Your Work

Compare your solutions against the reference implementations in `solutions/`.

Run solution tests to see expected results:

```bash
codeql test run solutions-tests/Exercise{N}
```

## Exercise Progression

### Exercise 1: Find JUnit Test Methods

**Goal**: Identify methods annotated with `@Test` from JUnit 4 or JUnit 5.

**Key Concepts**:

- Using `getAnAnnotation()` to find method annotations
- Using `hasQualifiedName()` to match specific annotation types
- Creating helper classes to identify test methods

**Example AST Pattern**:

```
#-----|         1: (Annotations)
#   20|           1: [Annotation] Test
#   21|         3: [TypeAccess] void
```

### Exercise 2: Find Exception-Throwing Methods

**Goal**: Identify method calls where the target method declares checked exceptions.

**Key Concepts**:

- Using `getAnException()` to find declared exceptions
- Understanding the relationship between `MethodCall` and `Method`
- Filtering by exception type

### Exercise 3: Find assertThrows and fail() Patterns

**Goal**: Detect JUnit exception testing patterns.

**Key Concepts**:

- Finding `assertThrows()` calls and their lambda bodies
- Finding `fail()` calls within try blocks
- Understanding try-catch statement structure

**Example AST Pattern for assertThrows**:

```
#   71|             0: [MethodCall] assertThrows(...)
#   72|               0: [TypeAccess] IOException.class
#   73|               1: [LambdaExpr] () -> ...
#   73|                 0: [MethodCall] exceptionOnNotZero(...)
```

### Exercise 4: Detect Non-Isolated Exception Tests

**Goal**: Combine all concepts to find tests where multiple methods can throw the same exception.

**Key Concepts**:

- Joining results from multiple predicates
- Comparing exception types between method calls
- Avoiding duplicate results with ordering

## Running Tests

### Test Individual Exercises

```bash
# Test your exercise implementation
codeql test run exercises-tests/Exercise1

# Test the solution
codeql test run solutions-tests/Exercise1
```

### Test All Solutions

```bash
codeql test run solutions-tests
```

## Understanding the AST

To understand how CodeQL represents the test code, you can run the PrintAST query:

```bash
# From the workshop directory
codeql query run \
  --database solutions-tests/Exercise1/Exercise1.testproj \
  -- ../../../server/ql/java/tools/src/PrintAST/PrintAST.ql
```

Key AST classes for this workshop:

- `Method` - Method declarations
- `MethodCall` - Method invocations
- `Annotation` - Annotations on declarations
- `TryStmt` - Try statements
- `LambdaExpr` - Lambda expressions

## Troubleshooting

### "Could not resolve type Method"

Install pack dependencies:

```bash
codeql pack install exercises
```

### Tests Fail with Unexpected Results

1. Compare your results with the `.expected` file
2. Check the solution for the correct implementation
3. Use PrintAST to understand the code structure

### Database Extraction Fails

Ensure the `options` file has correct paths to JUnit stubs:

```
//semmle-extractor-options: --javac-args -cp ${testdir}/../../tests-common/stubs/junit-4.13:...
```

## Additional Resources

- [CodeQL for Java Documentation](https://codeql.github.com/docs/codeql-language-guides/codeql-for-java/)
- [Advanced TDD Guide](../../server/src/prompts/ql-tdd-advanced.prompt.md)
- [Workshop Structure Reference](./workshop-structure-reference.md)

## Source Query

This workshop is based on the `MethodTestingIsolatedException` query from the
[advanced-security/codeql-quality-queries](https://github.com/advanced-security/codeql-quality-queries) repository.

Query ID: `java/method-testing-isolated-exception`
