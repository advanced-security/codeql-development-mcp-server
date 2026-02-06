# CodeQL Development MCP Server

> Enabling AI-assisted CodeQL query development through the Model Context Protocol

A comprehensive [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server designed specifically for agentic AI development of CodeQL (QL) code. This server provides tools, prompts, and resources to help AI assistants write, validate, and optimize CodeQL queries for security analysis and code quality.

## Features

- **Comprehensive Tool Suite** - Wraps CodeQL CLI commands for query compilation, execution, testing, and database operations
- **Multi-Language Support** - Supports CodeQL query development for 9 languages including Python, JavaScript, Java, C/C++, and more
- **AI-Optimized Prompts** - Built-in prompts and resources that guide AI assistants through CodeQL development workflows
- **Test-Driven Development** - Integrated testing tools for validating query accuracy with expected results
- **Flexible Transport** - Supports both stdio and HTTP transport modes for different integration scenarios

## Limitations

- Requires CodeQL CLI to be installed separately
- Performance depends on the size of CodeQL databases being analyzed
- Some advanced CodeQL CLI features may not yet be exposed as tools

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

- **Node.js** v25.2.1 or later ([nodejs.org](https://nodejs.org/))
- **Some calling LLM** Bring your own LLM, but some LLMs are (much) better than others.

### External Dependencies

- **CodeQL CLI** - Must be installed and available in PATH ([github.com/github/codeql-cli-binaries](https://github.com/github/codeql-cli-binaries/releases))

## Quick Start

### Download and Install

1. Download the latest release from [GitHub Releases](https://github.com/advanced-security/codeql-development-mcp-server/releases)
2. Extract the archive:

```bash
unzip codeql-development-mcp-server-vX.X.X.zip -d /path/to/destination
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
    "codeql-dev-mcp-server": {
      "command": "node",
      "args": ["/path/to/destination/server/dist/ql-mcp-server.js"],
      "type": "stdio"
    }
  }
}
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
4. Confirm `codeql-dev-mcp-server` appears

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

## Documentation

- [Getting Started Guide](docs/getting-started.md) - Detailed installation and setup instructions
- [Tools Reference](docs/tools-reference.md) - Complete list of available MCP tools and usage examples

## License

This project is licensed under the terms of the GitHub CodeQL Terms and Conditions. Please refer to [LICENSE](LICENSE) for the full terms.

## Maintainers

This repository is maintained by the team specified in [CODEOWNERS](CODEOWNERS).

## Support

This project uses GitHub issues to track bugs and feature requests. Please search existing issues before filing new ones to avoid duplicates.

This project comes with no expectation or guarantee of support, with more details in the [SUPPORT.md](SUPPORT.md) document.

## Acknowledgement

This project builds upon the [CodeQL CLI](https://github.com/github/codeql-cli-binaries) and the broader [CodeQL ecosystem](https://codeql.github.com/) developed by GitHub. Special thanks to the GitHub Advanced Security team and the open-source community for their contributions.
