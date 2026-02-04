---
name: create-codeql-query-development-workshop
description: Create custom CodeQL query development workshops from production-grade queries. Use this skill to generate guided learning materials with exercises, solutions, and tests that teach developers how to build CodeQL queries incrementally.
---

# Create CodeQL Query Development Workshop

This skill guides you through creating custom CodeQL query development workshops from existing, production-grade CodeQL queries. The workshop format uses a test-driven, incremental learning approach where developers progress through stages from simple to complex.

## When to Use This Skill

- Creating training materials for CodeQL query development
- Teaching developers to build custom security or code quality queries
- Generating guided learning paths from existing query implementations
- Building workshops customized to specific business needs or code patterns

## Workshop Value Proposition

**Custom workshops are more effective than generic tutorials** because:

- Developers learn by building queries that actually matter to their work
- Real-world query patterns are more motivating than toy examples
- Teams can train developers on their specific security or quality concerns
- Workshops scale knowledge transfer from CodeQL experts to their teams

## Prerequisites

Before creating a workshop, ensure you have:

- An existing CodeQL query (`.ql` file) that is production-ready
- Passing unit tests for that query (`.expected` results that match actual results)
- Understanding of the query's purpose and complexity
- Access to CodeQL Development MCP Server tools

## CodeQL Pack Naming Convention

This repository uses `codeql-pack.yml` for new CodeQL pack configuration files and recommends it over `qlpack.yml`. While both `codeql-pack.yml` and `qlpack.yml` are equally supported by CodeQL, `codeql-pack.yml` is preferred as it aligns with the `codeql-pack.lock.yml` naming convention used by `codeql pack install`. If you encounter references to `qlpack.yml` in this workshop or related materials, treat them as equivalent to `codeql-pack.yml`, with `codeql-pack.yml` as the recommended name for new packs.

## Required Inputs

When invoking this skill, you must provide:

1. **Source Query Path**: Full path to the production query `.ql` file
2. **Source Query Tests Path**: Full path to the directory containing unit tests for the query
3. **Base Directory**: Path where the workshop directory will be created (e.g., `/tmp/workshops` or `<your-repo>/workshops`)
4. **Workshop Name**: Name for the workshop directory (e.g., `dataflow-analysis-cpp`)

## Workshop Output Structure

The skill creates a complete workshop under `<base_dir>/<workshop_name>/`:

```
<base_dir>/<workshop_name>/
├── README.md                    # Workshop overview and setup instructions
├── codeql-workspace.yml         # CodeQL workspace configuration
├── build-databases.sh           # Script to create test databases
├── exercises/                   # Student exercise queries (incomplete)
│   ├── codeql-pack.yml         # Query pack config
│   ├── Exercise1.ql
│   ├── Exercise2.ql
│   └── ...
├── exercises-tests/             # Unit tests for exercises
│   ├── codeql-pack.yml         # Test pack config (with extractor + dependency on exercises)
│   ├── Exercise1/
│   │   ├── Exercise1.qlref
│   │   ├── Exercise1.expected
│   │   └── test.{ext}
│   └── ...
├── solutions/                   # Complete solution queries
│   ├── codeql-pack.yml         # Query pack config
│   ├── Exercise1.ql
│   ├── Exercise2.ql
│   └── ...
├── solutions-tests/             # Unit tests for solutions
│   ├── codeql-pack.yml         # Test pack config (with extractor + dependency on solutions)
│   ├── Exercise1/
│   │   ├── Exercise1.qlref
│   │   ├── Exercise1.expected
│   │   └── test.{ext}
│   └── ...
├── graphs/                      # AST/CFG visualizations
│   ├── Exercise1-ast.txt
│   ├── Exercise1-cfg.txt
│   └── ...
└── tests-common/                # Shared test code and databases
    ├── test.{ext}
    └── codeql-pack.yml
```

See [workshop-structure-reference.md](./workshop-structure-reference.md) for detailed structure documentation.

## Workflow Overview

The workshop creation process follows these phases:

### Phase 1: Analysis

1. **Analyze Source Query** using `find_codeql_query_files` and `explain_codeql_query`
2. **Identify Complexity** to determine number of stages
3. **Extract Test Cases** from existing unit tests
4. **Plan Stages** breaking query from simple to complex

### Phase 2: Decomposition

Working backwards from the complete query:

1. **Identify Decomposition Points** (predicates, logic blocks, complexity layers)
2. **Define Stage Goals** (what each exercise teaches)
3. **Create Stage Order** (simple to complex progression)

### Phase 3: Generation

For each stage (starting with final/complete stage):

1. **Generate Solution Query** for this stage
2. **Create Solution Tests** that validate the solution
3. **Run Tests** using `codeql_test_run` to ensure they pass
4. **Generate Exercise Query** by removing implementation details
5. **Create Exercise Tests** (may match solution tests or be subset)

### Phase 4: Enrichment

1. **Generate Graph Outputs** (AST/CFG) for each stage using `codeql_bqrs_interpret`
2. **Create build-databases.sh** script for test database creation
3. **Write README.md** with workshop overview, setup, and instructions
4. **Create codeql-workspace.yml** to configure CodeQL workspace

### Phase 5: Validation

1. **Test All Solutions** run `codeql_test_run` on solutions-tests/
2. **Verify Test Pass Rate** ensure 100% pass rate for solutions
3. **Check File Structure** validate all required files exist
4. **Review Exercise Gaps** ensure exercises have appropriate scaffolding

## Key MCP Server Tools

### Query Analysis

- `find_codeql_query_files` - Locate query files and dependencies
- `explain_codeql_query` - Understand query purpose and logic
- `codeql_resolve_metadata` - Extract query metadata

### Test Management

- `codeql_test_extract` - Create test databases from test code
- `codeql_test_run` - Execute tests and validate results
- `codeql_test_accept` - Update expected results when needed

### Query Execution

- `codeql_query_run` - Run queries (including PrintAST, PrintCFG)
- `codeql_query_compile` - Validate query syntax
- `codeql_bqrs_interpret` - Generate graph outputs from results

### Database Operations

- `codeql_database_create` - Create CodeQL databases from source
- `codeql_resolve_database` - Validate database structure

See [mcp-tools-reference.md](./mcp-tools-reference.md) for detailed tool usage patterns.

## Stage Decomposition Strategy

When decomposing a complex query into stages, consider these patterns:

### Pattern 1: Syntactic to Semantic

1. **Stage 1**: Find syntactic elements (e.g., `ArrayExpr`)
2. **Stage 2**: Add type constraints (e.g., specific array types)
3. **Stage 3**: Add semantic analysis (e.g., control flow)
4. **Stage 4**: Add data flow analysis (e.g., track values)

### Pattern 2: Local to Global

1. **Stage 1**: Local pattern matching
2. **Stage 2**: Add local control flow
3. **Stage 3**: Add local data flow
4. **Stage 4**: Add global data flow

### Pattern 3: Simple to Filtered

1. **Stage 1**: Find all candidates (high recall, low precision)
2. **Stage 2**: Add basic filtering
3. **Stage 3**: Add context-aware filtering
4. **Stage 4**: Eliminate false positives

### Pattern 4: Building Blocks

1. **Stage 1**: Define helper predicates
2. **Stage 2**: Combine helpers into sources
3. **Stage 3**: Define sinks
4. **Stage 4**: Connect sources to sinks with data flow

## Exercise Creation Guidelines

### What to Remove from Solutions

When creating exercises from solutions:

- **Implementation bodies**: Leave predicate signatures with `none()` body
- **Complex logic**: Replace with `// TODO: Implement` comments
- **Data flow configs**: Provide signature, remove implementation
- **Filter predicates**: Keep structure, remove conditions

### What to Keep in Exercises

- **Import statements**: All imports should be present
- **Type signatures**: Full type information for predicates
- **Comments**: Helpful hints about what to implement
- **Test scaffolding**: Basic structure to guide implementation

### Hints and Documentation

Add inline comments to guide students:

```ql
/**
 * Find all array expressions that access a specific type.
 *
 * Hint: Use `.getArrayBase().getType()` to get the base type.
 */
predicate isTargetArrayAccess(ArrayExpr array) {
  // TODO: Implement type checking
  none()
}
```

## Test Creation Guidelines

### Test Code Patterns

Create test code (`test.{ext}`) that includes:

1. **Positive cases**: Code patterns the query should detect
2. **Negative cases**: Similar code that should NOT be detected
3. **Edge cases**: Boundary conditions
4. **Comments**: Explain what each test case validates

Example for C++:

```cpp
// POSITIVE CASE: Null pointer dereference
void unsafeFunction() {
    int* ptr = nullptr;
    *ptr = 42;  // Should be detected
}

// NEGATIVE CASE: Checked before use
void safeFunction() {
    int* ptr = nullptr;
    if (ptr != nullptr) {
        *ptr = 42;  // Should NOT be detected
    }
}

// EDGE CASE: Pointer in complex expression
void edgeCase() {
    int* ptr = nullptr;
    int result = ptr ? *ptr : 0;  // Should be detected
}
```

### Expected Results Format

The `.expected` file uses CodeQL test format:

```
| file    | line | col | endLine | endCol | message                |
| test.cpp | 3    | 5   | 3       | 8      | Null pointer dereference |
| test.cpp | 18   | 17  | 18      | 20     | Null pointer dereference |
```

### Test Progression

- **Early stages**: Fewer expected results (simpler queries)
- **Later stages**: More expected results (more comprehensive)
- **Final stage**: Should match production query expected results

## Graph Generation

Generate visual aids for understanding code structure:

### PrintAST Graphs

Show Abstract Syntax Tree structure:

```json
{
  "queryName": "PrintAST",
  "queryLanguage": "cpp",
  "database": "tests-common/test.testproj",
  "outputFormat": "graphtext"
}
```

Use `codeql_bqrs_interpret` to create `graphs/Exercise1-ast.txt`.

### PrintCFG Graphs

Show Control Flow Graph:

```json
{
  "queryName": "PrintCFG",
  "queryLanguage": "cpp",
  "database": "tests-common/test.testproj",
  "outputFormat": "graphtext"
}
```

Use `codeql_bqrs_interpret` to create `graphs/Exercise1-cfg.txt`.

## Build Scripts

### build-databases.sh Template

```bash
#!/bin/bash
set -e

WORKSHOP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_SOURCE="${WORKSHOP_ROOT}/tests-common"

echo "Building test databases..."

# For each test database needed
for db_name in test1 test2; do
    DB_PATH="${WORKSHOP_ROOT}/tests-common/${db_name}.testproj"

    echo "Creating database: ${db_name}"
    rm -rf "${DB_PATH}"

    codeql database create \
        --language={language} \
        --source-root="${TEST_SOURCE}" \
        "${DB_PATH}" \
        --command="clang -fsyntax-only ${TEST_SOURCE}/${db_name}.c"
done

echo "Database creation complete!"
```

### codeql-workspace.yml Template

```yaml
provide:
  - '*/codeql-pack.yml'
```

This makes all codeql-pack.yml files available in the workspace.

## Workshop README Template

The generated README.md should include:

1. **Title and Overview**: What the workshop teaches
2. **Prerequisites**: Required knowledge and tools
3. **Setup Instructions**: How to clone, install dependencies, build databases
4. **Workshop Structure**: Overview of exercise progression
5. **How to Use**: Instructions for working through exercises
6. **Validation**: How to test exercise solutions
7. **Solutions**: Where to find reference solutions
8. **Additional Resources**: Links to CodeQL documentation

See [example workshop READMEs](./examples/) for templates.

## Language-Specific Considerations

### File Extensions by Language

- **C/C++**: `.c`, `.cpp`, `.h`, `.hpp`
- **C#**: `.cs`
- **Go**: `.go`
- **Java**: `.java`
- **JavaScript/TypeScript**: `.js`, `.ts`
- **Python**: `.py`
- **Ruby**: `.rb`

### Test Database Creation

Language-specific database creation varies:

- **C/C++**: Requires build command (e.g., `clang -fsyntax-only`)
- **Java**: Requires build tool (e.g., `mvn clean install`)
- **JavaScript**: Usually no build command needed
- **Python**: Usually no build command needed

Adjust `build-databases.sh` accordingly.

### Library Dependencies

Include appropriate CodeQL libraries in `codeql-pack.yml`:

- **C/C++**: `codeql/cpp-all`
- **C#**: `codeql/csharp-all`
- **Go**: `codeql/go-all`
- **Java**: `codeql/java-all`
- **JavaScript/TypeScript**: `codeql/javascript-all`
- **Python**: `codeql/python-all`
- **Ruby**: `codeql/ruby-all`

### Java-Specific API Notes

When writing Java queries, note these API patterns:

- **Primitive Types**: No `ByteType` class exists. Use `PrimitiveType` with `.getName() = "byte"`, e.g.: `ace.getType().(Array).getElementType().(PrimitiveType).getName() = "byte"`
- **Array Initializers**: No `hasInit()` method. Use `exists(ace.getInit())` to check for initializers
- **Method Calls**: No `MethodAccess` class. Use `MethodCall` for method invocations
- **Deduplication**: When matching both `ArrayCreationExpr` and `ArrayInit`, exclude `ArrayInit` that are part of `ArrayCreationExpr` to avoid duplicate results: `not exists(ArrayCreationExpr ace | ace.getInit() = ai)`

## Validation Checklist

Before considering the workshop complete:

- [ ] All solution queries compile without errors
- [ ] All solution tests pass at 100%
- [ ] Exercise queries have appropriate scaffolding (not empty, not complete)
- [ ] Expected results progress logically from stage to stage
- [ ] Test code covers positive, negative, and edge cases
- [ ] Graph outputs exist for stages where helpful
- [ ] build-databases.sh successfully creates all needed databases
- [ ] README.md provides clear setup and usage instructions
- [ ] codeql-workspace.yml correctly references all codeql-pack.yml files

## Common Pitfalls

### Avoid These Mistakes

1. **Too many stages**: Keep to 4-8 stages max; too many fragments the learning
2. **Too few stages**: 1-2 stages don't provide enough incremental learning
3. **Uneven difficulty**: Each stage should add similar complexity increments
4. **Missing test cases**: Every query behavior should have test coverage
5. **Incomplete exercises**: Exercises should have enough scaffolding to guide students
6. **Overly complete exercises**: Don't give away the solution in exercise code
7. **Inconsistent test results**: Solution tests must pass reliably

## Example Workshops

This skill can be used with CodeQL queries from any repository. To see example workshops created with this skill, refer to workshop repositories that demonstrate the standard format and structure.

## Reference Materials

For detailed guidance:

- [Workshop Structure Reference](./workshop-structure-reference.md) - Complete structure specification
- [MCP Tools Reference](./mcp-tools-reference.md) - Tool usage patterns for workshop creation
- [Stage Decomposition Examples](./stage-decomposition-examples.md) - Patterns for breaking down queries

## Working Workshop Examples

- [Example C++ Simple](./examples/example-cpp-simple/) - Basic C++ null pointer dereference workshop structure

Some workshops may have optional advanced branches:

```
├── exercises/
│   ├── Exercise1.ql
│   ├── Exercise2.ql
│   ├── Exercise3.ql
│   ├── Exercise4-basic.ql
│   └── Exercise4-advanced.ql
```

### Multiple Learning Paths

Consider creating workshops with different focuses from the same source query:

- **Path A**: Focus on syntactic analysis
- **Path B**: Focus on data flow
- **Path C**: Focus on false positive elimination

### Difficulty Levels

Add difficulty metadata to exercises:

```ql
/**
 * @name Find Array Access
 * @description Identify array expressions
 * @kind problem
 * @difficulty beginner
 * @exercise 1
 */
```

## Troubleshooting

### Solution Tests Fail

If solution tests don't pass:

1. Run `codeql_test_run` with verbose output
2. Compare actual vs expected results
3. Verify test database was created correctly
4. Check query logic matches intended behavior
5. Use `codeql_test_accept` to update `.expected` if needed

### Exercise Too Difficult

If students can't complete an exercise:

1. Add more scaffolding in the exercise query
2. Add more detailed hints in comments
3. Consider splitting into two stages
4. Provide more example patterns in test code

### Query Doesn't Compile

If generated queries have compilation errors:

1. Run `codeql_query_compile` to see specific errors
2. Check import statements are correct
3. Verify qlpack dependencies are installed
4. Ensure predicate signatures are valid

## Tips for Success

1. **Start simple**: First workshop should be straightforward
2. **Test frequently**: Run tests after creating each stage
3. **Iterate on stages**: Refine stage boundaries based on testing
4. **Get feedback**: Have someone unfamiliar try the workshop
5. **Document well**: Clear instructions reduce support burden
6. **Version control**: Track workshop iterations in git
7. **Reuse test code**: Same test code across all stages when possible

## Related Skills

- [create-codeql-query-tdd-generic](../create-codeql-query-tdd-generic/SKILL.md) - TDD approach to query development
- [create-codeql-query-unit-test-cpp](../create-codeql-query-unit-test-cpp/SKILL.md) - Creating C++ query tests
- [create-codeql-query-unit-test-java](../create-codeql-query-unit-test-java/SKILL.md) - Creating Java query tests
- [create-codeql-query-unit-test-javascript](../create-codeql-query-unit-test-javascript/SKILL.md) - Creating JavaScript query tests
- [create-codeql-query-unit-test-python](../create-codeql-query-unit-test-python/SKILL.md) - Creating Python query tests

## Success Metrics

A successful workshop:

- **Completable**: Students can finish with provided guidance
- **Educational**: Each stage teaches a new concept
- **Validated**: All tests pass reliably
- **Practical**: Query addresses real-world concerns
- **Scalable**: Can be delivered to multiple teams
