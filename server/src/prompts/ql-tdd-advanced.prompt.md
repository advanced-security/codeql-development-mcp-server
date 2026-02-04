---
agent: agent
---

# Advanced Test-Driven CodeQL Query Development

This advanced guide builds on the basic TDD methodology with powerful MCP server tools for deeper code analysis. Use this when developing complex queries that require understanding AST structure, control flow, and call relationships.

For basic TDD workflow, see: `codeql://prompts/ql-tdd-basic`

## When to Use This Advanced Guide

- **Complex AST patterns**: When you need to understand how CodeQL represents specific language constructs
- **Control flow queries**: When analyzing program flow, branching, or loop structures
- **Call graph analysis**: When tracing function calls or method invocations
- **Iterative refinement**: When debugging queries that don't produce expected results
- **Performance optimization**: When understanding query evaluation patterns

## Core Advanced Tools

### 1. AST/CFG Visualization with `codeql_query_run`

Use the bundled tools queries to visualize code structure:

```typescript
// Generate Abstract Syntax Tree for test code
codeql_query_run: {
  queryName: "PrintAST",
  queryLanguage: "java",  // or "javascript", "python", "cpp", etc.
  database: "/path/to/test.testproj",
  format: "graphtext",
  interpretedOutput: "/path/to/ast-output.txt"
}

// Generate Control Flow Graph
codeql_query_run: {
  queryName: "PrintCFG",
  queryLanguage: "java",
  database: "/path/to/test.testproj",
  format: "graphtext",
  interpretedOutput: "/path/to/cfg-output.txt"
}

// Analyze outbound calls from a function
codeql_query_run: {
  queryName: "CallGraphFrom",
  queryLanguage: "java",
  database: "/path/to/test.testproj",
  sourceFunction: "myFunction",
  format: "sarif-latest"
}

// Analyze inbound calls to a function
codeql_query_run: {
  queryName: "CallGraphTo",
  queryLanguage: "java",
  database: "/path/to/test.testproj",
  targetFunction: "targetMethod",
  format: "sarif-latest"
}
```

**Critical**: Always verify that tools queries return **non-empty output** with actual nodes/edges, not just headers.

### 2. Quick Evaluation with `quick_evaluate`

Use `quick_evaluate` for rapid iteration on specific predicates or classes:

```typescript
// First, find the position of a predicate
find_predicate_position: {
  file: "/path/to/Query.ql",
  name: "isVulnerableSink"
}

// Then evaluate just that predicate
quick_evaluate: {
  file: "/path/to/Query.ql",
  db: "/path/to/test.testproj",
  symbol: "isVulnerableSink",
  output_path: "/tmp/quickeval.bqrs"
}

// Or evaluate a specific class
find_class_position: {
  file: "/path/to/Query.ql",
  name: "ThrowingMethodCall"
}

quick_evaluate: {
  file: "/path/to/Query.ql",
  db: "/path/to/test.testproj",
  symbol: "ThrowingMethodCall"
}
```

### 3. Query File Discovery with `find_codeql_query_files`

Use this tool frequently to understand query dependencies and test structure:

```typescript
find_codeql_query_files: {
  queryPath: '/path/to/Query.ql';
}
// Returns: query file, test directory, test files, metadata, dependencies
```

## Advanced TDD Workflow

### Phase 0: Test Environment Setup (Critical for Java)

For Java tests that depend on external libraries (JUnit, etc.), create an `options` file in each test directory:

```text
//semmle-extractor-options: --javac-args -cp ${testdir}/../../stubs/junit-4.13:${testdir}/../../stubs/junit-jupiter-api-5.2.0
```

**Key points**:

- `${testdir}` is relative to the test directory containing the `options` file
- Use `:` (colon) to separate multiple classpath entries
- Stub files must contain minimal class/interface definitions for compilation

### Phase 1: Deep Code Analysis

Before writing any query logic:

1. **Extract test database**:

   ```typescript
   codeql_test_extract: {
     testPath: "/path/to/test/QueryTest",
     searchPath: "/path/to/pack"
   }
   ```

2. **Generate and study the AST**:

   ```typescript
   codeql_query_run: {
     queryName: "PrintAST",
     queryLanguage: "java",
     database: "/path/to/test.testproj",
     format: "graphtext",
     interpretedOutput: "/path/to/ast.txt"
   }
   ```

3. **Identify key AST classes and predicates** from the output:
   - Note the class names (e.g., `MethodCall`, `TryStmt`, `LambdaExpr`)
   - Note parent-child relationships
   - Identify which nodes correspond to your test cases

4. **Generate CFG if analyzing control flow**:
   ```typescript
   codeql_query_run: {
     queryName: "PrintCFG",
     queryLanguage: "java",
     database: "/path/to/test.testproj",
     format: "graphtext",
     interpretedOutput: "/path/to/cfg.txt"
   }
   ```

### Phase 2: Iterative Predicate Development

Instead of writing the full query at once:

1. **Start with a single class or predicate**:

   ```ql
   class MyPattern extends MethodCall {
     MyPattern() {
       this.getMethod().hasName("targetMethod")
     }
   }
   ```

2. **Use quick_evaluate to test it**:

   ```typescript
   quick_evaluate: {
     file: "/path/to/Query.ql",
     db: "/path/to/test.testproj",
     symbol: "MyPattern"
   }
   ```

3. **Refine based on results**:
   - Too many results? Add constraints
   - Too few results? Relax constraints
   - Wrong results? Study AST output again

4. **Repeat for each component** before combining

### Phase 3: Incremental Query Assembly

1. **Combine validated predicates** into the main query
2. **Run full tests** after each combination:

   ```typescript
   codeql_test_run: {
     testPath: "/path/to/test/QueryTest",
     searchPath: "/path/to/pack"
   }
   ```

3. **Use find_codeql_query_files** to track all related files:
   ```typescript
   find_codeql_query_files: {
     queryPath: '/path/to/Query.ql';
   }
   ```

## Common Advanced Patterns

### Pattern: Understanding Nested Structures

When your query involves nested constructs (e.g., lambdas inside method calls):

```ql
// First, find the outer construct
class OuterPattern extends MethodCall {
  OuterPattern() {
    this.getMethod().hasName("assertThrows")
  }

  // Navigate to inner construct
  Expr getLambdaBody() {
    exists(LambdaExpr le |
      le = this.getAChildExpr() and
      result = le.getExprBody()
    )
  }
}
```

Use `PrintAST` to understand the parent-child relationships.

### Pattern: Control Flow Dependencies

When your query needs to understand execution order:

```ql
// Use CFG to understand which statements precede others
predicate precedesInBlock(Stmt s1, Stmt s2) {
  exists(BasicBlock bb |
    s1.getBasicBlock() = bb and
    s2.getBasicBlock() = bb and
    s1.getLocation().getStartLine() < s2.getLocation().getStartLine()
  )
}
```

Use `PrintCFG` to verify the control flow structure.

### Pattern: Call Chain Analysis

When tracing calls through multiple functions:

```typescript
// First, understand the call graph from your entry point
codeql_query_run: {
  queryName: "CallGraphFrom",
  queryLanguage: "java",
  database: "/path/to/test.testproj",
  sourceFunction: "entryPoint"
}

// Then trace back from your target
codeql_query_run: {
  queryName: "CallGraphTo",
  queryLanguage: "java",
  database: "/path/to/test.testproj",
  targetFunction: "sensitiveOperation"
}
```

## Debugging Tips

### When Results Are Empty

1. **Check AST first**: Run `PrintAST` to verify the code structure matches expectations
2. **Simplify the query**: Remove constraints one by one using `quick_evaluate`
3. **Check enclosing callables**: Lambda bodies may have different `getEnclosingCallable()` than expected
4. **Verify test database extraction**: Ensure the `.testproj` directory was created successfully

### When Results Are Incorrect

1. **Quick evaluate individual predicates**: Isolate which part is wrong
2. **Compare with AST output**: Verify your understanding of the structure
3. **Check for missing cases**: Your pattern may not cover all code variations

### When Compilation Fails with "override" Error

If you see `annotation 'override' missing on predicate`, you've accidentally created a predicate with the same name as one in the parent class. **Rename your predicate** to avoid the conflict:

```ql
// BAD: Method already has getAThrownExceptionType()
class ThrowingMethod extends Method {
  RefType getAThrownExceptionType() { ... }  // Error!
}

// GOOD: Use a distinct name
class ThrowingMethod extends Method {
  RefType getDeclaredExceptionType() { ... }  // Works
}
```

### When Query Is Slow

1. **Enable evaluator logs**:

   ```typescript
   codeql_query_run: {
     query: "/path/to/Query.ql",
     database: "/path/to/db",
     "evaluator-log": "/path/to/log.json",
     "evaluator-log-level": 5
   }
   ```

2. **Generate log summary**:

   ```typescript
   codeql_generate_log_summary: {
     inputLog: "/path/to/log.json",
     format: "text"
   }
   ```

3. **Profile the query**:
   ```typescript
   profile_codeql_query: {
     query: "/path/to/Query.ql",
     database: "/path/to/db"
   }
   ```

## Checklist for Complex Queries

### Before Starting

- [ ] Test database extracted successfully
- [ ] `PrintAST` output reviewed and understood
- [ ] Key AST classes identified
- [ ] Test cases cover positive, negative, and edge cases

### During Development

- [ ] Each predicate/class tested with `quick_evaluate`
- [ ] `find_codeql_query_files` used to track dependencies
- [ ] CFG consulted for control flow patterns
- [ ] Call graphs generated for cross-function analysis

### After Each Change

- [ ] Query compiles with `codeql_query_compile`
- [ ] Quick evaluation shows expected results
- [ ] Full tests pass with `codeql_test_run`
- [ ] No duplicate or missing results

### Final Validation

- [ ] All test cases pass
- [ ] No false positives in results
- [ ] No false negatives (all expected cases caught)
- [ ] Query formatted with `codeql_query_format`
- [ ] Performance acceptable (check with `profile_codeql_query`)

## Test Acceptance Workflow

When your query produces correct results but differs from the `.expected` file:

1. **Review the `.actual` file** to verify results are correct
2. **Accept the results** to update the expected baseline:
   ```typescript
   codeql_test_accept: {
     tests: ['/path/to/test/QueryTest'];
   }
   ```
3. **Re-run tests** to confirm they now pass

**Warning**: Only accept results after careful review. Don't blindly accept to make tests pass.

## Tool Reference

| Tool                             | Purpose                           | When to Use                     |
| -------------------------------- | --------------------------------- | ------------------------------- |
| `codeql_query_run` (PrintAST)    | Visualize AST structure           | Start of development, debugging |
| `codeql_query_run` (PrintCFG)    | Visualize control flow            | Control flow queries            |
| `codeql_query_run` (CallGraph\*) | Analyze call relationships        | Cross-function queries          |
| `codeql_bqrs_interpret`          | Convert BQRS to readable format   | After running graph queries     |
| `quick_evaluate`                 | Test individual predicates        | Iterative development           |
| `find_predicate_position`        | Locate predicate for quickeval    | Before quick_evaluate           |
| `find_class_position`            | Locate class for quickeval        | Before quick_evaluate           |
| `find_codeql_query_files`        | Discover related files            | Planning, tracking changes      |
| `codeql_test_accept`             | Accept actual results as expected | After verifying correct output  |
| `profile_codeql_query`           | Performance analysis              | Optimization                    |

## Interpreting Graph Query Results

When running `PrintAST` or `PrintCFG`, the results are stored in BQRS format. To convert to readable text:

```typescript
// After codeql_query_run produces results.bqrs
codeql_bqrs_interpret: {
  file: "/path/to/results.bqrs",
  format: "graphtext",
  output: "/path/to/output.txt",
  t: ["kind=graph", "id=java/tools/print-ast"]
}
```

**Note**: The output may create a directory structure (e.g., `output.txt/java/tools/print-ast.txt`) rather than a single file.

## Example: Workshop Development

When creating CodeQL workshops, this advanced methodology is essential:

1. **Analyze production query** with `find_codeql_query_files`
2. **Generate AST/CFG** for workshop test code
3. **Decompose query** into stages, validating each with `quick_evaluate`
4. **Create exercises** with scaffolding based on AST understanding
5. **Validate solutions** ensure each stage produces correct results

### Exercise Design Tips

When creating exercise stubs from solutions:

```ql
// Use none() as placeholder in characteristic predicates
class MyPattern extends MethodCall {
  MyPattern() {
    // TODO: Implement - check for methods named "targetMethod"
    // Hint: Use this.getMethod().hasName(...)
    none()
  }
}
```

- **Include TODO comments** with specific hints
- **Reference AST class names** students should look for
- **Build incrementally** - each exercise should build on the previous
- **Test both exercises and solutions** to ensure expected files are accurate

See the `create-codeql-query-development-workshop` skill for complete workshop creation guidance.

## Related Resources

- **Basic TDD**: `codeql://prompts/ql-tdd-basic`
- **AST Reference**: `codeql://languages/{language}/ast`
- **Security Patterns**: `codeql://languages/{language}/security`
- **Performance Guide**: `codeql://patterns/performance`
- **Workshop Skill**: `.github/skills/create-codeql-query-development-workshop/SKILL.md`
- **Tools Validation**: `.github/skills/validate-ql-mcp-server-tools-queries/SKILL.md`
