---
agent: mcp-enabled-ql-workshop-developer
name: validate-ql-mcp-server-tools-via-workshop
description: 'A prompt for validating the real-world functionality of the CodeQL Development MCP Server tools by creating a CodeQL query development workshop from scratch using an existing, production-grade CodeQL query as the workshop "solution".'
argument-hint: 'Provide the absolute or relative path to a local ".ql" or ".qlref" file associated with a production-grade CodeQL query to be used as the "solution" for the last stage of the to-be-created workshop.'
model: Claude Opus 4.5 (copilot)
---

# `validate-ql-mcp-server-tools-via-workshop` Prompt

## Purpose

This prompt validates that the CodeQL Development MCP Server tools work correctly in real-world scenarios by exercising them end-to-end during workshop creation. Unlike integration tests that validate individual tools in isolation, this approach validates that:

1. Tools work together in realistic multi-step workflows
2. Tool outputs are compatible with subsequent tool inputs
3. The server handles complex, stateful operations correctly
4. Query analysis, test execution, and file generation produce usable results

## Critical Validation Priority: AST and CFG Data Retrieval

> **⚠️ HIGHEST PRIORITY**: The most important yet most difficult-to-test feature of the CodeQL Development MCP Server is the reliable retrieval of **non-empty, textual representations** of AST and CFG graph data for test code source files.

The `codeql_query_run` tool's ability to execute qlpack-bundled "tools" queries (`PrintAST`, `PrintCFG`, `CallGraphFrom`, `CallGraphTo`) is **absolutely vital** to the success of this project. These queries provide:

1. **TDD Baseline**: AST/CFG data establishes the structural understanding needed before writing detection queries
2. **Educational Foundation**: Workshop participants need to visualize code structure to understand query logic
3. **Debugging Aid**: When queries don't behave as expected, AST/CFG output reveals what CodeQL "sees"

### Validation Requirements for AST/CFG Tools

The agent **MUST** validate that each tools query returns **meaningful, non-empty output** for the workshop's test code:

| Tool Query      | Expected Output                            | Failure Indicator                       |
| --------------- | ------------------------------------------ | --------------------------------------- |
| `PrintAST`      | Hierarchical tree of AST nodes with labels | Empty output or only column headers     |
| `PrintCFG`      | Graph nodes and edges for control flow     | No `nodes` or `edges` in output         |
| `CallGraphFrom` | Outbound calls from specified functions    | Zero results when calls clearly exist   |
| `CallGraphTo`   | Inbound calls to specified functions       | Zero results when callers clearly exist |

### Why This Matters

Integration tests often "go through the motions" without ensuring tools queries return expected, non-empty output. A test that:

- ✅ Invokes `codeql_query_run` with `PrintAST.ql`
- ✅ Receives a successful response
- ❌ **Does NOT verify the output contains actual AST nodes**

...is a **false positive**. This prompt ensures real-world validation by requiring the agent to:

1. Run each tools query against workshop test code
2. Parse and verify the output contains substantive data
3. Use the AST/CFG output as educational material in the workshop README
4. Fail validation if any tools query returns empty or malformed output

## How It Works

The validation uses the `create-codeql-query-development-workshop` skill to create a complete workshop from a production-grade CodeQL query. This exercises a wide range of MCP server tools including:

- **AST/CFG Analysis** (CRITICAL): `codeql_query_run` with `PrintAST`, `PrintCFG`, `CallGraphFrom`, `CallGraphTo`
- **Query Analysis**: `find_codeql_query_files`, `codeql_resolve_metadata`
- **Query Execution**: `codeql_query_run`, `codeql_test_run`
- **Code Generation**: File creation tools for exercises, solutions, and tests
- **Pack Management**: `codeql_pack_install`, `codeql_pack_ls`
- **Profiling**: `profile_codeql_query` for performance analysis

## Required Inputs

Provide the following when invoking this prompt:

| Input          | Description                                           | Example                                               |
| -------------- | ----------------------------------------------------- | ----------------------------------------------------- |
| **Query Path** | Absolute or relative path to a `.ql` or `.qlref` file | `server/ql/javascript/tools/src/PrintAST/PrintAST.ql` |

## Optional Inputs

| Input                | Default                 | Description                                  |
| -------------------- | ----------------------- | -------------------------------------------- |
| **Output Directory** | `workshops/`            | Where to create the workshop                 |
| **Workshop Name**    | Derived from query name | Custom name for the workshop directory       |
| **Number of Stages** | Auto-detected           | Override the number of incremental exercises |

## Execution Steps

When this prompt is invoked, the agent will:

1. **Locate the Query**: Resolve the provided path to find the query and its associated test files using `find_codeql_query_files`.

2. **Analyze Query Complexity**: Use `codeql_resolve_metadata` and query analysis tools to understand the query's structure and determine appropriate workshop stages.

3. **🔴 Generate AST/CFG Baseline (CRITICAL)**: Before any other analysis, run the tools queries against the workshop's test code and **verify non-empty output**:
   - Run `PrintAST.ql` → Confirm output contains AST node hierarchy
   - Run `PrintCFG.ql` → Confirm output contains `nodes` and `edges`
   - Run `CallGraphFrom.ql` / `CallGraphTo.ql` → Confirm call relationships (if applicable)
   - **FAIL VALIDATION** if any tools query returns empty or header-only output

4. **Prepare Workshop Environment**: Before running tests, ensure the workshop is ready:
   - Run `codeql pack install` in the solutions and solutions-tests directories to fetch dependencies
   - Check for initialization scripts (e.g., `initialize-qltests.sh`) that copy test files from `tests-common/` to test directories
   - Verify test source files exist in each test directory (e.g., `test.c`, `test.js`)

5. **Validate Existing Tests**: Run `codeql_test_run` on the source query's unit tests to confirm they pass before using them as workshop solutions.

6. **Create Workshop Structure**: Generate the complete workshop directory structure including:
   - `exercises/` - Incomplete query stubs for students
   - `solutions/` - Complete solutions (derived from source query)
   - `exercises-tests/` and `solutions-tests/` - Unit tests for each stage
   - `README.md` - Workshop instructions **including AST/CFG visualizations**

7. **Validate Workshop Outputs**: Run tests on the generated workshop to confirm:
   - All solution queries pass their tests
   - Exercise stubs compile (even if tests fail as expected)
   - CodeQL packs resolve dependencies correctly

8. **Report Results**: Provide a summary of which MCP tools were exercised, **AST/CFG output verification status**, and any issues encountered.

## Success Criteria

The validation succeeds when:

- [ ] **AST output is non-empty** with actual node data (not just headers)
- [ ] **CFG output contains nodes and edges** for control flow visualization
- [ ] **CallGraph queries return results** when test code contains function calls
- [ ] Workshop directory structure is created correctly
- [ ] All solution queries pass their unit tests
- [ ] Exercise queries compile without syntax errors
- [ ] CodeQL packs have valid `codeql-pack.yml` configurations
- [ ] Workshop `README.md` contains accurate instructions with AST/CFG examples
- [ ] No MCP tool errors occurred during the process

## Example Usage

```text
User: @workspace /validate-ql-mcp-server-tools-via-workshop server/ql/javascript/tools/src/PrintAST/PrintAST.ql

Agent: I'll validate the MCP server tools by creating a workshop from the PrintAST query...
```

## Troubleshooting

| Issue                        | Likely Cause                    | Resolution                                                          |
| ---------------------------- | ------------------------------- | ------------------------------------------------------------------- |
| **Empty AST output**         | Database not extracted properly | Re-run `codeql_test_extract` and verify test code is valid          |
| **Empty CFG output**         | No control flow in test code    | Ensure test code contains functions with branching/loops            |
| **Empty CallGraph**          | No function calls in test code  | Add function calls to test code or verify target function name      |
| Query not found              | Invalid path or missing file    | Verify the path exists and is a `.ql` or `.qlref` file              |
| Tests fail                   | Source query tests are broken   | Fix the source query tests before workshop creation                 |
| Pack resolution errors       | Missing dependencies            | Run `codeql pack install` in the source query's pack directory      |
| Tool timeout                 | Complex query or large database | Increase timeout or use a simpler query for validation              |
| **"Nothing to extract"**     | Missing test source files       | Run `initialize-qltests.sh` or copy test files from `tests-common/` |
| **External workshop access** | Workshop outside workspace      | Use terminal commands (`cat`, `ls`) to read external files          |

## Related Resources

- **Skill (AST/CFG Validation)**: [validate-ql-mcp-server-tools-queries](../../.github/skills/validate-ql-mcp-server-tools-queries/SKILL.md) - Core validation logic for tools queries
- **Skill (Workshop Creation)**: [create-codeql-query-development-workshop](../../.github/skills/create-codeql-query-development-workshop/SKILL.md) - Workshop structure and generation
- **Agent**: [mcp-enabled-ql-workshop-developer](../../.github/agents/mcp-enabled-ql-workshop-developer.md) - Orchestrates workshop creation with AST/CFG validation
- **Agent**: [ql-mcp-tool-tester](../../.github/agents/ql-mcp-tool-tester.md) - Tests MCP tools including tools query execution
- **MCP Server Docs**: [QL-MCP-SERVER.md](../../server/QL-MCP-SERVER.md)
