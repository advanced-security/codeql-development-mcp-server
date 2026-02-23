# Getting Started

This guide covers installation, configuration, and usage of the CodeQL Development MCP Server.

## Prerequisites

- **Node.js** v24.13.0 or later ([nodejs.org](https://nodejs.org/))
- **CodeQL CLI** ([github.com/github/codeql-cli-binaries](https://github.com/github/codeql-cli-binaries/releases))
- **VS Code** with GitHub Copilot extension

## Installation

### VS Code Extension (recommended)

The easiest and recommended way to get started is the **VS Code extension** (VSIX
archive bundle), which automates installation, configuration, and CodeQL CLI
discovery. Download the `.vsix` from
[GitHub Releases](https://github.com/advanced-security/codeql-development-mcp-server/releases)
and install it in VS Code via `Extensions: Install from VSIX…` in the Command
Palette, or build from source (`npm run package:vsix` at the repository root).
See the [VS Code Extension guide](./vscode/extension.md) for details.

### From npm

The package is published to the [public npm registry](https://www.npmjs.com/package/codeql-development-mcp-server). No authentication or special configuration is needed:

```bash
# Install globally
npm install -g codeql-development-mcp-server

# Install CodeQL pack dependencies (required on first use)
codeql-development-mcp-server-setup-packs
```

> **Note (Windows):** The `codeql-development-mcp-server-setup-packs` command
> requires a Bash-compatible shell (e.g., Git Bash or WSL). On Windows without
> Bash, run `setup-packs.sh` directly from the package's `scripts/` directory.

Or use `npx` to run without a global install:

```bash
npx -y codeql-development-mcp-server
```

> **Note:** The npm package bundles the tool query source packs (`.ql` files and lock files), but their CodeQL library dependencies (e.g., `codeql/javascript-all`) must be fetched from GHCR on first use. Run `codeql-development-mcp-server-setup-packs` once after installing to download them (`~/.codeql/packages/`). If you skip this step, the `codeql_pack_install` MCP tool can install dependencies on demand for individual packs.

### From GitHub Releases

1. Download the latest release from [Releases](https://github.com/advanced-security/codeql-development-mcp-server/releases)
2. Extract: `tar -xzf codeql-development-mcp-server-vX.X.X.tar.gz -C /path/to/destination`

### From Source

```bash
git clone --recurse-submodules https://github.com/advanced-security/codeql-development-mcp-server.git
cd codeql-development-mcp-server
npm install && npm run build
```

## VS Code Configuration

Add to your `mcp.json` file:

| OS      | Location                                           |
| ------- | -------------------------------------------------- |
| macOS   | `~/Library/Application Support/Code/User/mcp.json` |
| Windows | `%APPDATA%\Code\User\mcp.json`                     |
| Linux   | `~/.config/Code/User/mcp.json`                     |

### Using npx (recommended)

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

### Using a local path (from source or release archive)

```json
{
  "servers": {
    "ql-mcp": {
      "command": "node",
      "args": ["/path/to/destination/server/dist/codeql-development-mcp-server.js"],
      "type": "stdio"
    }
  }
}
```

## Environment Variables

| Variable                        | Description                                                                | Default  |
| ------------------------------- | -------------------------------------------------------------------------- | -------- |
| `CODEQL_PATH`                   | Absolute path to the CodeQL CLI binary                                     | `codeql` |
| `TRANSPORT_MODE`                | `stdio` or `http`                                                          | `stdio`  |
| `HTTP_PORT`                     | HTTP port                                                                  | `3000`   |
| `DEBUG`                         | Enable debug logging                                                       | `false`  |
| `CODEQL_DATABASES_BASE_DIRS`    | Colon-separated directories to search for CodeQL databases                 | —        |
| `CODEQL_QUERY_RUN_RESULTS_DIRS` | Colon-separated directories containing per-run query result subdirectories | —        |
| `CODEQL_MRVA_RUN_RESULTS_DIRS`  | Colon-separated directories containing MRVA run result subdirectories      | —        |

## Verification

1. Restart VS Code
2. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Run "GitHub Copilot: List MCP Servers"
4. Confirm `ql-mcp` appears

## Troubleshooting

- **Tool query errors (e.g., PrintAST fails)**: Run `codeql-development-mcp-server-setup-packs` to install CodeQL pack dependencies
- **Server not listed**: Verify absolute path in `mcp.json`, restart VS Code
- **CodeQL errors**: Run `codeql --version` to confirm CLI is installed
- **Permission denied**: Check file permissions on server directory

## Next Steps

- [Tools Reference](./ql-mcp/tools.md) - Available MCP tools
- [Prompts Reference](./ql-mcp/prompts.md) - MCP prompts for CodeQL workflows
- [Resources Reference](./ql-mcp/resources.md) - MCP resources for CodeQL learning
