# Workshop Examples

This directory contains example workshops demonstrating the standard workshop structure.

## Available Examples

### [example-cpp-simple](./example-cpp-simple/)

**Language**: C++  
**Topic**: Null Pointer Dereferences  
**Complexity**: Beginner  
**Stages**: 3

A minimal workshop teaching basic CodeQL concepts:

- Pattern matching (finding expressions)
- Value constraints (identifying null literals)
- Local data flow analysis

Perfect for understanding the standard workshop structure.

## Using These Examples

### As Learning Material

Study these examples to understand:

- Directory structure and file organization
- Query progression from simple to complex
- Test file formats and expected results
- Documentation patterns

### As Templates

Copy and adapt these examples:

```bash
cp -r example-cpp-simple /path/to/new-workshop
cd /path/to/new-workshop
# Modify queries, tests, and documentation
```

### As Validation

Use these to test the MCP server tools:

```bash
# Test solutions
codeql test run example-cpp-simple/solutions-tests/

# Compile exercises
codeql query compile example-cpp-simple/exercises/Exercise1.ql
```

## Example Characteristics

### example-cpp-simple

**Structure**:

- 3 exercises (Exercise1, Exercise2, Exercise3)
- Shared test code in tests-common/
- Minimal dependencies (only codeql/cpp-all)
- No graphs/ content (not needed for simple queries)

**Decomposition Pattern**: Building Blocks

- Stage 1: Find component A (dereferences)
- Stage 2: Find component B (null literals)
- Stage 3: Connect A and B (data flow)

**Key Files**:

- `exercises/Exercise1.ql` - Incomplete query with TODOs
- `solutions/Exercise1.ql` - Complete implementation
- `exercises-tests/Exercise1/Exercise1.expected` - Expected results
- `tests-common/test.cpp` - Shared test code

## Creating Your Own Examples

When creating example workshops for this skill:

1. **Keep them simple**: Examples should be educational, not comprehensive
2. **One language each**: Don't try to demonstrate all languages in one example
3. **Different patterns**: Each example should demonstrate different decomposition patterns
4. **Complete and tested**: All solutions should pass tests
5. **Well-documented**: README should explain the learning progression

## Potential Future Examples

Additional examples that could be added:

- **example-java-simple**: SQL injection with taint tracking
- **example-javascript-simple**: XSS with client-side sources
- **example-python-simple**: Command injection
- **example-go-simple**: Race conditions
- **example-csharp-simple**: Resource leaks

Each would demonstrate different:

- Language-specific patterns
- Decomposition strategies
- Complexity levels
- CodeQL features

## Contributing Examples

When contributing new example workshops:

1. Follow the standard structure
2. Test thoroughly (100% passing solutions)
3. Document the learning progression
4. Keep it focused and simple
5. Add entry to this README
