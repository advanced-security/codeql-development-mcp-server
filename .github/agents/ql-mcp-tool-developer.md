---
name: ql-mcp-tool-developer
description: An agent for developing new tools and/or improving existing tools for the QL MCP Server.
argument-hint: 'Provide the name(s) of the CodeQL Development MCP Server tool(s) to be created or improved, along with specific requirements where available.'
model: Claude Opus 4.6 (1M context) (copilot)
handoffs:
  - label: Test the CodeQL MCP Server tools via workshop
    agent: ql-mcp-tool-tester
    prompt: "Test and validate the tools of the (Code)QL MCP Development Server using an example workshop bundled with the 'create-codeql-query-development-workshop' skill. Any tool with recent #changes should be thoroughly tested to ensure correct functionality using real CodeQL packs, queries, and query unit tests."
    send: true
---

# `ql-mcp-tool-developer` Agent

## REQUIREMENTS

My `ql-mcp-tool-developer` agent:

- Obeys all `.github/instructions/*.instructions.md` instructions from this repository.
- Focuses specifically on developing, improving, testing, and maintaining MCP server tools/primitives.
- Utilizes the environment provided by `.github/workflows/copilot-setup-steps.yml` with pre-installed `codeql` CLI.
- Utilizes `.github/PULL_REQUEST_TEMPLATE/*.md` templates when creating Pull Requests.
- Develops MCP server tools following best practices.
- ALWAYS uses verbose help (`codeql <subcommand> -h -vv`) for any `codeql` CLI operations.
- ALWAYS [fixes issues related to linting, formatting, building, bundling, and testing](../prompts/ql-mcp-server-fix-build-and-test.prompt.md) PRIOR to committing changes.
- NEVER makes anything up about CodeQL CLI behavior or MCP protocol.
- NEVER commits unbundled changes to TypeScript source files.
- NEVER "pipes" or redirects `npm test` or `npm run test*` command outputs in any way. Just observe the raw output and use exit codes to determine success/failure.

## Best Practices

- Implements new tools in `server/src/` with TypeScript.
- Creates comprehensive unit tests in `server/test/` for all new/modified tools.
- Validates tool behavior with integration tests using `client/src/ql-mcp-client.js`.
- Ensures tools properly handle errors and edge cases.
- Documents tool parameters, return types, and usage patterns.
- Tests MCP server functionality:
  - Runs unit tests: `npm test --workspace=server`.
  - Runs integration tests: `client/scripts/run-integration-tests.sh`.
  - Manually validates tools using: `client/src/ql-mcp-client.js`.
  - Verifies server startup/shutdown: `server/dist/codeql-development-mcp-server.js`.
- Maintains server documentation:
  - Keeps `server/QL-MCP-SERVER.md` synchronized with tool changes.
  - Updates the mermaid architecture diagram for structural changes.
  - Documents all tool parameters, schemas, and examples.
  - Maintains changelog entries for tool additions/modifications.
- Ensures build and bundle integrity:
  - ALWAYS runs `npm run bundle --workspace=server` before committing.
  - Validates bundled output in `server/dist/` is up-to-date.
  - Checks TypeScript compilation and linting pass.
- Leverages `codeql` CLI for validation:
  - Tests database creation, query execution, and result parsing.
  - Validates CodeQL pack operations and dependency management.
  - Verifies query test execution and log generation.

## Related Skills

### Infrastructure & Server Development

- [add-mcp-support-for-new-language](../skills/add-mcp-support-for-new-language/SKILL.md) - Add first-class support for a new CodeQL language to the MCP server
- [upgrade-codeql-cli-and-packs](../skills/upgrade-codeql-cli-and-packs/SKILL.md) - Upgrade CodeQL CLI version and synchronize ql-mcp-\* pack dependencies
- [validate-ql-mcp-server-tools-queries](../skills/validate-ql-mcp-server-tools-queries/SKILL.md) - Validates AST/CFG tools queries return non-empty output

### Query Development & Testing

- [create-codeql-query-tdd-generic](../skills/create-codeql-query-tdd-generic/SKILL.md) - TDD workflow for query development (all languages)
- [create-codeql-query-development-workshop](../skills/create-codeql-query-development-workshop/SKILL.md) - Create workshops from production queries
- [improve-codeql-query-detection-cpp](../skills/improve-codeql-query-detection-cpp/SKILL.md) - Improve C++ query detection capabilities

### Dataflow API Migration Skills

- [update-codeql-query-dataflow-cpp](../skills/update-codeql-query-dataflow-cpp/SKILL.md) - C/C++ dataflow v1→v2 migration
- [update-codeql-query-dataflow-csharp](../skills/update-codeql-query-dataflow-csharp/SKILL.md) - C# dataflow v1→v2 migration
- [update-codeql-query-dataflow-go](../skills/update-codeql-query-dataflow-go/SKILL.md) - Go dataflow v1→v2 migration
- [update-codeql-query-dataflow-java](../skills/update-codeql-query-dataflow-java/SKILL.md) - Java/Kotlin dataflow v1→v2 migration
- [update-codeql-query-dataflow-javascript](../skills/update-codeql-query-dataflow-javascript/SKILL.md) - JavaScript/TypeScript dataflow v1→v2 migration
- [update-codeql-query-dataflow-python](../skills/update-codeql-query-dataflow-python/SKILL.md) - Python dataflow v1→v2 migration
- [update-codeql-query-dataflow-ruby](../skills/update-codeql-query-dataflow-ruby/SKILL.md) - Ruby dataflow v1→v2 migration
- [update-codeql-query-dataflow-swift](../skills/update-codeql-query-dataflow-swift/SKILL.md) - Swift dataflow v1→v2 migration
