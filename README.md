# CodeQL Development MCP Server

> Enabling AI-assisted CodeQL query development through the Model Context Protocol

A comprehensive [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server designed specifically for agentic AI development of CodeQL (QL) code. This server provides tools, prompts, and resources to help AI assistants write, validate, and optimize CodeQL queries for security analysis and code quality.

## Features

- **Comprehensive Tool Suite** - Wraps CodeQL CLI commands for query compilation, execution, testing, and database operations
- **Multi-Language Support** - Supports CodeQL query development for 9 languages including Python, JavaScript, Java, C/C++, and more
- **AI-Optimized Prompts** - Built-in prompts and resources that guide AI assistants through CodeQL development workflows
- **Test-Driven Development** - Integrated testing tools for validating query accuracy with expected results
- **Flexible Transport** - Supports both stdio and HTTP transport modes for different integration scenarios

## Supported Code Languages

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

## Limitations

- Requires matching version of the CodeQL CLI to be installed separately.
- Only a subset of CodeQL CLI features are exposed as tools.
- Performance depends on the size of CodeQL databases being analyzed.

## Alternative CodeQL MCP Servers

This project is partially inspired by [`JordyZomer/codeql-mcp`](https://github.com/JordyZomer/codeql-mcp) -- which remains a great alternative to `codeql-development-mcp-server`.

Another alternative is the [CodeQL MCP server bundled with GitHubSecurityLab/seclab-taskflow-agent](https://github.com/GitHubSecurityLab/seclab-taskflow-agent/tree/main/src/seclab_taskflow_agent/mcp_servers/codeql). The `CallGraphFrom` and `CallGraphTo` queries provided by this repository were inspired by the [`GitHubSecurityLab/seclab-taskflow-agent`](https://github.com/GitHubSecurityLab/seclab-taskflow-agent).

## Documentation

- [Public Installation Guide](docs/public.md) - Install and run without cloning the repository
- [Getting Started Guide](docs/getting-started.md) - Detailed installation and setup instructions
- [Tools Reference](docs/ql-mcp/tools.md) - Complete list of available MCP tools
- [Prompts Reference](docs/ql-mcp/prompts.md) - MCP prompts for CodeQL development workflows
- [Resources Reference](docs/ql-mcp/resources.md) - MCP resources for CodeQL learning and reference
- [Testing Strategy](docs/testing.md) - Multi-layer testing approach

## Project Status

**Active Development** - This project is actively maintained and used in production environments for AI-assisted CodeQL development.

## Background

The `codeql-development-mcp-server` project is maintained by GitHub's CodeQL Expert Services team and builds (and hopefully improves) on the concepts from the [`advanced-security/codeql-development-template`](https://github.com/advanced-security/codeql-development-template) repository template.

The main advantages of using the `codeql-development-mcp-server` are:

1. **Agnostic of development environment**
2. **Agnostic of calling Large Language Model (LLM)**
3. **MCP server tools codify advanced CodeQL development practices**

### Roadmap

Development priorities and open issues are tracked in [GitHub Issues](https://github.com/advanced-security/codeql-development-mcp-server/issues).

### Contributing

We welcome contributions! Whether it's bug fixes, new features, documentation improvements, or additional language support, please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## Requirements

### Environment

- **Node.js** v24.13.0 or later ([nodejs.org](https://nodejs.org/))
- **Some calling LLM** Bring your own LLM, but some LLMs are (much) better than others.

### External Dependencies

- **CodeQL CLI** - Must be installed and available in PATH ([github.com/github/codeql-cli-binaries](https://github.com/github/codeql-cli-binaries/releases))

## Quick Start

### Install via npm (recommended)

No repository clone needed — install from [GitHub Packages](https://github.com/advanced-security/codeql-development-mcp-server/pkgs/npm/codeql-development-mcp-server):

```bash
# One-time: route @advanced-security scope to GitHub Packages and authenticate
npm config set @advanced-security:registry https://npm.pkg.github.com
npm login --registry=https://npm.pkg.github.com

# Install globally
npm install -g @advanced-security/codeql-development-mcp-server
```

Or run on-demand without installing globally:

```bash
npx -y @advanced-security/codeql-development-mcp-server
```

### VS Code Configuration

Add to your `mcp.json` file:

| OS      | Location                                           |
| ------- | -------------------------------------------------- |
| Linux   | `~/.config/Code/User/mcp.json`                     |
| macOS   | `~/Library/Application Support/Code/User/mcp.json` |
| Windows | `%APPDATA%\Code\User\mcp.json`                     |

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

### Install from GitHub Release archive

1. Download the latest release from [GitHub Releases](https://github.com/advanced-security/codeql-development-mcp-server/releases)
2. Extract the archive:

```bash
tar -xzf codeql-development-mcp-server-vX.X.X.tar.gz -C /path/to/destination
```

### Installing from Source

```bash
git clone https://github.com/advanced-security/codeql-development-mcp-server.git
cd codeql-development-mcp-server
npm install && npm run build
```

### Verification

1. Restart VS Code
2. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
3. Run "GitHub Copilot: List MCP Servers"
4. Confirm `ql-mcp` appears

## License

This project is licensed under the terms of the GitHub CodeQL Terms and Conditions. Please refer to [LICENSE](LICENSE) for the full terms.

## Maintainers

This repository is maintained by the team specified in [CODEOWNERS](CODEOWNERS).

## Support

This project uses GitHub issues to track bugs and feature requests. Please search existing issues before filing new ones to avoid duplicates.

This project comes with no expectation or guarantee of support, with more details in the [SUPPORT.md](SUPPORT.md) document.

## Acknowledgement

This project builds upon the [CodeQL CLI](https://github.com/github/codeql-cli-binaries) and the broader [CodeQL ecosystem](https://codeql.github.com/) developed by GitHub. Special thanks to the GitHub Advanced Security team and the open-source community for their contributions.
