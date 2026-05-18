---
name: ql-mcp-server-fix-build-and-test
description: A prompt for fixing build issues for the QL MCP Server and ensuring extensive testing of the server functionality.
agent: ql-mcp-tool-developer
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

For HTTP mode integration tests, the QL MCP Server must be running. You can start the server using the shell scripts:

```bash
client/scripts/start-server.sh
client/scripts/wait-for-server.sh
```

To stop the server after running the integration tests:

```bash
client/scripts/stop-server.sh
```

For stdio mode, the Go client spawns the server automatically — no manual start/stop is needed.

#### Fixing Client Integration Tests for the QL MCP Server

Client integration tests are executed via the Go binary `gh-ql-mcp-client`.

To get help on using the MCP Client binary, including help for the `integration-tests` subcommand, run:

```bash
gh-ql-mcp-client --help
```

When focusing specifically on fixing client integration tests, build the binary and run the integration tests directly:

```bash
make -C client build
gh-ql-mcp-client integration-tests --mode stdio --no-install-packs
```

Because integration tests can be time-consuming, you can run specific tests or tools as needed using the following commands:

```bash
# Run all integration tests with default settings
gh-ql-mcp-client integration-tests --mode stdio --no-install-packs

# Run tests for specific tools
gh-ql-mcp-client integration-tests --mode stdio --tools codeql_query_run --no-install-packs

# Run specific tests for a tool
gh-ql-mcp-client integration-tests --mode stdio --tools codeql_query_run --tests basic_query_run --no-install-packs
```

## References

- [`package.json`](../../package.json) - The main `package.json` file that defines the `scripts` for building and testing the MCP Server, with references to the `server/` workspace and `make -C client` targets.
- [`server/package.json`](../../server/package.json) - The `package.json` file in the `server/` workspace that defines the build and test scripts specific to the MCP Server.
- [`client/Makefile`](../../client/Makefile) - The Makefile in the `client/` directory that defines build, test, lint, and cross-compile targets for the Go CLI.
