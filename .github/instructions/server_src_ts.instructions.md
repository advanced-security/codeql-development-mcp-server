---
applyTo: 'server/src/**/*.ts'
description: 'Instructions for MCP server TypeScript source code files.'
---

# Copilot Instructions for `server/src/**/*.ts` code files

## PURPOSE

This file contains instructions for working with TypeScript source code files in the `server/src/` directory of the `codeql-development-mcp-server` repository.

## REQUIREMENTS

- ALWAYS use modern TypeScript syntax and features.
- ALWAYS follow best practices for implementing secure MCP server primitives via TypeScript.
- ALWAYS order imports, definitions, static lists, and similar constructs alphabetically.
- ALWAYS follow a test-driven development (TDD) approach by writing tests for new features or bug fixes, storing unit tests for `server/src/<lib-example>/<file-example>.ts` in `server/test/src/<lib-example>/<file-example>.test.ts`.
- **ALWAYS run `npm run build-and-test` from the repo root directory and ensure it passes completely before committing any changes. This is MANDATORY and must be verified before every commit.**
- ALWAYS fix lint errors by running `npm run lint:fix` from the repo root directory before committing changes.
- ALWAYS run the `npm test` command from the `server/` directory and ensure that all tests pass before committing changes.

## PREFERNCES

- PREFER the import of functionality from `@modelcontextprotocol/sdk` over direct implementation, unless absolutely necessary.
- PREFER to implement each MCP server primitive in its own file named after the primitive, e.g., `server/src/<lib-example>/<primitive-example>.ts`.
- PREFER many simple MCP server primitives that each do one thing well over fewer complex MCP server primitives that do many things.
- PREFER copying and/or adapting existing `*.prompt.md` files matching one of the following patterns:
  - `ql/.github/prompts/*.prompt.md`
  - `ql/languages/*/tools/dev/*.prompt.md`
  - `ql/resources/{codeql,qlt}/*.prompt.md`

## CONTRAINTS

- NEVER leave any trailing whitespace on any line.
- NEVER guess at what a `codeql` or `qlt` CLI subcommand does; ALWAYS verify against the official `codeql <subcommand> -h -vv` or `qlt <subcommand> -h` documentation, respectively.
