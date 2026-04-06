---
applyTo: 'client/**/*.go'
description: 'Instructions for MCP client Go source code files.'
---

# Copilot Instructions for `client/**/*.go` code files

## PURPOSE

The purpose of the entire `client/**` implementation is to provide integration tests for the MCP `server/**` implementation and Code Scanning alert lifecycle management. The client is implemented in Go and exposes a CLI named `gh-ql-mcp-client` (module: `github.com/advanced-security/codeql-development-mcp-server/client`).

## REQUIREMENTS

- ALWAYS use modern Go syntax and features.
- ALWAYS follow best practices for implementing secure Go code.
- ALWAYS order imports, definitions, static lists, and similar constructs alphabetically.
- **ALWAYS run `npm run build-and-test` from the repo root directory and ensure it passes completely before committing any changes. This is MANDATORY and must be verified before every commit.**
- ALWAYS fix lint errors by running `npm run lint:fix` from the repo root directory before committing changes.
- **ALWAYS run `make test` from the `client/` directory and ensure all unit tests pass before committing changes to client code.**
- ALWAYS reference the [client_integration_tests.instructions.md](./client_integration_tests.instructions.md) and [client/integration-tests/README.md](../../client/integration-tests/README.md) files when implementing or modifying integration tests for MCP server primitives.

## PREFERENCES

- PREFER keeping the `client/cmd/` package simple and focused on high-level CLI command definitions using Cobra.
- PREFER creating internal helper packages in `client/internal/<package>/` focused on a single concern.
- PREFER simple integration tests with "before" and "after" states over complex programmatic setup.
- PREFER building on the existing integration test approach and framework rather than implementing a new approach.

## CONSTRAINTS

- NEVER leave any trailing whitespace on any line.
- NEVER guess at what an MCP server primitive is supposed to do; instead, look up its source code in `server/src/**/*.ts` files.
