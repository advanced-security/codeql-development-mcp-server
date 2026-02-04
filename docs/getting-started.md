# Getting Started

This guide covers installation, configuration, and usage of the CodeQL Development MCP Server.

## Prerequisites

- **Node.js** v25.2.1 or later ([nodejs.org](https://nodejs.org/))
- **CodeQL CLI** ([github.com/github/codeql-cli-binaries](https://github.com/github/codeql-cli-binaries/releases))
- **VS Code** with GitHub Copilot extension

## Installation

### From GitHub Releases

1. Download the latest release from [Releases](https://github.com/advanced-security/codeql-development-mcp-server/releases)
2. Extract: `tar -xzvf codeql-development-mcp-server-vX.X.X.tar.gz -C /path/to/destination`

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

```json
{
  "servers": {
    "codeql-dev-mcp-server": {
      "command": "node",
      "args": ["/path/to/destination/server/dist/ql-mcp-server.js"],
      "type": "stdio"
    }
  }
}
```

## Environment Variables

| Variable         | Description          | Default |
| ---------------- | -------------------- | ------- |
| `TRANSPORT_MODE` | `stdio` or `http`    | `stdio` |
| `PORT`           | HTTP port            | `3000`  |
| `DEBUG`          | Enable debug logging | `false` |
| `CODEQL_PATH`    | Path to CodeQL CLI   | (PATH)  |

## Verification

1. Restart VS Code
2. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Run "GitHub Copilot: List MCP Servers"
4. Confirm `codeql-dev-mcp-server` appears

## Troubleshooting

- **Server not listed**: Verify absolute path in `mcp.json`, restart VS Code
- **CodeQL errors**: Run `codeql --version` to confirm CLI is installed
- **Permission denied**: Check file permissions on server directory

## Next Steps

- [Tools Reference](./tools-reference.md) - Available MCP tools and usage
