# Workshop Structure Reference

This document provides a comprehensive reference for the standard CodeQL query development workshop structure.

## Overview

The standard workshop format is language-agnostic and consists of:

- **Exercises**: Incomplete query implementations for students to complete
- **Solutions**: Complete, validated query implementations
- **Tests**: Unit tests that validate both exercises and solutions
- **Graphs**: AST/CFG visualizations to aid understanding
- **Build scripts**: Automation for database creation
- **Documentation**: Setup and learning instructions

## Directory Structure

```
<workshop_dir>/
├── README.md                    # Workshop documentation
├── codeql-workspace.yml         # Workspace configuration
├── build-databases.sh           # Database build automation
│
├── exercises/                   # Student queries (incomplete)
│   ├── codeql-pack.yml         # CodeQL pack configuration
│   ├── Exercise1.ql            # First stage query
│   ├── Exercise2.ql            # Second stage query
│   └── ...                     # Additional stages
│
├── exercises-tests/             # Tests for student queries
│   ├── Exercise1/              # Test directory for Exercise1
│   │   ├── Exercise1.qlref    # Reference to exercise query
│   │   ├── Exercise1.expected # Expected results
│   │   └── test.{ext}         # Test source code
│   ├── Exercise2/              # Test directory for Exercise2
│   │   ├── Exercise2.qlref
│   │   ├── Exercise2.expected
│   │   └── test.{ext}
│   └── ...                     # Additional test directories
│
├── solutions/                   # Reference implementations
│   ├── codeql-pack.yml         # CodeQL pack configuration
│   ├── Exercise1.ql            # Complete Exercise1 solution
│   ├── Exercise2.ql            # Complete Exercise2 solution
│   └── ...                     # Additional solutions
│
├── solutions-tests/             # Tests for solutions
│   ├── Exercise1/              # Test directory structure
│   │   ├── Exercise1.qlref    # Reference to solution query
│   │   ├── Exercise1.expected # Expected results
│   │   └── test.{ext}         # Test source code
│   ├── Exercise2/
│   │   ├── Exercise2.qlref
│   │   ├── Exercise2.expected
│   │   └── test.{ext}
│   └── ...
│
├── graphs/                      # AST/CFG visualizations
│   ├── Exercise1-ast.txt       # AST for Exercise1 test code
│   ├── Exercise1-cfg.txt       # CFG for Exercise1 test code
│   ├── Exercise2-ast.txt
│   ├── Exercise2-cfg.txt
│   └── ...
│
└── tests-common/                # Shared test resources
    ├── codeql-pack.yml         # Pack configuration
    ├── test.{ext}              # Common test source code
    ├── test.testproj/          # Shared test database (generated)
    └── ...                     # Additional shared resources
```

## File Naming Conventions

### Query Files

- **Exercise queries**: `Exercise{N}.ql` where N is the stage number (1-based)
- **Solution queries**: Must match exercise names exactly (`Exercise1.ql` ↔ `Exercise1.ql`)

### Test Directories

- **Test directories**: `Exercise{N}/` matching query names
- **One test directory per exercise/solution**

### Test Files

- **Query reference**: `{QueryName}.qlref` (e.g., `Exercise1.qlref`)
- **Expected results**: `{QueryName}.expected` (e.g., `Exercise1.expected`)
- **Test source code**: `test.{ext}` or `Example1.{ext}`, `Example2.{ext}`, etc.

Extensions by language:

- C/C++: `.c`, `.cpp`, `.h`, `.hpp`
- C#: `.cs`
- Go: `.go`
- Java: `.java`
- JavaScript/TypeScript: `.js`, `.ts`
- Python: `.py`
- Ruby: `.rb`

### Graph Files

- **AST graphs**: `Exercise{N}-ast.txt`
- **CFG graphs**: `Exercise{N}-cfg.txt`

## File Formats

### codeql-pack.yml

CodeQL pack configuration requires separate packs for queries and tests. Pack names should be unique and descriptive (e.g., prefixed with workshop name).

**Query packs** (exercises/ and solutions/):

```yaml
name: {workshop-name}-exercises # or "{workshop-name}-solutions"
version: 0.0.1
library: false
dependencies:
  codeql/{language}-all: '*' # e.g., codeql/cpp-all, codeql/java-all
```

**Test packs** (exercises-tests/ and solutions-tests/):

Test packs must include `extractor` field and depend on the corresponding query pack:

```yaml
name: {workshop-name}-exercises-tests # or "{workshop-name}-solutions-tests"
version: 0.0.1
dependencies:
  {workshop-name}-exercises: '*' # Reference to query pack
extractor: {language} # e.g., java, cpp, python
```

**Common test utilities** (tests-common/):

```yaml
name: {workshop-name}-tests-common
version: 0.0.1
library: false
```

### .qlref Files

Query reference files contain a single line with the relative path to the query from the query pack root:

```
Exercise1.ql
```

The path is relative to the query pack root directory (exercises/ or solutions/).

### .expected Files

Expected results in CodeQL test format:

```
| file     | line | col | endLine | endCol | message                  |
| test.cpp | 10   | 5   | 10      | 12     | Potential null pointer   |
| test.cpp | 25   | 8   | 25      | 15     | Unchecked array access   |
```

Columns:

- `file`: Test source file name (relative to test directory)
- `line`: Starting line number (1-based)
- `col`: Starting column number (1-based)
- `endLine`: Ending line number
- `endCol`: Ending column number
- `message`: Query result message

### codeql-workspace.yml

Workspace configuration:

```yaml
provide:
  - '*/codeql-pack.yml'
```

Or more explicitly:

```yaml
provide:
  - 'exercises/codeql-pack.yml'
  - 'solutions/codeql-pack.yml'
  - 'exercises-tests/codeql-pack.yml'
  - 'solutions-tests/codeql-pack.yml'
  - 'tests-common/codeql-pack.yml'
```

## Test Database Structure

Test databases are automatically created in test directories:

```
exercises-tests/Exercise1/
├── Exercise1.qlref
├── Exercise1.expected
├── test.cpp                    # Test source code
└── Exercise1.testproj/         # Generated test database
    ├── codeql-database.yml
    ├── db-cpp/
    └── ...
```

### Database Naming

Test database directory name: `{QueryName}.testproj`

For `Exercise1.qlref`, the database is `Exercise1.testproj`.

## Test Code Organization

### Single File Tests

Simple workshops may use a single test file:

```
exercises-tests/Exercise1/
├── Exercise1.qlref
├── Exercise1.expected
└── test.cpp
```

### Multi-File Tests

Complex scenarios may require multiple files:

```
exercises-tests/Exercise1/
├── Exercise1.qlref
├── Exercise1.expected
├── Example1.cpp
├── Example2.cpp
└── test.h
```

### Shared Test Code

When all exercises use the same test code:

```
tests-common/
├── codeql-pack.yml
├── test.cpp              # Shared test source
└── test.testproj/        # Shared database (if created)
```

Reference from test directories using symlinks or by building databases that reference tests-common.

## Graph Output Structure

### AST Graphs

Generated by running `PrintAST.ql` against test database:

```
graphs/Exercise1-ast.txt
```

Content shows abstract syntax tree structure:

```
#10000=@"file://test.cpp:0:0:0:0" [loc](10000,{File},0)
#10001=@"loc:<unknown>" [loc](10001,{Location},0)
...
```

### CFG Graphs

Generated by running `PrintCFG.ql` against test database:

```
graphs/Exercise1-cfg.txt
```

Content shows control flow graph structure.

## Build Script Structure

### build-databases.sh Template

```bash
#!/bin/bash
set -e

# Get workshop root directory
WORKSHOP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Check we're in the right place
if [[ ! -f "${WORKSHOP_ROOT}/codeql-workspace.yml" ]]; then
    echo "Error: Must run from workshop root directory"
    exit 1
fi

echo "Building test databases for workshop..."

# Build test databases for exercises-tests
for test_dir in "${WORKSHOP_ROOT}/exercises-tests"/*/; do
    test_name=$(basename "${test_dir}")
    echo "Building database for exercises-tests/${test_name}..."

    # Extract database creates it automatically during test run
    # No manual database creation needed
done

# Build test databases for solutions-tests
for test_dir in "${WORKSHOP_ROOT}/solutions-tests"/*/; do
    test_name=$(basename "${test_dir}")
    echo "Building database for solutions-tests/${test_name}..."

    # Extract database creates it automatically during test run
done

echo "Build complete! Run tests with:"
echo "  codeql test run exercises-tests/"
echo "  codeql test run solutions-tests/"
```

Note: CodeQL test framework automatically creates test databases. Manual database creation is only needed for custom scenarios.

## Stage Progression

### Typical Stage Count

- **Simple workshops**: 3-5 stages
- **Moderate complexity**: 5-8 stages
- **Complex workshops**: 8-12 stages

### Stage Naming

Exercises are numbered sequentially: Exercise1, Exercise2, Exercise3, etc.

Missing numbers (e.g., Exercise6 missing) indicate optional or advanced stages.

### Stage Relationships

Each stage builds on previous stages:

```
Exercise1: Basic pattern matching
    ↓
Exercise2: Add type constraints
    ↓
Exercise3: Add control flow
    ↓
Exercise4: Add data flow
```

## Test Expectations by Stage

### Early Stages

- Fewer expected results
- Simpler patterns
- More false positives acceptable

Example:

```
| test.cpp | 10 | 5 | 10 | 12 | Array access |
| test.cpp | 25 | 8 | 25 | 15 | Array access |
```

### Later Stages

- More expected results
- Complex patterns
- Fewer false positives

Example:

```
| test.cpp | 10 | 5 | 10 | 12 | Unchecked array access |
```

### Final Stage

Should match production query behavior and expected results.

## Workshop Documentation

### README.md Sections

1. **Title and Description**: What the workshop teaches
2. **Prerequisites**: Required knowledge, tools, setup
3. **Setup Instructions**: Clone, install, build
4. **Learning Objectives**: What students will learn
5. **Workshop Structure**: Stage overview
6. **Usage Instructions**: How to work through exercises
7. **Validation**: How to test solutions
8. **Solutions**: Where to find references
9. **Troubleshooting**: Common issues
10. **Resources**: Additional learning materials

### Minimal README Template

````markdown
# Workshop Title

Brief description of what this workshop teaches.

## Prerequisites

- CodeQL CLI installed
- VS Code with CodeQL extension
- Basic knowledge of [language]
- Understanding of [concepts]

## Setup

1. Clone this repository
2. Install pack dependencies:
   \```bash
   codeql pack install exercises
   codeql pack install solutions
   \```
3. Build test databases:
   \```bash
   ./build-databases.sh
   \```

## Structure

- **Exercise1**: [Description]
- **Exercise2**: [Description]
- **Exercise3**: [Description]

## Usage

1. Open `exercises/Exercise1.ql`
2. Implement the TODO sections
3. Run tests: `codeql test run exercises-tests/Exercise1`
4. Check your results against `solutions/Exercise1.ql`

## Testing

Test your exercise implementations:
\```bash
codeql test run exercises-tests/
\```

Verify solutions pass:
\```bash
codeql test run solutions-tests/
\```

## Solutions

Reference implementations are in `solutions/` directory.
````

## Best Practices

### Consistency

- Use consistent naming across all stages
- Maintain parallel structure between exercises and solutions
- Keep test code consistent across stages when possible

### Clarity

- Add comments explaining what each exercise teaches
- Include hints in exercise queries
- Document expected learning outcomes

### Completeness

- Every solution must have passing tests
- Every exercise should have corresponding tests
- Include both positive and negative test cases

### Maintainability

- Version control all workshop materials
- Document any language-specific requirements
- Keep build scripts simple and portable

## Language-Specific Variations

### C/C++

```
tests-common/
├── test.c          # C test code
├── test.cpp        # C++ test code
└── test.h          # Shared header
```

Database creation may require build command:

```bash
codeql database create --language=cpp \
    --command="clang -fsyntax-only test.cpp"
```

### Java

```
tests-common/
└── com/example/
    └── Test.java
```

May require build tool (Maven, Gradle):

```bash
codeql database create --language=java \
    --command="mvn clean compile"
```

### JavaScript/TypeScript

```
tests-common/
├── test.js
└── test.ts
```

Usually no build command needed:

```bash
codeql database create --language=javascript
```

### Python

```
tests-common/
└── test.py
```

Usually no build command needed:

```bash
codeql database create --language=python
```

## Validation Checklist

- [ ] Directory structure matches standard format
- [ ] All required files present (README, codeql-workspace.yml, codeql-pack.yml files)
- [ ] Exercise queries have appropriate scaffolding
- [ ] Solution queries are complete and valid
- [ ] All .qlref files reference correct queries
- [ ] All .expected files have valid format
- [ ] Test code covers positive, negative, and edge cases
- [ ] Solution tests pass at 100%
- [ ] Build script successfully creates databases
- [ ] README provides clear instructions
- [ ] Graphs generated for relevant stages
- [ ] Consistent naming throughout

## Common Issues

### Test Database Not Created

Ensure test directory has:

- Correct .qlref file
- Test source code files
- Run `codeql test run` which auto-creates database

### Tests Fail

Check:

- Query compiles without errors
- Expected results format is correct
- Test code matches expected results
- Database was created successfully

### Missing Dependencies

Install dependencies:

```bash
codeql pack install exercises
codeql pack install solutions
```

### Wrong Test Results

Use `codeql test accept` to update expected results after validating actual results are correct:

```bash
codeql test accept exercises-tests/Exercise1
```

## References

- [CodeQL Testing Documentation](https://codeql.github.com/docs/codeql-cli/testing-custom-queries/)
- [CodeQL Pack Structure](https://codeql.github.com/docs/codeql-cli/creating-and-working-with-codeql-packs/)
- [Workshop Examples](./examples/)
