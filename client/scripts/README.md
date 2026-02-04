# Client Integration Test Scripts

This directory contains shell scripts that support local integration testing of the CodeQL Development MCP Server. These scripts mimic the behavior of the GitHub Actions workflow (`integration-tests-client-server.yml`) for local development and testing.

## Scripts Overview

### `run-integration-tests.sh`

Main test orchestrator script:

- Builds the server bundle (`npm run bundle`)
- Starts the MCP server in background
- Waits for server initialization
- Runs integration tests with optional filtering
- Ensures proper cleanup regardless of test outcome

Usage:

```bash
# Run all integration tests
./scripts/run-integration-tests.sh

# Run tests for specific tools
./scripts/run-integration-tests.sh --tools codeql_query_run

# Run specific tests for a tool
./scripts/run-integration-tests.sh --tools codeql_query_run --tests basic_query_run,javascript_tools_print_ast

# Run tests with custom timeout (in seconds)
./scripts/run-integration-tests.sh --timeout 600

# Combine options
./scripts/run-integration-tests.sh --tools codeql_query_format --timeout 120
```

### `start-server.sh`

Server startup script:

- Starts the MCP server in background with HTTP transport
- Sets proper environment variables (`HTTP_HOST`, `HTTP_PORT`, `TRANSPORT_MODE`)
- Captures server PID for later cleanup
- Redirects server output to `server.log`

Environment variables (with defaults):

- `HTTP_HOST=localhost`
- `HTTP_PORT=3000`
- `TRANSPORT_MODE=http`

### `stop-server.sh`

Server cleanup script:

- Stops the MCP server using the stored PID
- Gracefully terminates with SIGTERM, force kills if necessary
- Removes PID file and log files
- Handles cases where server is already stopped

### `wait-for-server.sh`

Server validation script:

- Waits 5 seconds for server initialization
- Displays server startup logs
- Validates that the server process is running
- Exits with error code if server fails to start

### `show-server-logs.sh`

Log display utility:

- Shows the last 50 lines of server logs
- Useful for debugging failed tests
- Mimics the GitHub Actions failure log display

## Package.json Scripts

The shell scripts in this directory are integrated with npm scripts for convenient execution. See the `scripts` section in `package.json` for available commands.

## Workflow Equivalence

These scripts replicate the GitHub Actions workflow steps:

1. **Install Packs**: Installs CodeQL packs needed for integration tests
2. **Build**: Builds the server bundle (via `npm run bundle`)
3. **Setup**: Ensures CodeQL CLI is available (handled by client code)
4. **Start Server**: Launches MCP server in background with HTTP transport
5. **Wait**: Validates server startup with logs and process checks
6. **Test**: Runs client integration tests against the server
7. **Cleanup**: Stops server and removes temporary files

Note: The integration test workflow does NOT run `npm run build:all` because that would include running CodeQL query unit tests and server TypeScript unit tests, which have their own dedicated workflows (`query-unit-tests.yml` for CodeQL query tests and `build-server.yml` for TypeScript unit tests).

## Usage Examples

From the `client/` directory:

```bash
# Run the complete integration test suite (equivalent to CI)
npm test

# Run tests for specific tools (pass arguments to the script)
./scripts/run-integration-tests.sh --tools codeql_query_run

# Run specific tests with custom timeout
./scripts/run-integration-tests.sh --tools codeql_query_format --timeout 120

# Start server manually (for development)
npm run server:start

# Check if server is running
npm run server:wait

# View server logs
npm run server:logs

# Stop server manually
npm run server:stop
```

## Error Handling

All scripts include proper error handling:

- Server startup validation with timeout
- Graceful server shutdown with force-kill fallback
- Automatic cleanup on script exit (using trap)
- Detailed error messages and log display on failure

## Development Notes

- Scripts are designed to be run from the `client/` directory
- All paths are calculated relative to script locations
- Environment variables can be overridden for custom configurations
- Server logs are preserved until cleanup for debugging
- PID tracking ensures reliable server lifecycle management
