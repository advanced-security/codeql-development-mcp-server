# `client/integration-tests/README.md`

## Structure of Integration Tests

Integration tests for the MCP server primitives are expected to be organized in a specific directory structure, as shown below.

```text
client/integration-tests/
├── README.md                  # This README file
└── primitives                 # Directory containing integration tests for MCP server primitives
    └── tools                  # Base directory for integration tests of MCP server tools
        ├── <tool_name_1>      # Base directory for `tool_name_1` integration tests
        │   ├── <test_name_1>  # Directory for a specific test case for `tool_name_1`
        │   │   ├── README.md  # Optional: README for this specific test case
        │   │   ├── before     # "before" state subdirectory for `tool_name_1/test_name_1`
        │   │   │   ├── file1.ext           # Modified files (only if changed by tool)
        │   │   │   └── monitoring-state.json  # Optional: monitoring state before tool execution
        │   │   └── after      # "after" state subdirectory for `tool_name_1/test_name_1`
        │   │       ├── file1.ext           # Expected modified files (only if changed by tool)
        │   │       └── monitoring-state.json  # Optional: expected monitoring state after tool execution
        │   └── <test_name_2>  # Another test case for `tool_name_1`
        └── <tool_name_2>      # Base directory for `tool_name_2` integration tests
            └── <test_name_1>  # Directory for a specific test case for `tool_name_2`
                ├── before     # "before" state subdirectory for `tool_name_2/test_name_1`
                └── after      # "after" state subdirectory for `tool_name_2/test_name_1`
```

## Requirements for Integration Tests

Each integration test must define `before` and `after` files for `monitoring-state.json` and should, when possible, also define `before` and `after` files for any content provided as input (before) and/or generated as output (after) by calling the MCP server primitive (e.g. tool) under test.

## ⚠️ CRITICAL: File Placement Guidelines

**NEVER commit integration test output files to the repository root directory!**

Common mistakes to avoid:

- ❌ **DO NOT** commit files like `evaluator-log.json`, `query-results.bqrs`, `*.bqrs` files to the repository root
- ❌ **DO NOT** commit temporary files created during integration test development to the repository root
- ✅ **DO** place all test output files in the appropriate `client/integration-tests/primitives/tools/<tool_name>/<test_name>/after/` directory
- ✅ **DO** use `{{tmpdir}}` as a placeholder for the project-local temporary directory in test fixture paths (resolved at runtime to `<repoRoot>/.tmp/`)

**File generation best practices:**

1. **Generate test files correctly**: When creating integration tests that involve file generation (e.g., BQRS files, evaluator logs):
   - Run the actual tool command to generate authentic files
   - Copy the generated files from their temporary location to the correct `after/` directory
   - Never fabricate or "make up" binary file contents
2. **Use proper paths**: Always use `{{tmpdir}}/` as a placeholder for the project-local temp directory in test fixture JSON files (e.g., `"output": "{{tmpdir}}/results.sarif"`). This resolves at runtime to `<repoRoot>/.tmp/`, **not** the OS temp directory, to avoid CWE-377/CWE-378 (world-readable temp files).
3. **Verify placement**: Before committing, verify that generated files are in the correct `after/` directory, not in the repository root

The `.gitignore` file has been updated to help prevent accidental commits of common integration test output files in the root directory.

### Integration Test Documentation

Each test directory (e.g., `client/integration-tests/primitives/tools/<tool_name>/<test_name>/`) should ideally contain a `README.md` file that describes:

- PURPOSE of the integration test
- INPUTS (static, before, or other files) used by the integration test
- OUTPUTS expected to be created or modified by the integration test

**DO NOT** put `README.md` files in any "before" or "after" subdirectories unless they are specifically used as input or output files for the MCP server primitive under test.

### Static Directory Usage

Static test files are organized under `server/ql/<language>/examples/` directories instead of the previous `client/integration-tests/static/` structure. This provides better organization and colocation of test resources with their respective language implementations.

- **Language-specific directories**: Organized under `server/ql/<language>/examples/` (e.g., `server/ql/javascript/examples/`, `server/ql/python/examples/`)
- **Source code and queries**: Located in `server/ql/<language>/examples/src/` for CodeQL queries, library files, and related resources
- **Test databases and code**: Located in `server/ql/<language>/examples/test/` for test databases, test source code, and test configurations
- **Usage in tests**: Integration tests should reference static files by their absolute paths rather than duplicating them in `before/` and `after/` directories

### When to use static files vs. before/after files

- **Static files**: Use for input files that are **not modified** by the tool (query files, test databases, reference code, source `.bqrs` files)
- **Before/After files**: Use only for files that are **created or modified** by the tool being tested

Examples:

- `codeql_query_run` tool: Use static query files and databases as inputs, create result files in `after/`
- `codeql_bqrs_decode` tool: Use static BQRS files as inputs, create decoded output files in `after/`
- `codeql_query_format` tool: Use static unformatted query files in `before/`, expect formatted versions in `after/`

### Integration Tests with `before/monitoring-state.json` and `after/monitoring-state.json` files

All integration tests are required to provide `before` and `after` versions of a `monitoring-state.json` file.

- **Integration Pattern**: Add `monitoring-state.json` files to the existing `before/` and `after/` directories for any tool test case.
- **Before File Location**: `client/integration-tests/primitives/tools/<tool_name>/<test_case>/before/monitoring-state.json`.
- **After File Location**: `client/integration-tests/primitives/tools/<tool_name>/<test_case>/after/monitoring-state.json`.
- **Before Purpose**: The `before/monitoring-state.json` represents the initial monitoring state (usually empty sessions array).
- **After Purpose**: The `after/monitoring-state.json` represents the expected monitoring state after executing the tool, where we would always expect to see our MCP server track at least one call (from the integration test client) for the MCP primitive (endpoint) under test.

### Integration Tests with additional `before` and `after` files

Integration tests should, when possible, also define `before` and `after` files for any content provided as input (before) and/or generated as output (after) for the MCP server primitive (e.g. tool) under test.

- Test names should be short and minimally descriptive, using under_scores to separate words (e.g., `test_name_1`).
- Each tool must have its own directory under `client/integration-tests/primitives/tools/`.
- Each test case for a tool must have its own subdirectory (under that tool's directory) containing `before` and `after` states.
- Each file in `before` must have a corresponding file (with the same name) in `after`, representing the expected state after the tool is executed. Other than the names matching between `before` and `after`, there are no restrictions on the actual file names or extensions.
- If a file is used as an input but is not modified by the MCP server tool under test, then `ex_tool/ex_test/before/example_file.ex` should have identical contents to `ex_tool/ex_test/after/example_file.ex`.
- If possible, avoid putting binary files (e.g., images, compiled files) in the `before` or `after` directories; text-based files are preferred as they ensure diffability and version control friendliness, but there are a limited number of scenarios where effective integration testing (of MCP server primitives based on the `codeql` CLI) requires some binary file as input (before) and/or output (after). In such cases, keep the binary files small and fit-for-purpose. For example, the `codeql_bqrs_decode` MCP server tool requires an input file path pointing to a "Binary Query Results Set" file; meaning that we need to start with a binary file containing query results, but we only need a very small set of results for integration testing purposes so the `QueryBaseName.bqrs` binary file should at least be very small in size.

### Running Integration Tests

```bash
# Run standard file-based integration tests
node src/ql-mcp-client.js integration-tests

# Run monitoring-based integration tests (includes monitoring validation)
node src/ql-mcp-client.js integration-tests --tools codeql_monitoring_dump
```

## Benefits of Monitoring-Based Tests

Monitoring-based integration tests enable testing of MCP tools that previously couldn't have deterministic integration tests because:

1. **Deterministic Before/After States**: Instead of only file system changes, tests can use monitoring JSON data changes as an additional deterministic state comparison mechanism.

2. **Session-Aware Tool Testing**: Tests can verify that tools properly integrate with the monitoring system when a `sessionId` parameter is provided.

3. **Workflow Testing**: Complex multi-step workflows can be tested by combining multiple MCP tool calls and validating the cumulative monitoring state changes.

4. **Quality Assessment Testing**: Tools that affect quality scoring, session lifecycle, or analytics can be thoroughly tested using monitoring data as the validation mechanism.

## Example: Tool with Both File-Based and Monitoring Tests

```text
client/integration-tests/primitives/tools/codeql_lsp_diagnostics/
└── semantic_validation/
    ├── before/
    │   ├── semantic_query.ql          # File-based test input
    │   └── monitoring-state.json      # Monitoring state before tool execution
    └── after/
        ├── semantic_query.ql          # Expected file-based result
        └── monitoring-state.json      # Expected monitoring state after tool execution
```

This approach enables comprehensive testing of both the primary tool functionality (via file comparison) and the monitoring integration (via JSON state comparison) within the same test case structure. Static files (like query files and test databases) are referenced from `server/ql/<language>/examples/` directories.

## Example: Monitoring-Only Tool Test

```text
client/integration-tests/primitives/tools/session_start/
└── basic_session_creation/
    ├── before/
    │   └── monitoring-state.json      # Empty sessions array
    └── after/
        └── monitoring-state.json      # Session array with created session
```

For tools that only affect monitoring state (like session management tools), the test case contains only monitoring-state.json files, demonstrating how monitoring data serves as the deterministic test mechanism.
