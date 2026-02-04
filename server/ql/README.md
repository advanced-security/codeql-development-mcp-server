# CodeQL Language Query Structure

This directory contains language-specific CodeQL queries -- organized by programming `<language>` -- used in the implementation and/or testing of (CodeQL) MCP server tools.

Each `<language>` subdirectory is expected to follow a standardized structure to ensure consistency and maintainability, though there is flexibility to accommodate different subsets of queries and/or tests for each code `<language>`.

## Directory Structure

Each subdirectory of the `server/ql/<language>/` must implement the following structure:

```text
server/ql/<language>/
├── tools/
│   ├── src/
│   │   └── <query-name>.ql          # Query implementation files
│   └── test/
│       ├── codeql-pack.yml          # Test pack configuration
│       ├── codeql-pack.lock.yml     # Lock file for dependencies
│       └── <query-name>/            # Test directory for each query
│           ├── <query-name>.qlref   # Reference to the query being tested
│           ├── <query-name>.expected # Expected test output
│           ├── <test-files>         # Test source code files
│           └── <query-name>.testproj/ # Optional test project directory
```

## Language Support

Currently supported languages:

- `actions/` - GitHub Actions workflows
- `cpp/` - C/C++
- `csharp/` - C#
- `go/` - Go
- `java/` - Java
- `javascript/` - JavaScript/TypeScript
- `python/` - Python
- `ruby/` - Ruby
- `swift/` - Swift

## Testing

The `server/scripts/run-query-unit-tests.sh` script automatically discovers and tests all language directories that follow this structure. It will:

- Iterate through all subdirectories in `server/ql/`
- Look for a `tools/` directory in each language
- Run `codeql test run` on the `tools/test/` directory
- Count and report the number of `.qlref` files found

No manual configuration is required when adding new languages - the test script will automatically include them.

## Best Practices

- **Consistent naming**: Use descriptive names for queries that reflect their purpose
- **Comprehensive testing**: Each query should have corresponding test cases
- **Documentation**: Include comments in query files explaining their purpose and usage
- **Test coverage**: Ensure test cases cover edge cases and expected behaviors
- **Pack configuration**: Maintain proper `codeql-pack.yml` files for dependency management
