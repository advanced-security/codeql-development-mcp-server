---
applyTo: 'client/src/**/*.js'
description: 'Instructions for MCP client JavaScript source code files.'
---

# Copilot Instructions for `client/src/**/*.js` code files

## PURPOSE

The purpose of the entire `client/**` implementation is to provide integration tests for the MCP `server/**` implementation. Accordingly, the client is implemented in JavaScript (only) and is not intended to be a production-quality MCP client library.

## REQUIREMENTS

- ALWAYS use modern JavaScript syntax and features.
- ALWAYS follow best practices for implementing secure JavaScript code.
- ALWAYS order imports, definitions, static lists, and similar constructs alphabetically.
- **ALWAYS run `npm run build-and-test` from the repo root directory and ensure it passes completely before committing any changes. This is MANDATORY and must be verified before every commit.**
- ALWAYS fix lint errors by running `npm run lint:fix` from the repo root directory before committing changes.
- **ALWAYS run `npm test` from the `client/` directory and ensure all integration tests pass before committing changes to client code.**
- ALWAYS reference the [client_integration_tests.instructions.md](./client_integration_tests.instructions.md) and [client/integration-tests/README.md](../../client/integration-tests/README.md) files when implementing or modifying integration tests for MCP server primitives.

## PREFERNCES

- PREFER keeping the `client/src/ql-mcp-client.js` entrypoint simple and focused on high-level logic.
- PREFER creating client helper modules with `client/src/<module>/*.js` files that are focused on a single concern.
- PREFER simple integration tests with "before" and "after" states over complex programmatic setup.
- PREFER building on the existing integration test approach and framework rather than implementing a new approach.

## CONTRAINTS

- NEVER leave any trailing whitespace on any line.
- NEVER guess at what an MCP server primitive is supposed do; instead, look up its source code in `server/src/**/*.ts` files.
