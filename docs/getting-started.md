# Getting Started

This guide covers installation, configuration, and usage of the CodeQL Development MCP Server.

## Prerequisites

- **Node.js** v24.13.0 or later ([nodejs.org](https://nodejs.org/))
- **CodeQL CLI** ([github.com/github/codeql-cli-binaries](https://github.com/github/codeql-cli-binaries/releases))
- **VS Code** with GitHub Copilot extension

## Installation

### From npm (recommended)

The package is published to [GitHub Packages](https://github.com/advanced-security/codeql-development-mcp-server/pkgs/npm/codeql-development-mcp-server). Configure npm once, then install:

```bash
# One-time: route @advanced-security scope to GitHub Packages and authenticate
npm config set @advanced-security:registry https://npm.pkg.github.com
npm login --registry=https://npm.pkg.github.com

# Install globally
npm install -g @advanced-security/codeql-development-mcp-server
```

Or use `npx` to run without a global install:

```bash
npx -y @advanced-security/codeql-development-mcp-server
```

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
      "args": ["-y", "@advanced-security/codeql-development-mcp-server"],
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

| Variable         | Description                            | Default  |
| ---------------- | -------------------------------------- | -------- |
| `CODEQL_PATH`    | Absolute path to the CodeQL CLI binary | `codeql` |
| `TRANSPORT_MODE` | `stdio` or `http`                      | `stdio`  |
| `HTTP_PORT`      | HTTP port                              | `3000`   |
| `DEBUG`          | Enable debug logging                   | `false`  |

## Verification

1. Restart VS Code
2. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Run "GitHub Copilot: List MCP Servers"
4. Confirm `ql-mcp` appears

## Troubleshooting

- **Server not listed**: Verify absolute path in `mcp.json`, restart VS Code
- **CodeQL errors**: Run `codeql --version` to confirm CLI is installed
- **Permission denied**: Check file permissions on server directory

## Next Steps

- [Tools Reference](./ql-mcp/tools.md) - Available MCP tools
- [Prompts Reference](./ql-mcp/prompts.md) - MCP prompts for CodeQL workflows
- [Resources Reference](./ql-mcp/resources.md) - MCP resources for CodeQL learning
