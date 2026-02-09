# CodeQL Development MCP Server — Public Installation Guide

> Install and run the CodeQL Development MCP Server and its tool query packs without cloning the repository.

## Overview

The **CodeQL Development MCP Server** (`@advanced-security/codeql-development-mcp-server`) is a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that provides AI assistants with tools, prompts, and resources for developing CodeQL queries. It is published as a public npm package and its companion CodeQL tool query packs are published to the GitHub Container Registry (GHCR).

Users install the server via `npm` and the tool query packs via `codeql pack download` — no repository clone required.

## Prerequisites

| Dependency                                                                                           | Minimum Version | Purpose                         |
| ---------------------------------------------------------------------------------------------------- | --------------- | ------------------------------- |
| [Node.js](https://nodejs.org/)                                                                       | v24.13.0        | Runtime for the MCP server      |
| [CodeQL CLI](https://github.com/github/codeql-cli-binaries/releases)                                 | Latest          | Query compilation and execution |
| [VS Code](https://code.visualstudio.com/) with [GitHub Copilot](https://github.com/features/copilot) | Latest          | IDE with MCP support            |

Verify prerequisites:

```bash
node --version   # >= v24.13.0
codeql --version # any recent release
```

## Installation

### 1. Install the MCP Server (npm)

The server is published as a scoped package on [GitHub Packages](https://github.com/advanced-security/codeql-development-mcp-server/pkgs/npm/codeql-development-mcp-server). Before installing, configure npm to fetch `@advanced-security` packages from GitHub Packages:

```bash
# One-time setup: route the @advanced-security scope to GitHub Packages
npm config set @advanced-security:registry https://npm.pkg.github.com

# Authenticate (requires a GitHub PAT with read:packages scope)
npm login --registry=https://npm.pkg.github.com
```

Then install:

```bash
# Global install (makes the `codeql-development-mcp-server` command available)
npm install -g @advanced-security/codeql-development-mcp-server

# Or run on-demand without installing globally
npx -y @advanced-security/codeql-development-mcp-server
```

The package ships the bundled server (`dist/codeql-development-mcp-server.js`), production dependencies, and the CodeQL tool query source packs (`ql/*/tools/src/`).

### 2. Install CodeQL Tool Query Packs (optional)

The server ships with embedded copies of its tool query packs. If you prefer to manage the packs independently, or want to pin a specific version, download them from GHCR:

```bash
# Download all tool query packs (one per supported language)
codeql pack download advanced-security/ql-mcp-actions-tools-src
codeql pack download advanced-security/ql-mcp-cpp-tools-src
codeql pack download advanced-security/ql-mcp-csharp-tools-src
codeql pack download advanced-security/ql-mcp-go-tools-src
codeql pack download advanced-security/ql-mcp-java-tools-src
codeql pack download advanced-security/ql-mcp-javascript-tools-src
codeql pack download advanced-security/ql-mcp-python-tools-src
codeql pack download advanced-security/ql-mcp-ruby-tools-src
codeql pack download advanced-security/ql-mcp-swift-tools-src
```

To pin a version, append `@<version>`:

```bash
codeql pack download advanced-security/ql-mcp-javascript-tools-src@2.24.0
```

Each tool query pack provides AST printing, control-flow graph printing, and call-graph queries used by the MCP server to give AI assistants structural insight into CodeQL databases.

## VS Code Configuration

Add the server to your VS Code MCP configuration (`mcp.json`):

| OS      | Default Location                                   |
| ------- | -------------------------------------------------- |
| macOS   | `~/Library/Application Support/Code/User/mcp.json` |
| Linux   | `~/.config/Code/User/mcp.json`                     |
| Windows | `%APPDATA%\Code\User\mcp.json`                     |

### Recommended: `npx` (no global install needed)

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

### Alternative: Global install

```json
{
  "servers": {
    "ql-mcp": {
      "command": "codeql-development-mcp-server",
      "type": "stdio"
    }
  }
}
```

### Alternative: Workspace-level configuration

Create a `.vscode/mcp.json` in your project root to share the configuration with your team:

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

## Environment Variables

| Variable         | Description                            | Default  |
| ---------------- | -------------------------------------- | -------- |
| `CODEQL_PATH`    | Absolute path to the CodeQL CLI binary | `codeql` |
| `TRANSPORT_MODE` | `stdio` or `http`                      | `stdio`  |
| `HTTP_PORT`      | HTTP port (when using `http`)          | `3000`   |
| `DEBUG`          | Enable debug logging                   | `false`  |

`CODEQL_PATH` is the most important variable. When set, the server uses the specified binary instead of looking for `codeql` on `PATH`. This lets you pin a specific CodeQL CLI version independently of what is installed globally:

```bash
# Example: point the server at a specific CodeQL installation
export CODEQL_PATH="$HOME/codeql-cli/codeql"
```

Or configure it directly in your `mcp.json`:

```json
{
  "servers": {
    "ql-mcp": {
      "command": "npx",
      "args": ["-y", "@advanced-security/codeql-development-mcp-server"],
      "type": "stdio",
      "env": {
        "CODEQL_PATH": "/path/to/codeql-cli/codeql"
      }
    }
  }
}
```

## Verification

1. Restart VS Code (or reload the window).
2. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
3. Run **MCP: List Servers**.
4. Confirm `ql-mcp` appears and shows a running status.
5. Open Copilot Chat in Agent Mode and ask: _"List available CodeQL tools."_

## Supported Languages

The MCP server includes tool query packs for the following CodeQL languages:

| Language              | CodeQL Identifier | Tool Query Pack (GHCR)                          |
| --------------------- | ----------------- | ----------------------------------------------- |
| GitHub Actions        | `actions`         | `advanced-security/ql-mcp-actions-tools-src`    |
| C/C++                 | `cpp`             | `advanced-security/ql-mcp-cpp-tools-src`        |
| C#                    | `csharp`          | `advanced-security/ql-mcp-csharp-tools-src`     |
| Go                    | `go`              | `advanced-security/ql-mcp-go-tools-src`         |
| Java/Kotlin           | `java`            | `advanced-security/ql-mcp-java-tools-src`       |
| JavaScript/TypeScript | `javascript`      | `advanced-security/ql-mcp-javascript-tools-src` |
| Python                | `python`          | `advanced-security/ql-mcp-python-tools-src`     |
| Ruby                  | `ruby`            | `advanced-security/ql-mcp-ruby-tools-src`       |
| Swift                 | `swift`           | `advanced-security/ql-mcp-swift-tools-src`      |

Each pack contains the following tool queries used by the server:

| Query Directory  | Purpose                                               |
| ---------------- | ----------------------------------------------------- |
| `PrintAST/`      | Print the Abstract Syntax Tree for a source file      |
| `PrintCFG/`      | Print the Control Flow Graph for a function or method |
| `CallGraphFrom/` | Find outgoing call-graph edges from a function        |
| `CallGraphTo/`   | Find incoming call-graph edges to a function          |

> **Note:** The `actions` language pack currently provides `PrintAST` and `PrintCFG` only. All other languages include all four query directories.

## Updating

### Update the MCP Server

```bash
# If installed globally
npm update -g @advanced-security/codeql-development-mcp-server

# If using npx, the latest version is fetched automatically
# (clear the npx cache to force a refresh)
npx -y @advanced-security/codeql-development-mcp-server@latest
```

### Update the Tool Query Packs

```bash
# Re-download to get the latest versions
codeql pack download advanced-security/ql-mcp-javascript-tools-src
```

The server and its tool query packs follow [Semantic Versioning](https://semver.org/). Their version numbers are kept in sync: when the server is at version `X.Y.Z`, each tool query pack is also published at version `X.Y.Z`.

## Package Details

### npm Package

| Field       | Value                                                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Name        | `@advanced-security/codeql-development-mcp-server`                                                                           |
| Registry    | [GitHub Packages](https://github.com/advanced-security/codeql-development-mcp-server/pkgs/npm/codeql-development-mcp-server) |
| Binary      | `codeql-development-mcp-server`                                                                                              |
| Entry Point | `dist/codeql-development-mcp-server.js`                                                                                      |
| License     | [GitHub CodeQL Terms and Conditions](https://github.com/github/codeql-cli-binaries/blob/main/LICENSE.md)                     |

### CodeQL Packs (GHCR)

Published to the GitHub Container Registry under the `advanced-security` scope. Each pack's `codeql-pack.yml` follows the `<scope>/<pack>` naming convention required for `codeql pack publish`:

```yaml
# Example: server/ql/javascript/tools/src/codeql-pack.yml
name: advanced-security/ql-mcp-javascript-tools-src
version: 2.24.0
library: false
dependencies:
  codeql/javascript-all: 2.6.20
```

## Troubleshooting

| Problem                      | Solution                                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| Server not listed in VS Code | Verify your `mcp.json` syntax, ensure Node.js is on PATH, and restart VS Code.                           |
| `npx` times out or fails     | Run `npm cache clean --force` and retry. Ensure `.npmrc` routes `@advanced-security` to GitHub Packages. |
| CodeQL CLI errors            | Run `codeql --version` to confirm the CLI is installed and on PATH. Set `CODEQL_PATH` if needed.         |
| Tool query pack not found    | Run `codeql pack download advanced-security/ql-mcp-<language>-tools-src` to fetch it from GHCR.          |
| Permission denied            | On macOS/Linux, check file permissions or use `sudo` for global npm installs.                            |
| Version mismatch warnings    | Ensure the server npm package version matches the tool query pack versions.                              |

## Further Reading

- [Tools Reference](./tools-reference.md) — Complete list of MCP tools and usage examples
- [Getting Started (developer)](./getting-started.md) — Building from source and advanced configuration
- [VS Code MCP Server Documentation](https://code.visualstudio.com/docs/copilot/customization/mcp-servers) — Configuring MCP servers in VS Code
- [Publishing and Using CodeQL Packs](https://docs.github.com/en/code-security/tutorials/customize-code-scanning/publishing-and-using-codeql-packs) — Managing CodeQL packs with the CodeQL CLI
- [Model Context Protocol](https://modelcontextprotocol.io/) — The MCP specification
