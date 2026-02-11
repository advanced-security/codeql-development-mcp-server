# codeql-development-mcp-server

> An [MCP](https://modelcontextprotocol.io/) server for AI-assisted CodeQL query development — providing tools, prompts, and resources for writing, testing, and optimizing CodeQL queries.

## Quick Start

### Prerequisites

- **Node.js** v24.13.0+ ([nodejs.org](https://nodejs.org/))
- **CodeQL CLI** ([github.com/github/codeql-cli-binaries](https://github.com/github/codeql-cli-binaries/releases))
- **VS Code** with GitHub Copilot extension (only required for this "Quick Start" guide)

### Install and configure

1. Add to your VS Code `mcp.json`:

   | OS      | Location                                           |
   | ------- | -------------------------------------------------- |
   | macOS   | `~/Library/Application Support/Code/User/mcp.json` |
   | Windows | `%APPDATA%\Code\User\mcp.json`                     |
   | Linux   | `~/.config/Code/User/mcp.json`                     |

   ```json
   {
     "servers": {
       "ql-mcp": {
         "command": "npx",
         "args": ["-y", "codeql-development-mcp-server"],
         "type": "stdio"
       }
     }
   }
   ```

2. Install CodeQL pack dependencies:

   ```bash
   npm install -g codeql-development-mcp-server
   codeql-development-mcp-server-setup-packs
   ```

   > **Windows:** The setup-packs command requires a Bash-compatible shell (e.g., Git Bash or WSL).

3. Open Command Palette in VS Code → **"MCP: List MCP Servers"** → confirm `ql-mcp` appears. Use the options available via "MCP: List MCP Servers" to start, stop, restart, and/or reconfigure the `ql-mcp` server in VS Code.

See the [Getting Started Guide](https://github.com/advanced-security/codeql-development-mcp-server/blob/main/docs/getting-started.md) for detailed instructions and alternative installation methods.

## What's Included

### 34 Tools

Wraps the full CodeQL development lifecycle as MCP tools:

| Category              | Tools                                                                                                             |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Query execution**   | `codeql_query_run`, `codeql_query_compile`, `codeql_database_analyze`, `codeql_database_create`                   |
| **Testing**           | `codeql_test_run`, `codeql_test_extract`, `codeql_test_accept`                                                    |
| **BQRS results**      | `codeql_bqrs_decode`, `codeql_bqrs_info`, `codeql_bqrs_interpret`                                                 |
| **Pack management**   | `codeql_pack_install`, `codeql_pack_ls`                                                                           |
| **Code navigation**   | `codeql_lsp_completion`, `codeql_lsp_definition`, `codeql_lsp_diagnostics`, `codeql_lsp_references`               |
| **Query scaffolding** | `create_codeql_query`, `find_codeql_query_files`, `validate_codeql_query`, `quick_evaluate`                       |
| **Profiling**         | `profile_codeql_query`, `codeql_generate_log-summary`                                                             |
| **Resolution**        | `codeql_resolve_database`, `codeql_resolve_languages`, `codeql_resolve_queries`, `codeql_resolve_tests`, and more |

Full reference: [Tools](https://github.com/advanced-security/codeql-development-mcp-server/blob/main/docs/ql-mcp/tools.md)

### 10 Prompts

Guided workflows for common CodeQL development tasks:

| Prompt                         | Description                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------- |
| `test_driven_development`      | End-to-end TDD workflow for CodeQL queries                                      |
| `ql_tdd_basic`                 | Write tests first, implement query, iterate until tests pass                    |
| `ql_tdd_advanced`              | TDD with AST visualization, control flow, and call graph analysis               |
| `tools_query_workflow`         | Use PrintAST, PrintCFG, CallGraphFrom, CallGraphTo to understand code structure |
| `ql_lsp_iterative_development` | Interactive development with LSP completions, navigation, and diagnostics       |
| `sarif_rank_false_positives`   | Identify likely false positives in query results                                |
| `sarif_rank_true_positives`    | Identify likely true positives in query results                                 |
| `explain_codeql_query`         | Generate explanations and Mermaid evaluation diagrams                           |
| `document_codeql_query`        | Generate standardized markdown documentation for a query                        |
| `workshop_creation_workflow`   | Create multi-exercise workshops for teaching CodeQL query development           |

Full reference: [Prompts](https://github.com/advanced-security/codeql-development-mcp-server/blob/main/docs/ql-mcp/prompts.md)

### Resources

Static learning materials and per-language references served to AI assistants:

- **CodeQL Getting Started** / **Query Basics** — Introductory guides
- **Security Templates** / **Performance Patterns** — Ready-to-use templates and best practices
- **Language AST References** — For actions, cpp, csharp, go, java, javascript, python, ql, ruby
- **Language Security Patterns** — For cpp, csharp, go, javascript, python

Full reference: [Resources](https://github.com/advanced-security/codeql-development-mcp-server/blob/main/docs/ql-mcp/resources.md)

## Supported Languages

| Language              | CodeQL Identifier |
| --------------------- | ----------------- |
| GitHub Actions        | `actions`         |
| C/C++                 | `cpp`             |
| C#                    | `csharp`          |
| Go                    | `go`              |
| Java/Kotlin           | `java`            |
| JavaScript/TypeScript | `javascript`      |
| Python                | `python`          |
| Ruby                  | `ruby`            |
| Swift                 | `swift`           |

## Configuration

| Variable         | Description                            | Default  |
| ---------------- | -------------------------------------- | -------- |
| `CODEQL_PATH`    | Absolute path to the CodeQL CLI binary | `codeql` |
| `TRANSPORT_MODE` | `stdio` or `http`                      | `stdio`  |
| `HTTP_PORT`      | HTTP port (when using HTTP mode)       | `3000`   |
| `DEBUG`          | Enable debug logging                   | `false`  |

## Troubleshooting

- **Tool query errors (e.g., PrintAST fails):** Run `codeql-development-mcp-server-setup-packs` to install CodeQL pack dependencies
- **Server not listed in VS Code:** Verify `mcp.json` configuration, restart VS Code
- **CodeQL errors:** Run `codeql --version` to confirm CLI is installed and in PATH
- **Permission denied:** Check file permissions on the package directory

## Documentation

- [Getting Started Guide](https://github.com/advanced-security/codeql-development-mcp-server/blob/main/docs/getting-started.md)
- [Tools Reference](https://github.com/advanced-security/codeql-development-mcp-server/blob/main/docs/ql-mcp/tools.md)
- [Prompts Reference](https://github.com/advanced-security/codeql-development-mcp-server/blob/main/docs/ql-mcp/prompts.md)
- [Resources Reference](https://github.com/advanced-security/codeql-development-mcp-server/blob/main/docs/ql-mcp/resources.md)

## License

See [LICENSE](https://github.com/advanced-security/codeql-development-mcp-server/blob/main/LICENSE).
