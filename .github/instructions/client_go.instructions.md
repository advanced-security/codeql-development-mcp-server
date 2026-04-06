---
applyTo: 'client/**/*.go'
description: 'Instructions for MCP client Go source code files.'
---

# Copilot Instructions for `client/**/*.go` code files

## PURPOSE

The `client/` directory implements `gh-ql-mcp-client`, a Go CLI that combines GitHub Code Scanning REST API operations (via `go-gh`) with the CodeQL Development MCP Server's SARIF analysis tools (via `mcp-go`). It serves as both a standalone CLI / `gh` extension for Code Scanning alert lifecycle management and as an integration test runner for MCP server primitives.

## REQUIREMENTS

- ALWAYS use modern Go idioms and standard library conventions.
- ALWAYS follow best practices for implementing secure Go code.
- ALWAYS order imports with standard library first, then external packages, then internal packages.
- ALWAYS follow a test-driven development (TDD) approach — write Go tests before implementing new functionality.
- **ALWAYS run `npm run build-and-test` from the repo root directory and ensure it passes completely before committing any changes. This is MANDATORY and must be verified before every commit.**
- ALWAYS fix lint issues by running `make -C client lint` before committing changes.
- **ALWAYS run `make -C client test-unit` and ensure all Go unit tests pass before committing changes to client code.**
- ALWAYS reference the [client_integration_tests.instructions.md](./client_integration_tests.instructions.md) and [client/integration-tests/README.md](../../client/integration-tests/README.md) files when implementing or modifying integration tests for MCP server primitives.

## PREFERENCES

- PREFER using Cobra subcommands for CLI structure (`client/cmd/`).
- PREFER keeping each command in its own file (e.g., `client/cmd/code_scanning_list_alerts.go`).
- PREFER the `internal/` package layout for non-exported packages (`github/`, `mcp/`, `testing/`).
- PREFER table-driven tests with `t.Run` subtests.
- PREFER simple integration tests with `test-config.json` fixtures over complex programmatic setup.
- PREFER building on the existing integration test approach rather than implementing a new approach.

## CONSTRAINTS

- NEVER leave any trailing whitespace on any line.
- NEVER guess at what an MCP server primitive is supposed to do; instead, look up its source code in `server/src/**/*.ts` files.
- NEVER use `os.TempDir()`, `/tmp`, or any OS-level temporary directory — use the project-local `.tmp/` directory via `{{tmpdir}}` in test fixtures.
