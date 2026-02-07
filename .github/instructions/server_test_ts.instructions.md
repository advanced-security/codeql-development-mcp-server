---
applyTo: 'server/test/**/*.test.ts'
description: 'Instructions for MCP server TypeScript test files.'
---

# Copilot Instructions for `server/test/**/*.test.ts` test files

## PURPOSE

This file contains instructions for working with TypeScript test files in the `server/test/` directory of the `codeql-development-mcp-server` repository.

## REQUIREMENTS

- ALWAYS use modern TypeScript syntax and features.
- ALWAYS follow best practices for writing comprehensive and maintainable tests using Vitest.
- ALWAYS order imports, test descriptions, and test cases alphabetically where logical.
- ALWAYS use descriptive test names that clearly explain what is being tested.
- ALWAYS use the AAA pattern (Arrange, Act, Assert) for structuring test cases.
- ALWAYS ensure test files mirror the structure of source files (e.g., tests for `server/src/lib/example.ts` go in `server/test/src/lib/example.test.ts`).
- **ALWAYS run `npm run build-and-test` from the repo root directory and ensure it passes completely before committing any changes. This is MANDATORY and must be verified before every commit.**
- ALWAYS fix lint errors by running `npm run lint:fix` from the repo root directory before committing changes.
- ALWAYS run `npm test` from the `server/` directory after making changes to ensure all tests pass.

## PREFERENCES

- PREFER using `describe` blocks to group related tests logically.
- PREFER testing both happy path and edge cases for each function or method.
- PREFER using `expect` assertions that are specific and meaningful.
- PREFER mocking external dependencies to keep tests focused and fast.
- PREFER testing public interfaces rather than implementation details.

## CONSTRAINTS

- NEVER leave any trailing whitespace on any line.
- NEVER write tests that depend on external resources or network calls without proper mocking.
- NEVER write overly complex tests that test multiple concerns in a single test case.
- NEVER skip writing tests for new functionality or bug fixes.
- **NEVER use `os.tmpdir()`, `/tmp`, or any OS-level temporary directory** in test code or test fixtures. The OS temp directory is world-readable and triggers CWE-377/CWE-378 vulnerabilities. Instead, ALWAYS use the project-local `.tmp/` directory via `getProjectTmpDir()`, `createProjectTempDir()`, or `getProjectTmpBase()` from `server/src/utils/temp-dir.ts`. For integration test fixtures, use the `{{tmpdir}}` placeholder which resolves at runtime to `<repoRoot>/.tmp/`.
