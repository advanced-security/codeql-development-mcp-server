# Testing Strategy

> Multi-layer testing approach for the CodeQL Development MCP Server.

## Overview

Every release of the CodeQL Development MCP Server is validated through three progressively broader layers of testing. Each layer builds on the previous one, moving from fast unit checks to real-world agentic validation.

| Layer                  | Scope                                           | Framework                      | Location                      |
| ---------------------- | ----------------------------------------------- | ------------------------------ | ----------------------------- |
| 1 — Unit tests         | TypeScript source code                          | Vitest                         | `server/test/**/*.test.ts`    |
| 2 — Integration tests  | Individual MCP tools against a running server   | Custom MCP client              | `client/integration-tests/**` |
| 3 — Agentic validation | End-to-end CodeQL workflows driven by AI agents | GitHub Copilot agents + skills | `.github/{agents,skills}/**`  |

## Layer 1 — Unit Tests

Unit tests verify the TypeScript implementation of the MCP server.

- **Framework**: [Vitest](https://vitest.dev/) with code coverage via `@vitest/coverage-v8`.
- **Location**: `server/test/**/*.test.ts`, mirroring `server/src/**/*.ts`.
- **Run command**: `npm run test -w server` (or `npm run test:server` from the repo root).
- **Conventions**: Tests follow the Arrange-Act-Assert (AAA) pattern, use descriptive names, and mock external dependencies where necessary.

## Layer 2 — Integration Tests

Integration tests exercise individual MCP tools against a live server instance using the custom MCP client.

- **Client**: `client/src/ql-mcp-client.js` — starts the MCP server, invokes tools, and validates results.
- **Test data**: `client/integration-tests/primitives/tools/` — each test has `before/` and `after/` directories that define the initial fixture state and, for file-based tests, the expected final state.
- **Run command**: `npm run test:integration:default -w client` (or `npm run test:client` from the repo root).
- **Key properties**:
  - Tests are deterministic and repeatable.
  - No mocks — tests use real CodeQL databases and queries bundled under `server/ql/`.
  - The `before/monitoring-state.json` file supplies tool arguments. For file-based tests, the integration-test runner diffs filesystem state from `before/` to `after/`; for monitoring-based tests, `after/` artifacts are generally not diffed and are only interpreted for specific validations (for example, `codeql_query_run` interpreted output).

## Layer 3 — Agentic Validation

Agentic validation uses GitHub Copilot agents and skills to solve CodeQL query development challenges, exercising MCP tools in realistic end-to-end scenarios.

- **Agents** (`.github/agents/`): Define specialized AI agent personas (e.g., `ql-mcp-tool-tester`, `mcp-enabled-ql-query-developer`) that interact with the MCP server exclusively through its tools, prompts, and resources.
- **Skills** (`.github/skills/`): Provide step-by-step workflows such as `create-codeql-query-tdd-generic`, `create-codeql-query-development-workshop`, and language-specific unit test creation skills.
- **Workshop exercises**: Pre-built CodeQL development workshops serve as challenge problems. Agents solve each exercise using only MCP primitives, validating that tools produce correct results in complex, multi-step scenarios.
- **Key properties**:
  - Agents never call the `codeql` CLI directly — all operations go through MCP tools.
  - Exercises cover query compilation, test execution, AST/CFG exploration, and iterative query refinement.

## Running All Tests

From the repository root:

```bash
# Build everything and run all layers (unit + integration)
npm run build-and-test

# Run only unit tests
npm run test:server

# Run only integration tests
npm run test:client
```

> **Note**: Layer 3 (agentic validation) runs as part of the CI/CD pipeline via GitHub Actions workflows and is not included in the local `build-and-test` command.
