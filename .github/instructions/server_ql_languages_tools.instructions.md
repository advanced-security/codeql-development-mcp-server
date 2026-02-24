---
applyTo: `server/ql/*/tools/**'
description: 'Instructions for organizing CodeQL queries and query unit tests for all code languages supported by the CodeQL MCP server tools.'
---

# Copilot Instructions for managing queries used by CodeQL MCP server tools

## PURPOSE

The purpose of the `server/ql/<language>/tools/` implementation is to provide language-specific CodeQL queries that are used by MCP server tools, along with comprehensive unit tests to ensure query correctness and reliability.

## STRUCTURE

Each language directory follows a standardized structure that enables automatic discovery and testing through the `server/scripts/run-query-unit-tests.sh` script.

## REQUIREMENTS

- **ALWAYS run `npm run build-and-test` from the repo root directory and ensure it passes completely before committing any changes. This is MANDATORY and must be verified before every commit.**
- **ALWAYS run `./server/scripts/run-query-unit-tests.sh` from the repo root directory and ensure all CodeQL query unit tests pass before committing changes to query files or tests.**
- ALWAYS fix lint errors by running `npm run lint:fix` from the repo root directory before committing changes.
- ALWAYS follow the directory structure documented in [server/ql/README.md](../../server/ql/README.md).
- ALWAYS place query implementation files in `tools/src/<query-name>/` subdirectories.
- ALWAYS place corresponding test files in `tools/test/<query-name>/` subdirectories.
- ALWAYS include proper CodeQL query metadata using `@name`, `@description`, `@id`, `@kind`, and `@tags` annotations.
- ALWAYS create a `.md` query documentation file alongside every `.ql` query in `tools/src/<query-name>/` (e.g., `PrintAST.md` next to `PrintAST.ql`). This is enforced by the `query-documentation.test.ts` unit test.
- ALWAYS use the existing `server/ql/*/tools/src/PrintCFG/PrintCFG.md` files as the canonical style reference for `@kind graph` query documentation. These docs describe the structural output (nodes/edges) rather than flagging problems, so code examples should illustrate what structure the query visualizes — not whether code is compliant or non-compliant.
- ALWAYS create `.qlref` files that reference the correct query path relative to the tools directory.
- ALWAYS create `.expected` files with the expected output for each test case.
- ALWAYS implement test code source files that test both the query's ability to ignore `COMPLIANT` code patterns AND to detect `NON_COMPLIANT` code patterns for detection-style queries (`@kind problem` / `@kind path-problem`).
- ALWAYS comment test cases as either `COMPLIANT` (i.e. query should not match) or `NON_COMPLIANT` (i.e. query should match) for detection-style queries.
- ALWAYS omit `COMPLIANT` and `NON_COMPLIANT` annotations from `@kind graph` query documentation and test code, because these queries produce structural output (ASTs, CFGs, call graphs) rather than detecting problems.
- ALWAYS use the `server/scripts/install-packs.sh` script to install dependencies for CodeQL packs defined under the `server/ql/*/language/tools/` directories.
- ALWAYS use explicit version numbers in `codeql-pack.yml` files; never use wildcards (`*`).
- ALWAYS set `ql-mcp-*` pack versions to match the CodeQL CLI version from `.codeql-version` (without the `v` prefix).
- ALWAYS refer to the [upgrade-codeql-cli-and-packs skill](../skills/upgrade-codeql-cli-and-packs/SKILL.md) when updating CodeQL CLI or pack versions.

## PREFERENCES

- PREFER organizing complex queries into multiple helper predicates for better readability and maintainability.
- PREFER maintaining the existing set of queries; do not add your own unless explicitly required for some new functionality.
- PREFER implementation consistency across all supported `server/ql/<language>/` languages, using the same query name across all languages for consistency and prioritizing breadth of language support over depth of queries per language.
- PREFER short yet descriptive query names that clearly indicate their purpose and scope.
- PREFER using external predicates (like `selectedSourceFiles()`) to make queries configurable for MCP server tool usage.
- PREFER including fallback logic for unit testing when external predicates are not available.

## CONSTRAINTS

- NEVER leave any trailing whitespace on any line.
- NEVER create queries without corresponding unit tests.
- NEVER modify query behavior without updating the corresponding `.expected` files.
- NEVER use hardcoded file paths in queries; use configurable predicates or relative path matching.
- NEVER create test files that depend on external resources not included in the test directory.
- NEVER commit query files that fail CodeQL compilation or unit tests.
- NEVER create `.qlref` files with incorrect paths or missing target queries.
- NEVER mix different query purposes within a single query file.
- NEVER omit required CodeQL query metadata annotations.
- NEVER omit query documentation (`.md`) for any query published in a `tools/src/` pack directory.
- NEVER create test cases that don't actually exercise the query logic being tested.
