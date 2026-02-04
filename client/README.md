# MCP Integration Client

This is an integration testing client for the CodeQL Development MCP Server. It provides basic connectivity testing and will be extended to test all MCP server tools.

## Known Issues and Limitations

### BQRS Binary Format Compatibility

The BQRS-related tools (`codeql_bqrs_decode`, `codeql_bqrs_info`) currently fail in integration tests due to binary format version incompatibility:

```text
java.lang.IllegalArgumentException: Mismatched binary query results version. Got 35 expected 2
```

This is a compatibility issue between the CodeQL CLI version being used and the test BQRS files. The BQRS files were generated with a newer version of CodeQL (format version 35) but the current CLI expects format version 2.

**Resolution**: This is not a bug in the MCP server code, but rather a test environment setup issue. To resolve:

1. Generate new test BQRS files using the current CodeQL CLI version, or
2. Upgrade the CodeQL CLI to a version that supports BQRS format version 35

### Other Integration Test Notes

- Some pack dependency resolution warnings are expected in test environment
- Exit code 1 for `codeql query format --check-only` indicates "file would change" and is considered success

## Current Status

- ✅ Basic HTTP connectivity testing
- ✅ TypeScript project setup with testing infrastructure
- ✅ Build pipeline with ESBuild
- ✅ GitHub Actions workflow for integration testing
- ⚠️ Full MCP SDK integration pending (SDK import issues being resolved)

## Usage

### CLI Interface

The CodeQL MCP Client provides a CLI for running integration tests with filtering options. See [CLI-USAGE.md](CLI-USAGE.md) for detailed documentation.

#### Implemented Subcommands

- [x] `help` - Display CLI help and usage information
- [x] `integration-tests` - Run integration tests for MCP server primitives (each test calls a single, specific MCP primitive)
- [x] `list primitives` - List all currently registered MCP server primitives (prompts, resources, and tools)
- [x] `list prompts` - List all currently registered MCP server prompts
- [x] `list resources` - List all currently registered MCP server resources
- [x] `list tools` - List all currently registered MCP server tools

**Quick Start:**

```bash
# Run all integration tests
npm test

# Run tests for specific tools
./scripts/run-integration-tests.sh --tools codeql_query_run

# Run specific tests with custom timeout
./scripts/run-integration-tests.sh --tools codeql_query_run --tests basic_query_run --timeout 600
```

**Direct CLI Usage:**

```bash
# Display help
node src/ql-mcp-client.js
node src/ql-mcp-client.js help
node src/ql-mcp-client.js --help

# List MCP primitives
node src/ql-mcp-client.js list primitives
node src/ql-mcp-client.js list prompts
node src/ql-mcp-client.js list resources
node src/ql-mcp-client.js list tools

# List with JSON format
node src/ql-mcp-client.js list tools --format json
node src/ql-mcp-client.js list primitives --format json

# Run all integration tests
node src/ql-mcp-client.js integration-tests

# Filter by tools
node src/ql-mcp-client.js integration-tests --tools codeql_query_format

# Filter by tools and tests
node src/ql-mcp-client.js integration-tests --tools codeql_query_run --tests basic_query_run,javascript_tools_print_ast
```

### Environment Variables

- `MCP_SERVER_URL`: URL for the MCP server (default: `http://localhost:3000/mcp`)
- `TIMEOUT_SECONDS`: Default timeout in seconds (default: `30`)
- `HTTP_HOST`: Server host (default: `localhost`)
- `HTTP_PORT`: Server port (default: `3000`)

## Architecture

- `src/ql-mcp-client.js`: Main client implementation

- [ ] Full MCP SDK integration for real tool testing
- [ ] Comprehensive test cases for all ~30 server tools

## Integration Test Discovery

Reference: [`client/integration-tests/README.md`](integration-tests/README.md)

The client automatically discovers and runs integration tests:

1. Lists tools via MCP API
2. Matches each tool name to `client/integration-tests/primitives/tools/<tool>/`
3. Each subdirectory represents a test case with `before/` and `after/` directories
4. Copies `before/` → temp workspace, runs tool, compares output to `after/`
5. Reports test results and coverage

**CLI Filtering:**

Use `--tools` and `--tests` options to filter which tests run:

```bash
# Run only query-related tools
node src/ql-mcp-client.js integration-tests --tools codeql_query_run,codeql_query_format

# Run specific test case
node src/ql-mcp-client.js integration-tests --tools codeql_query_run --tests basic_query_run
```

## Development

```bash
# Install dependencies
npm install

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```
