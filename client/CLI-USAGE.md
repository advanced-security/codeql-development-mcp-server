# CodeQL MCP Client CLI Usage Guide

This document describes how to use the CodeQL MCP Client CLI for running integration tests with filtering and custom configuration.

## Overview

The CodeQL MCP Client now provides a proper CLI interface with structured subcommands instead of simple flags. This enables better argument handling, validation, and filtering capabilities.

## Installation

No installation required beyond the project dependencies. The CLI is available through:

```bash
# Direct invocation
node src/ql-mcp-client.js [COMMAND] [OPTIONS]

# Via npm script
npm start -- [OPTIONS]
npm test  # Runs integration tests via scripts/run-integration-tests.sh
```

## Commands

### `help` (default)

Display help information about available commands and options.

**Basic Usage:**

```bash
# Display help (default when no arguments provided)
node src/ql-mcp-client.js

# Or explicitly
node src/ql-mcp-client.js help
node src/ql-mcp-client.js --help
```

### `server start`

Start the MCP server with configurable options.

**Basic Usage:**

```bash
# Start server with default settings (HTTP mode on localhost:3000)
node src/ql-mcp-client.js server start

# Start server with custom port
node src/ql-mcp-client.js server start --port 8080

# Start server in stdio mode
node src/ql-mcp-client.js server start --mode stdio
```

**Options:**

- `--mode` - Transport mode: `http` (default) or `stdio`
- `--host` - HTTP host (default: `localhost`)
- `--port` - HTTP port (default: `3000`)
- `--scheme` - HTTP scheme (default: `http`)

### `server stop`

Stop the running MCP server.

**Basic Usage:**

```bash
# Stop the server
node src/ql-mcp-client.js server stop
```

### `integration-tests`

Run integration tests against the MCP server with optional filtering.

**Basic Usage:**

```bash
# Run all integration tests
node src/ql-mcp-client.js integration-tests
```

### `list primitives`

List all currently registered MCP server primitives (prompts, resources, and tools) in a unified view.

**Note:** The server will be started automatically if not already running.

**Basic Usage:**

```bash
# List all primitives in text format (default)
node src/ql-mcp-client.js list primitives

# List all primitives in JSON format
node src/ql-mcp-client.js list primitives --format json
```

### `list prompts`

List all currently registered MCP server prompts.

**Note:** The server will be started automatically if not already running.

**Basic Usage:**

```bash
# List all prompts in text format (default)
node src/ql-mcp-client.js list prompts

# List all prompts in JSON format
node src/ql-mcp-client.js list prompts --format json
```

### `list resources`

List all currently registered MCP server resources.

**Note:** The server will be started automatically if not already running.

**Basic Usage:**

```bash
# List all resources in text format (default)
node src/ql-mcp-client.js list resources

# List all resources in JSON format
node src/ql-mcp-client.js list resources --format json
```

### `list tools`

List all currently registered MCP server tools.

**Note:** The server will be started automatically if not already running.

**Basic Usage:**

```bash
# List all tools in text format (default)
node src/ql-mcp-client.js list tools

# List all tools in JSON format
node src/ql-mcp-client.js list tools --format json
```

## Options

### `--format <format>`

Set the output format for `list` commands. Accepts `text` (default) or `json`.

**Text Format** - Human-readable output:

```text
codeql_bqrs_decode (tools/codeql_bqrs_decode) : Decode BQRS result files to human-readable formats
```

**JSON Format** - Structured output for programmatic consumption:

```json
[
  {
    "name": "codeql_bqrs_decode",
    "description": "Decode BQRS result files to human-readable formats",
    "endpoint": "tools/codeql_bqrs_decode",
    "type": "tool"
  }
]
```

**Examples:**

```bash
# List tools in JSON format
node src/ql-mcp-client.js list tools --format json

# List primitives in text format (default, explicit)
node src/ql-mcp-client.js list primitives --format text
```

### `--mode <mode>`

Set the transport mode for the MCP server. Accepts `http` (default) or `stdio`.

**Examples:**

```bash
# Start server in HTTP mode (default)
node src/ql-mcp-client.js server start --mode http

# Start server in stdio mode
node src/ql-mcp-client.js server start --mode stdio
```

### `--host <host>`

Set the HTTP host for the MCP server (HTTP mode only). Default: `localhost`.

**Examples:**

```bash
# Start server on specific host
node src/ql-mcp-client.js server start --host 0.0.0.0
```

### `--port <port>`

Set the HTTP port for the MCP server (HTTP mode only). Default: `3000`.

**Examples:**

```bash
# Start server on custom port
node src/ql-mcp-client.js server start --port 8080
```

### `--scheme <scheme>`

Set the HTTP scheme for the MCP server (HTTP mode only). Default: `http`.

**Examples:**

```bash
# Start server with HTTPS scheme
node src/ql-mcp-client.js server start --scheme https
```

### `--tools <tools>`

Filter integration tests to run only for specific MCP server tools. Accepts a comma-separated list.

**Examples:**

```bash
# Test a single tool
node src/ql-mcp-client.js integration-tests --tools codeql_query_run

# Test multiple tools
node src/ql-mcp-client.js integration-tests --tools codeql_query_run,codeql_query_format
```

### `--tests <tests>`

Filter to run only specific test cases. **Can only be used with a single `--tools` value.**

**Examples:**

```bash
# Run specific tests for a single tool
node src/ql-mcp-client.js integration-tests --tools codeql_query_run --tests basic_query_run,javascript_tools_print_ast

# This will fail validation (multiple tools with --tests)
node src/ql-mcp-client.js integration-tests --tools tool1,tool2 --tests test1
# Error: The --tests option can only be used when specifying a single tool with --tools
```

### `--timeout <seconds>`

Set the timeout in seconds for tool calls. Default is 30 seconds for integration tests.

**Examples:**

```bash
# Set a 10-minute timeout
node src/ql-mcp-client.js integration-tests --timeout 600

# Combine with tool filtering
node src/ql-mcp-client.js integration-tests --tools codeql_query_run --timeout 300
```

## Integration with Shell Scripts

The `client/scripts/run-integration-tests.sh` script now forwards all arguments to the CLI:

```bash
# Run all tests (default)
./client/scripts/run-integration-tests.sh

# Run specific tools
./client/scripts/run-integration-tests.sh --tools codeql_query_format

# Run specific tests with custom timeout
./client/scripts/run-integration-tests.sh --tools codeql_query_run --tests basic_query_run --timeout 600
```

## Validation Rules

The CLI includes built-in validation:

1. **Command Validation**: Only `help`, `integration-tests`, `list`, `server`, `queries-metadata-collect`, `queries-metadata-process`, `query-files-copy`, `resolve-all-queries`, and `source-root-validate` commands are allowed
2. **List Subcommand Validation**: `list` requires one of: `primitives`, `prompts`, `resources`, or `tools`
3. **Server Subcommand Validation**: `server` requires one of: `start` or `stop`
4. **Format Validation**: `--format` option only accepts `text` or `json`
5. **Mode Validation**: `--mode` option only accepts `http` or `stdio`
6. **Port Validation**: `--port` must be a number between 1 and 65535
7. **Timeout Validation**: Must be a positive number
8. **Tools/Tests Combination**: `--tests` can only be used with a single tool specified in `--tools`

Invalid arguments will display an error message followed by the help text.

## Examples

### Server Management

#### Example 1: Start and Stop Server

```bash
# Start server with default settings
node src/ql-mcp-client.js server start

# Stop the server
node src/ql-mcp-client.js server stop
```

#### Example 2: Start Server with Custom Configuration

```bash
# Start server on custom port
node src/ql-mcp-client.js server start --port 8080

# Start server with all custom options
node src/ql-mcp-client.js server start --mode http --host localhost --port 3000 --scheme http
```

#### Example 3: Use Server for List Commands

```bash
# The server will start automatically if needed
node src/ql-mcp-client.js list tools

# Or start it manually first
node src/ql-mcp-client.js server start
node src/ql-mcp-client.js list prompts
node src/ql-mcp-client.js server stop
```

### List Commands

#### Example 1: List All Tools

```bash
# List all MCP server tools (text format)
node src/ql-mcp-client.js list tools
```

Output:

```text
codeql_bqrs_decode (tools/codeql_bqrs_decode) : Decode BQRS result files to human-readable formats
codeql_bqrs_info (tools/codeql_bqrs_info) : Get metadata and information about BQRS result files
...
```

#### Example 2: List Tools in JSON Format

```bash
# List all tools as JSON for programmatic use
node src/ql-mcp-client.js list tools --format json
```

Output:

```json
[
  {
    "name": "codeql_bqrs_decode",
    "description": "Decode BQRS result files to human-readable formats",
    "endpoint": "tools/codeql_bqrs_decode",
    "type": "tool"
  },
  ...
]
```

#### Example 3: List All Primitives

```bash
# List all primitives (prompts, resources, and tools)
node src/ql-mcp-client.js list primitives
```

#### Example 4: List Prompts and Resources

```bash
# List available prompts
node src/ql-mcp-client.js list prompts

# List available resources
node src/ql-mcp-client.js list resources
```

### Integration Test Examples

### Example 1: Quick Test of a Single Tool

```bash
# Test only the query format tool
node src/ql-mcp-client.js integration-tests --tools codeql_query_format
```

### Example 2: Debug Specific Test Case

```bash
# Run a specific test with extended timeout for debugging
node src/ql-mcp-client.js integration-tests \
  --tools codeql_query_run \
  --tests javascript_tools_print_ast \
  --timeout 600
```

### Example 3: Test Multiple Related Tools

```bash
# Test all query-related tools
node src/ql-mcp-client.js integration-tests \
  --tools codeql_query_run,codeql_query_format,codeql_query_compile
```

### Example 4: Use with Shell Script

```bash
# From the client directory
./scripts/run-integration-tests.sh --tools codeql_query_run --timeout 300
```

## Environment Variables

The following environment variables can be used to configure the client:

- `MCP_SERVER_URL`: URL of the MCP server (default: `http://localhost:3000/mcp`)
- `TIMEOUT_SECONDS`: Default timeout in seconds (default: `30`)
- `HTTP_HOST`: Server host (default: `localhost`)
- `HTTP_PORT`: Server port (default: `3000`)

## Migration from Old CLI

The old CLI flags have been removed and new commands have been added:

### Removed Features

- ~~`--demo-monitoring`~~ / ~~`--monitoring-demo`~~ → Removed
- ~~`--monitoring-tests`~~ / ~~`--monitoring`~~ → Removed

### Changed Behavior

- **No arguments**: Now shows help (was: runs integration tests)
  - Old: `node src/ql-mcp-client.js` → ran integration tests
  - New: `node src/ql-mcp-client.js` → shows help
  - To run integration tests: `node src/ql-mcp-client.js integration-tests`

### New Features

- **`list` commands**: Discover MCP server primitives (auto-starts server if needed)
  - `list primitives` - List all primitives (prompts, resources, tools)
  - `list prompts` - List prompts
  - `list resources` - List resources
  - `list tools` - List tools
- **`server` commands**: Manage MCP server lifecycle
  - `server start` - Start the MCP server with configurable options
  - `server stop` - Stop the MCP server
- **`--format` option**: Control output format (text/json) for list commands
- **Server auto-start**: List commands automatically start the server if not running

### Script Replacement

The new `server` commands replace the shell scripts:

- `client/scripts/start-server.sh` → `node src/ql-mcp-client.js server start`
- `client/scripts/stop-server.sh` → `node src/ql-mcp-client.js server stop`

## Troubleshooting

### "Server is already running"

The server start command detects if a server is already running:

```bash
# If server is running, you'll see:
$ node src/ql-mcp-client.js server start
Server is already running with PID 12345

# Stop it first, then start again:
$ node src/ql-mcp-client.js server stop
$ node src/ql-mcp-client.js server start
```

### "No server.pid file found"

When stopping a server that isn't running:

```bash
$ node src/ql-mcp-client.js server stop
No server.pid file found
```

This is normal if no server was started. List commands will automatically start the server when needed.

### "Invalid mode value"

Ensure the mode option is either `http` or `stdio`:

```bash
# ❌ Invalid
node src/ql-mcp-client.js server start --mode tcp

# ✅ Valid
node src/ql-mcp-client.js server start --mode http
node src/ql-mcp-client.js server start --mode stdio
```

### "Invalid port value"

Ensure the port is a number between 1 and 65535:

```bash
# ❌ Invalid
node src/ql-mcp-client.js server start --port 99999

# ✅ Valid
node src/ql-mcp-client.js server start --port 8080
```

### "Invalid format value"

Ensure the format option is either `text` or `json`:

```bash
# ❌ Invalid
node src/ql-mcp-client.js list tools --format xml

# ✅ Valid
node src/ql-mcp-client.js list tools --format json
node src/ql-mcp-client.js list tools --format text
```

### "Missing subcommand for 'list'"

The `list` command requires a subcommand:

```bash
# ❌ Invalid
node src/ql-mcp-client.js list

# ✅ Valid
node src/ql-mcp-client.js list tools
node src/ql-mcp-client.js list prompts
node src/ql-mcp-client.js list resources
node src/ql-mcp-client.js list primitives
```

### `queries-metadata-collect`

Aggregate metadata for CodeQL queries using the `find_codeql_query_files` MCP tool. This command processes large datasets and writes output directly to a file for reliability.

**Basic Usage:**

```bash
# Aggregate metadata for all queries
OUTPUT_DIR=/tmp/queries node src/ql-mcp-client.js queries-metadata-collect

# Limit to first 10 queries (for testing)
OUTPUT_DIR=/tmp/queries MAX_QUERIES=10 node src/ql-mcp-client.js queries-metadata-collect
```

**Output:**

- Writes JSON directly to `${OUTPUT_DIR}/ql_queries_metadata.json`
- Progress messages logged to stderr
- No stdout redirection (reliable for large datasets)

**Environment Variables:**

- `OUTPUT_DIR` (required): Directory for output files
- `MAX_QUERIES` (optional): Limit number of queries to process
- `MCP_TIMEOUT` (optional): Timeout per query in milliseconds (default: 120000)

### `queries-metadata-process`

Process aggregated query metadata to generate coverage analysis by language. This command handles large JSON datasets by writing directly to files.

**Basic Usage:**

```bash
# Process metadata from default location
OUTPUT_DIR=/tmp/queries node src/ql-mcp-client.js queries-metadata-process

# Process from custom location
QL_QUERIES_METADATA_INPUT_FILE=/path/to/metadata.json OUTPUT_DIR=/tmp/output node src/ql-mcp-client.js queries-metadata-process
```

**Output:**

- Writes JSON directly to `${OUTPUT_DIR}/ql_queries_processed.json`
- Summary statistics logged to stderr
- No stdout redirection (reliable for large datasets)

**Environment Variables:**

- `OUTPUT_DIR` (required): Directory for output files
- `QL_QUERIES_METADATA_INPUT_FILE` (optional): Path to input metadata file (defaults to `${OUTPUT_DIR}/ql_queries_metadata.json`)

### `resolve-all-queries`

Resolve all CodeQL queries from query packs in a repository. This command processes query pack metadata and extracts all query file paths.

**Basic Usage:**

```bash
# Resolve queries from all query packs
OUTPUT_DIR=/tmp/queries node src/ql-mcp-client.js resolve-all-queries
```

**Output:**

- Writes JSON array directly to `${OUTPUT_DIR}/codeql-resolve-queries.json`
- Progress messages logged to stderr
- No stdout redirection (reliable for large datasets)

**Environment Variables:**

- `OUTPUT_DIR` (required): Directory for input (pack list) and output files
- `MCP_TIMEOUT` (optional): Timeout per pack in milliseconds (default: 120000)

**Prerequisites:**

- Requires `${OUTPUT_DIR}/codeql-pack-ls.json` to exist (output from `codeql_pack_ls` MCP tool)

### `source-root-validate`

Validate SOURCE_ROOT environment variable and directory structure. This command checks that the source root directory exists and contains a valid CodeQL workspace configuration file.

**Basic Usage:**

```bash
# Validate source root with output file
SOURCE_ROOT=/path/to/codeql OUTPUT_DIR=/tmp/validation node src/ql-mcp-client.js source-root-validate

# Validate without output file (JSON to stdout)
SOURCE_ROOT=/path/to/codeql node src/ql-mcp-client.js source-root-validate
```

**Output:**

- Writes JSON to `${OUTPUT_DIR}/validate-source-root.json` (if OUTPUT_DIR is set)
- Also outputs validation result to stdout
- Exits with code 1 if validation fails

**Environment Variables:**

- `SOURCE_ROOT` (required): Path to CodeQL repository root
- `OUTPUT_DIR` (optional): Directory for output file

**Validation Checks:**

- SOURCE_ROOT environment variable is set
- SOURCE_ROOT directory exists
- Directory contains `codeql-workspace.yml` or `codeql-workspace.yaml`

## Design Pattern: Large JSON Output Handling

For commands that generate large JSON datasets (like `queries-metadata-collect` and `queries-metadata-process`), we use **direct file writing** instead of stdout redirection:

**Benefits:**

- ✅ Reliable for large datasets (avoids stdout buffering issues)
- ✅ Atomic file writes with proper error handling
- ✅ Progress/summary logged to stderr (visible during execution)
- ✅ File path logged on completion

**Implementation Pattern:**

```javascript
// Command writes directly to file
await writeFile(outputFile, JSON.stringify(result, null, 2), 'utf-8');
// Log summary to stderr
console.error(`Output file: ${outputFile}`);
```

### "Invalid list subcommand"

Only `primitives`, `prompts`, `resources`, and `tools` are valid:

```bash
# ❌ Invalid
node src/ql-mcp-client.js list commands

# ✅ Valid
node src/ql-mcp-client.js list primitives
```

### "Invalid timeout value"

Ensure the timeout value is a positive number:

```bash
# ❌ Invalid
node src/ql-mcp-client.js integration-tests --timeout abc

# ✅ Valid
node src/ql-mcp-client.js integration-tests --timeout 300
```

### "The --tests option can only be used when specifying a single tool"

The `--tests` filter requires exactly one tool:

```bash
# ❌ Invalid (multiple tools)
node src/ql-mcp-client.js integration-tests --tools tool1,tool2 --tests test1

# ✅ Valid (single tool)
node src/ql-mcp-client.js integration-tests --tools tool1 --tests test1,test2
```

### "No matching tools found with filter"

Ensure tool names match exactly with available integration test directories:

```bash
# Check available tools
ls client/integration-tests/primitives/tools/

# Use exact tool names
node src/ql-mcp-client.js integration-tests --tools codeql_query_run
```
