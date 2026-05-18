# CodeQL Development MCP Server — VS Code Extension

A VS Code extension that automatically installs, configures, and manages the [CodeQL Development MCP Server](https://github.com/advanced-security/codeql-development-mcp-server). It bridges the [`GitHub.vscode-codeql`](https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-codeql) extension with AI assistants by exposing CodeQL databases, query results, and MRVA results to the MCP server.

## Prerequisites

- **VS Code** `^1.115.0`
- **Node.js** `>=25.6.0`
- **[CodeQL for VS Code](https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-codeql)** — declared as an `extensionDependency` and must be installed first.

## Installation

### From `.vsix`

```bash
code --install-extension codeql-development-mcp-server-vX.Y.Z.vsix
```

Or in VS Code: **Extensions** sidebar → `⋯` menu → **Install from VSIX…** → select the file.

### From Source

```bash
cd extensions/vscode
npm run package
code --install-extension codeql-development-mcp-server-vX.Y.Z.vsix
```

## What It Does

On activation (`onStartupFinished`), the extension:

1. **Auto-installs** the `codeql-development-mcp-server` npm package (unless `codeql-mcp.autoInstall` is `false`).
2. **Registers an MCP server definition** (`ql-mcp`) so VS Code's Copilot/MCP integration can discover and launch it.
3. **Watches** the CodeQL extension's storage paths for databases, query results, and MRVA results, passing them to the MCP server as environment variables.
4. **Registers built-in custom agents** (`codeql-query-developer`, `codeql-workshop-author`) in `chat.agentFilesLocations` so they are discoverable in VS Code Copilot Chat.

## Built-in Custom Agents

The extension ships two portable `.agent.md` custom agents that appear in VS Code's Copilot Chat agent picker:

| Agent | Description |
| ----- | ----------- |
| `codeql-query-developer` | Develop CodeQL queries, libraries, and tests using TDD with the `ql-mcp` MCP server tools. |
| `codeql-workshop-author` | Create CodeQL query development workshops from production-grade queries. |

Both agents use the bundled MCP server tools (`ql-mcp/*`), prompts, and skills that ship with the extension. **No specific model is required** — you choose your own model in VS Code Copilot Chat.

### Enabling / Disabling the Built-in Agents

Agents are enabled by default. To disable them, set:

```json
"codeql-mcp.agents.enabled": false
```

This removes the bundled `agents/` directory from `chat.agentFilesLocations` so the agents are no longer discoverable in Copilot Chat.

### Extending at Runtime — Additional Agent Directories

To add team or personal `.agent.md` files without rebuilding the extension, use:

```json
"codeql-mcp.additionalAgentDirs": ["/path/to/your/team-agents"]
```

This appends the directory to `chat.agentFilesLocations` alongside the bundled agents.

### Extending at Build Time — Custom VSIX

To bundle your own agents, prompts, and skills into a custom VSIX:

```bash
cd extensions/vscode
npm run bundle:customizations -- --customizations-dir=./examples/team-customizations
npm run package
```

Or via environment variable:

```bash
CODEQL_MCP_CUSTOMIZATIONS_DIR=./examples/team-customizations npm run bundle:customizations
```

See [`examples/team-customizations/`](./examples/team-customizations/README.md) for a complete overlay example.

## Configuration

All settings are under the `codeql-mcp` namespace in VS Code settings:

| Setting                                    | Default    | Description                                                         |
| ------------------------------------------ | ---------- | ------------------------------------------------------------------- |
| `codeql-mcp.agents.enabled`                | `true`     | Register the bundled custom agents in `chat.agentFilesLocations`.   |
| `codeql-mcp.additionalAgentDirs`           | `[]`       | Additional `.agent.md` directories appended to `chat.agentFilesLocations`. |
| `codeql-mcp.autoInstall`                   | `true`     | Auto-install/update the MCP server on activation.                   |
| `codeql-mcp.serverVersion`                 | `"latest"` | npm version to install (`"latest"` for most recent).                |
| `codeql-mcp.serverCommand`                 | `"node"`   | Command to launch the server. Override to `"npx"` or a custom path. |
| `codeql-mcp.serverArgs`                    | `[]`       | Custom args. When empty, the bundled entry point is used.           |
| `codeql-mcp.watchCodeqlExtension`          | `true`     | Watch for databases and results from the CodeQL extension.          |
| `codeql-mcp.enableAnnotationTools`         | `true`     | Enable annotation, audit, and cache tools.                          |
| `codeql-mcp.additionalEnv`                 | `{}`       | Extra environment variables passed to the server process.           |
| `codeql-mcp.additionalDatabaseDirs`        | `[]`       | Additional directories to search for CodeQL databases.              |
| `codeql-mcp.additionalMrvaRunResultsDirs`  | `[]`       | Additional directories containing MRVA run results.                 |
| `codeql-mcp.additionalQueryRunResultsDirs` | `[]`       | Additional directories containing query run results.                |

## Commands

Available from the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`):

| Command                                                  | Description                                     |
| -------------------------------------------------------- | ----------------------------------------------- |
| **CodeQL MCP: Reinstall MCP Server**                     | Re-download and install the server package.     |
| **CodeQL MCP: Reinstall CodeQL Tool Query Packs**        | Re-install the bundled CodeQL tool query packs. |
| **CodeQL MCP: Show Built-in Custom Agents Status**       | Show which agent dirs are registered.           |
| **CodeQL MCP: Show Status**                              | Display current server status.                  |
| **CodeQL MCP: Show Logs**                                | Open the server log output.                     |

## Development

### npm Scripts

| Script                         | What it does                                                                                                                                                        | When to use                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `npm run package`              | **Builds everything and produces the `.vsix`**. Internally runs `vscode:prepublish` (clean → lint → bundle → bundle:server → bundle:customizations) then `vsce package`. | **Building a distributable `.vsix`.** |
| `npm run build`                | `clean` → `lint` → `bundle` (extension only, no server or customizations).                                                                                          | Development builds without packaging. |
| `npm run bundle`               | esbuild the extension (no lint, no clean).                                                                                                                           | Fast iteration during development.    |
| `npm run bundle:customizations`| Copy bundled agents/prompts/skills to output dirs and write the manifest.                                                                                            | After modifying agent/prompt/skill sources. |
| `npm run watch`                | Rebuild the extension on file changes.                                                                                                                               | Active development.                   |
| `npm run test`                 | Run unit tests with Vitest.                                                                                                                                          | Validating changes.                   |
| `npm run test:coverage`        | Run unit tests with coverage.                                                                                                                                        | CI / pre-merge validation.            |
| `npm run lint`                 | Run ESLint on `src/` and `test/`.                                                                                                                                    | Checking code style.                  |

> **Note:** `vscode:prepublish` is a lifecycle hook invoked automatically by `vsce package` — you should not need to run it directly.

### Project Structure

```text
extensions/vscode/
├── src/
│   ├── extension.ts          # Extension entry point (activate/deactivate)
│   ├── bridge/               # Watches CodeQL extension storage paths
│   ├── codeql/               # CodeQL CLI resolution
│   ├── common/               # Shared utilities
│   └── server/               # MCP server lifecycle management
├── test/                     # Vitest unit tests
├── esbuild.config.js         # Extension bundler config
├── scripts/bundle-server.js  # Copies MCP server into the extension
└── package.json
```
