# VS Code Extension

The **CodeQL Development MCP Server** VS Code extension automates the setup and
configuration that the [manual installation](../getting-started.md) requires you
to do by hand.

## Why use the extension?

| Manual setup (`mcp.json`)                                | VS Code extension                                                   |
| -------------------------------------------------------- | ------------------------------------------------------------------- |
| Edit `mcp.json` with the correct paths                   | Registers the MCP server automatically                              |
| Run `codeql-development-mcp-server-setup-packs` yourself | Installs tool query packs on activation                             |
| Set `CODEQL_PATH` if CodeQL is not on `PATH`             | Discovers the CodeQL CLI from the CodeQL extension                  |
| No awareness of CodeQL databases or query history        | Discovers databases and query run results from the CodeQL extension |

## Installation

### From `.vsix` (GitHub Releases)

Download `codeql-development-mcp-server-vX.Y.Z.vsix` from the latest
[GitHub Release](https://github.com/advanced-security/codeql-development-mcp-server/releases),
then install:

```bash
code --install-extension codeql-development-mcp-server-vX.Y.Z.vsix
```

Or in VS Code: **Extensions** sidebar → `⋯` menu → **Install from VSIX…** → select the file.

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`)
3. Search **"CodeQL Development MCP Server"**
4. Click **Install**

### From Source

From the repository root:

```bash
npm run package:vsix
code --install-extension extensions/vscode/codeql-development-mcp-server-vX.Y.Z.vsix
```

The extension requires the [CodeQL extension](https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-codeql) (`GitHub.vscode-codeql`) and will prompt you to install it if missing.

## What it does

On activation the extension:

1. **Finds the CodeQL CLI** — checks `CODEQL_PATH`, `PATH`, and known install
   locations (including the CodeQL extension's managed CLI).
2. **Installs the MCP server** — downloads and caches the
   `codeql-development-mcp-server` npm package in the extension's global storage.
3. **Installs CodeQL tool query packs** — runs `codeql pack install` for each
   supported language so tools like PrintAST and CallGraph work immediately.
4. **Registers the MCP server** — provides a
   `McpServerDefinitionProvider` so VS Code discovers the server without any
   `mcp.json` edits.
5. **Bridges the CodeQL extension** — watches for databases and query results
   created by the CodeQL extension and passes their locations to the MCP server
   via environment variables:
   - `CODEQL_ADDITIONAL_PACKS` — workspace folders and vscode-codeql database storage
   - `CODEQL_DATABASES_BASE_DIRS` — vscode-codeql database storage directory
     (enables `list_codeql_databases`)
   - `CODEQL_QUERY_RUN_RESULTS_DIRS` — vscode-codeql query result directories
     (enables `list_query_run_results` and `profile_codeql_query_from_logs`)
   - `CODEQL_MRVA_RUN_RESULTS_DIRS` — vscode-codeql variant analysis result
     directories (enables `list_mrva_run_results`)

## Settings

| Setting                           | Default    | Description                                                    |
| --------------------------------- | ---------- | -------------------------------------------------------------- |
| `codeql-mcp.autoInstall`          | `true`     | Automatically install/update the MCP server on activation      |
| `codeql-mcp.serverVersion`        | `"latest"` | npm version to install (`"latest"` or a specific version)      |
| `codeql-mcp.serverCommand`        | `"node"`   | Command to launch the MCP server (override for local dev)      |
| `codeql-mcp.watchCodeqlExtension` | `true`     | Discover databases and query results from the CodeQL extension |
| `codeql-mcp.additionalEnv`        | `{}`       | Extra environment variables for the MCP server process         |

## Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and type **CodeQL MCP**:

- **Reinstall MCP Server** — re-download the MCP server package
- **Reinstall CodeQL Tool Query Packs** — re-run `codeql pack install` for all languages
- **Show Status** — display current server and CLI status

## How it connects to GitHub Copilot

Once the extension is active, the MCP server appears in Copilot's server list
(Command Palette → "GitHub Copilot: List MCP Servers"). All MCP tools, prompts,
and resources are available to Copilot automatically — no further configuration needed.
