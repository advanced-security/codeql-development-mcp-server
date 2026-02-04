# Example C++ Workshop: Find Null Pointer Dereferences

This is a minimal example workshop demonstrating the standard workshop structure for teaching CodeQL query development.

## Learning Objectives

Students will learn to:

1. Find pointer dereference expressions
2. Identify null pointer literals
3. Use local data flow to connect sources to sinks
4. Filter out safe dereferences with null checks

## Prerequisites

- CodeQL CLI installed
- VS Code with CodeQL extension
- Basic C++ knowledge
- Understanding of pointers and null values

## Setup

1. Install pack dependencies:

   ```bash
   codeql pack install exercises
   codeql pack install solutions
   ```

2. Build test databases:
   ```bash
   ./build-databases.sh
   ```

## Workshop Structure

### Exercise 1: Find Pointer Dereferences

**Goal**: Identify all pointer dereference expressions in the code.

**Concepts**: `PointerDereferenceExpr`, basic pattern matching

**Hint**: Look for expressions that dereference a pointer using `*` or `->`

### Exercise 2: Find Null Literals

**Goal**: Identify null pointer literals (`nullptr`, `NULL`, `0`).

**Concepts**: `Literal`, null pointer values

**Hint**: Check for null literal values

### Exercise 3: Connect with Local Data Flow

**Goal**: Find dereferences where the pointer comes from a null literal using local data flow.

**Concepts**: `DataFlow::localFlow`, sources, sinks

**Hint**: Define a data flow source (null literal) and sink (dereference)

## Usage

1. Open `exercises/Exercise1.ql`
2. Implement the TODO sections
3. Run tests: `codeql test run exercises-tests/Exercise1`
4. Compare with `solutions/Exercise1.ql`
5. Move to Exercise 2

## Testing Your Solutions

Test exercises:

```bash
codeql test run exercises-tests/
```

Verify solutions:

```bash
codeql test run solutions-tests/
```

## Solutions

Reference implementations are in the `solutions/` directory. Try to complete each exercise before checking the solution.

## Files

- `exercises/` - Exercise queries to complete
- `exercises-tests/` - Tests for exercises
- `solutions/` - Complete reference solutions
- `solutions-tests/` - Tests for solutions (should pass 100%)
- `graphs/` - AST/CFG visualizations
- `tests-common/` - Shared test code

## Expected Progress

After completing this workshop, you should understand:

- How to find specific C++ expressions
- How to identify null pointer values
- How to use local data flow analysis
- Basic CodeQL query patterns for C++
