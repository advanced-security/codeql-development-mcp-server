# Testing Strategy

> Multi-layer testing approach for the CodeQL Development MCP Server.

## Overview

Every release of the CodeQL Development MCP Server is validated through four progressively broader layers of testing. Each layer builds on the previous one, moving from fast unit checks to real-world agentic validation.

| Layer                            | Scope                                           | Framework                      | Location                                    |
| -------------------------------- | ----------------------------------------------- | ------------------------------ | ------------------------------------------- |
| 1a — Server unit tests           | MCP server TypeScript source code               | Vitest                         | `server/test/**/*.test.ts`                  |
| 1b — Extension unit tests        | VS Code extension TypeScript source code        | Vitest                         | `extensions/vscode/test/**/*.test.ts`       |
| 2a — MCP tool integration tests  | Individual MCP tools against a running server   | Custom MCP client              | `client/integration-tests/**`               |
| 2b — Extension integration tests | Extension behaviour inside a VS Code host       | @vscode/test-cli + Mocha       | `extensions/vscode/test/suite/**/*.test.ts` |
| 3 — Agentic validation           | End-to-end CodeQL workflows driven by AI agents | GitHub Copilot agents + skills | `.github/{agents,skills}/**`                |

## Layer 1 — Unit Tests

### 1a — Server unit tests

Unit tests verify the TypeScript implementation of the MCP server.

- **Framework**: [Vitest](https://vitest.dev/) with code coverage via `@vitest/coverage-v8`.
- **Location**: `server/test/**/*.test.ts`, mirroring `server/src/**/*.ts`.
- **Run command**: `npm run test -w server` (or `npm run test:server` from the repo root).
- **Conventions**: Tests follow the Arrange-Act-Assert (AAA) pattern, use descriptive names, and mock external dependencies where necessary.

### 1b — Extension unit tests

Unit tests verify the VS Code extension's TypeScript code outside of the Extension Host (no VS Code API dependency).

- **Framework**: [Vitest](https://vitest.dev/) with code coverage via `@vitest/coverage-v8`.
- **Location**: `extensions/vscode/test/**/*.test.ts` (excluding `test/suite/`).
- **Run command**: `npm run test:coverage -w extensions/vscode` (or `npm run test:vscode` from the repo root, which also runs integration tests).
- **Conventions**: Same AAA pattern and naming conventions as the server unit tests.

## Layer 2 — Integration Tests

### 2a — MCP tool integration tests

Integration tests exercise individual MCP tools against a live server instance using the custom MCP client.

- **Client**: `client/src/ql-mcp-client.js` — connects to the MCP server, invokes tools, and validates results.
- **Transport modes**: The client supports both `stdio` (default) and `http` transport modes, controlled by the `MCP_MODE` environment variable. In `stdio` mode the client spawns the server as a child process via `StdioClientTransport`; in `http` mode it connects to a separately started HTTP server via `StreamableHTTPClientTransport`.
- **Test data**: `client/integration-tests/primitives/tools/` — each test has `before/` and `after/` directories that define the initial fixture state and, for file-based tests, the expected final state.
- **Run command**: `npm run test:integration:default -w client` (or `npm run test:client` from the repo root).
- **Key properties**:
  - Tests are deterministic and repeatable.
  - No mocks — tests use real CodeQL databases and queries bundled under `server/ql/`.
  - The default transport is `stdio`, matching the primary user experience.
  - The `before/monitoring-state.json` file supplies tool arguments. For file-based tests, the integration-test runner diffs filesystem state from `before/` to `after/`; for monitoring-based tests, `after/` artifacts are generally not diffed and are only interpreted for specific validations (for example, `codeql_query_run` interpreted output).

### 2b — Extension integration tests

Extension integration tests run inside a real VS Code Extension Development Host with the full VS Code API. They validate activation, MCP server registration, CodeQL extension bridging, and workspace-aware scenarios.

- **Framework**: [@vscode/test-cli](https://github.com/nicolo-ribaudo/vscode-test-cli) + [Mocha](https://mochajs.org/) (TDD UI).
- **Location**: `extensions/vscode/test/suite/**/*.integration.test.ts` (compiled to `dist/test/suite/*.test.cjs` by esbuild).
- **Configuration**: `extensions/vscode/.vscode-test.mjs` — defines three test profiles:
  - `noWorkspace` — no workspace folder open
  - `singleFolder` — single-folder workspace fixture
  - `multiRoot` — multi-root workspace fixture
- **Run commands**:
  - `npm run test:integration -w extensions/vscode` — run all profiles
  - `npm run test:integration:label -w extensions/vscode -- noWorkspace` — run a single profile
- **Prerequisites**: `npm run bundle -w extensions/vscode` must be run first to compile the extension and test suite.
- **CI**: Runs under `xvfb-run` on Linux for headless display support (see `.github/workflows/build-and-test-extension.yml`).

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
# Build everything and run all layers (1a + 1b + 2a + 2b)
# Integration tests use stdio transport by default
npm run build-and-test

# Run only server unit tests (1a)
npm run test:server

# Run extension unit tests + integration tests (1b + 2b)
npm run test:vscode

# Run only MCP tool integration tests (2a) - stdio mode (default)
npm run test:client

# Run MCP tool integration tests with explicit transport mode
MCP_MODE=stdio npm run test:client   # stdio transport (default)
MCP_MODE=http npm run test:client    # HTTP transport

# Run only extension integration tests (2b)
npm run test:integration -w extensions/vscode
```

> **Note**: `npm run test:vscode` runs `npm test -w extensions/vscode`, which executes both Vitest unit tests (`test:coverage`) and Extension Host integration tests (`test:integration`) in sequence. Layer 3 (agentic validation) runs as part of the CI/CD pipeline via GitHub Actions workflows and is not included in the local `build-and-test` command.
