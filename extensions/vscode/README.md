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
4. **Contributes built-in custom agents and skills** (`ql-mcp-ext-query-developer`, `ql-mcp-ext-workshop-author`, plus two skills) declaratively via `contributes.chatAgents` and `contributes.chatSkills` in the extension manifest, so they are discoverable in VS Code Copilot Chat. Workflow prompts come from the `ql-mcp` MCP server, not the VSIX.

## Built-in Custom Agents

The extension ships two portable `.agent.md` custom agents that appear in VS Code's Copilot Chat agent picker:

| Agent                        | Description                                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------ |
| `ql-mcp-ext-query-developer` | Develop CodeQL queries, libraries, and tests using TDD with the `ql-mcp` MCP server tools. |
| `ql-mcp-ext-workshop-author` | Create CodeQL query development workshops from production-grade queries.                   |

Both agents use the bundled MCP server tools (`ql-mcp/*`) and skills that ship with the extension. **No specific model is required** — you choose your own model in VS Code Copilot Chat.

Workflow prompts are not bundled in the VSIX; they are served by the `ql-mcp` MCP server (via `prompts/list`) and surfaced by Copilot Chat as slash commands such as `/ql_tdd_basic`, `/explain_codeql_query`, `/document_codeql_query`, and `/workshop_creation_workflow`. Each shipped agent's "MCP Prompts" section lists the slash IDs it works with. Start the MCP server (auto-installed on activation) to use them.

The agents are contributed declaratively via the `contributes.chatAgents` field in [`package.json`](./package.json); the bundled `.agent.md` files live under `agents/` inside the installed VSIX.

### Adding Your Own Agents at Runtime

VS Code's [`chat.agentFilesLocations`](https://code.visualstudio.com/docs/copilot/customization/custom-agents) setting accepts **workspace-relative** paths (e.g. `.github/agents`, `~/.copilot/agents`). Absolute paths are rejected by VS Code, so the extension does not write to that setting on your behalf — add your own personal or team agent directories there directly.

### Extending at Build Time — Custom VSIX

To override the bundled defaults (or add brand-new agents/prompts/skills — see the limitation below) in a custom VSIX build:

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

#### What the build-time overlay can and cannot do

VS Code resolves chat customizations declared in the extension manifest (`contributes.chatAgents`, `contributes.chatPromptFiles`, `contributes.chatSkills`), and the bundler does **not** rewrite `package.json` for you. As a result:

- **Overriding the bundled defaults works out of the box.** An overlay file at `customizations-dir/agents/ql-mcp-ext-query-developer.agent.md` replaces the corresponding bundled file with a collision warning. The contribution entry already in `package.json` continues to point at the same path, so the override is picked up automatically.
- **Adding supporting files under an already-contributed skill works out of the box.** Any new file under `customizations-dir/skills/<bundled-skill-name>/…` is copied alongside the bundled `SKILL.md` and resolvable via relative links from that `SKILL.md`.
- **Adding a brand-new agent, prompt, or skill that is not already in `package.json` requires a manifest patch.** Drop the overlay file into `customizations-dir/{agents,prompts,skills}/` as usual, then add a matching entry to `extensions/vscode/package.json` under `contributes.chatAgents` (or `chatPromptFiles` / `chatSkills`) pointing at the bundled path. VS Code only registers contributions listed in the manifest, so net-new files that are bundled but not contributed will end up shipped inside the VSIX without being discoverable. The [`examples/team-customizations/`](./examples/team-customizations/README.md) overlay illustrates the file-layout side; the manifest entry is the additional step you must perform for net-new content.

## Configuration

All settings are under the `codeql-mcp` namespace in VS Code settings:

| Setting                                    | Default    | Description                                                         |
| ------------------------------------------ | ---------- | ------------------------------------------------------------------- |
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

| Command                                            | Description                                     |
| -------------------------------------------------- | ----------------------------------------------- |
| **CodeQL MCP: Reinstall MCP Server**               | Re-download and install the server package.     |
| **CodeQL MCP: Reinstall CodeQL Tool Query Packs**  | Re-install the bundled CodeQL tool query packs. |
| **CodeQL MCP: Show Built-in Custom Agents Status** | Show which agent dirs are registered.           |
| **CodeQL MCP: Show Status**                        | Display current server status.                  |
| **CodeQL MCP: Show Logs**                          | Open the server log output.                     |

## Development

### npm Scripts

| Script                          | What it does                                                                                                                                                             | When to use                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| `npm run package`               | **Builds everything and produces the `.vsix`**. Internally runs `vscode:prepublish` (clean → lint → bundle → bundle:server → bundle:customizations) then `vsce package`. | **Building a distributable `.vsix`.**       |
| `npm run build`                 | `clean` → `lint` → `bundle` (extension only, no server or customizations).                                                                                               | Development builds without packaging.       |
| `npm run bundle`                | esbuild the extension (no lint, no clean).                                                                                                                               | Fast iteration during development.          |
| `npm run bundle:customizations` | Copy bundled agents/prompts/skills to output dirs and write the manifest.                                                                                                | After modifying agent/prompt/skill sources. |
| `npm run watch`                 | Rebuild the extension on file changes.                                                                                                                                   | Active development.                         |
| `npm run test`                  | Run unit tests with Vitest.                                                                                                                                              | Validating changes.                         |
| `npm run test:coverage`         | Run unit tests with coverage.                                                                                                                                            | CI / pre-merge validation.                  |
| `npm run lint`                  | Run ESLint on `src/` and `test/`.                                                                                                                                        | Checking code style.                        |

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
