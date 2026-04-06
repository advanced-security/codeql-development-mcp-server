---
name: ql-mcp-server-fix-build-and-test
description: A prompt for fixing build issues for the QL MCP Server and ensuring extensive testing of the server functionality.
agent: ql-mcp-tool-developer
model: Claude Opus 4.6 (copilot)
---

# `ql-mcp-server-fix-build-and-test` Prompt

When you encounter build issues with the QL MCP Server or need to ensure that the server functionality is thoroughly tested, use this prompt to guide your actions.

## Objectives

- Fix any build issues in the QL MCP Server codebase.
- Ensure that all unit and integration tests for the server pass successfully.
- Validate that the server starts up and shuts down correctly.
- Confirm that all changes are properly bundled and that the build artifacts are up-to-date (i.e., `server/dist/**`).

## IMPORTANT Requirement for `server/dist/**`

PRIOR to pushing any commit for any branch, ALWAYS run the necessary commands to ensure that the `server/dist/**` directory is up-to-date with the latest changes from the TypeScript source files in `server/src/**`. This includes running the build and bundling commands to generate the compiled JavaScript files. Thus, there MUST NOT be any `git diff` changes for a given commit after re-running the `npm run build` command from the root of the repository.

## Commands

The `package.json` file in the root of this repository provides the `scripts` that are used to run specific combinations of `scripts` from the `server/` (for build and unit tests) and `client/` (for integration tests) workspaces. Instead of changing to each workspace directory, stay in the root of the repository and just use the commands available via `npm run` and especially those "commands" listed below.

### Install dependencies for `npm` workspaces

Before running any build or test commands, ensure that all dependencies are installed and up-to-date by running:

```bash
npm install
```

### Run `npm run tidy` command

The `npm run tidy` command enforces consistent linting and formatting across the workspaces and `.github/**` files of this repository. Run this command to fix any linting or formatting issues.

```bash
npm run tidy
```

### Run `npm run build` command

Build the QL MCP Server to check for and fix any build issues.

```bash
npm run build
```

### Run `npm run test` command

Re-run the build and run all server unit tests plus client integration tests to ensure everything is functioning correctly PRIOR to committing any changes.

```bash
npm run test
```

#### Starting and Stopping the QL MCP Server for Client Integration Tests

QL MCP Client integration tests require the QL MCP Server to be running. You can start
the server in a separate terminal window using the scripts in `client/scripts/`:

```bash
## Start the MCP server (HTTP mode) from the repository root:
client/scripts/start-server.sh

## Wait for the server to be ready:
client/scripts/wait-for-server.sh
```

To stop the server after running the integration tests, use:

```bash
## Stop the MCP server:
client/scripts/stop-server.sh
```

#### Fixing Client Integration Tests for the QL MCP Server

Client integration tests are executed via the `gh-ql-mcp-client` binary (built from
`client/` using `make build`).

To get help on using the MCP Client binary, including help for the `integration-tests`
subcommand, run:

```bash
# From the client/ directory after running 'make build':
./gh-ql-mcp-client --help
./gh-ql-mcp-client integration-tests --help
```

When focusing specifically on fixing client integration tests, build the binary and then
run the integration tests directly using `scripts/run-integration-tests.sh`:

```bash
cd client/
make build
```

Because integration tests can be time-consuming, you can run specific tests or tools as
needed using the following commands:

```bash
# Run all integration tests with default settings (stdio mode)
./gh-ql-mcp-client integration-tests

# Run tests for specific tools
./gh-ql-mcp-client integration-tests --tools codeql_query_run

# Run specific tests for a tool with custom timeout
./gh-ql-mcp-client integration-tests --tools codeql_query_run --tests basic_query_run,javascript_tools_print_ast --timeout 600
```

Alternatively, use the orchestration script which handles server start/stop automatically:

```bash
# From the client/ directory:
scripts/run-integration-tests.sh

# Filter to specific tools:
scripts/run-integration-tests.sh --tools codeql_query_run
```

## References

- [`package.json`](../../package.json) - The main `package.json` file that defines the `scripts` for building and testing the MCP Server, with references to the `server/` and `client/` workspaces.
- [`server/package.json`](../../server/package.json) - The `package.json` file in the `server/` workspace that defines the build and test scripts specific to the MCP Server.
- [`client/Makefile`](../../client/Makefile) - The `Makefile` in the `client/` workspace that defines the build and test targets for the Go MCP Client.
- [`client/go.mod`](../../client/go.mod) - The Go module definition for the `gh-ql-mcp-client` binary.
