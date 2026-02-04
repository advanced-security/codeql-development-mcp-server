# CodeQL Development MCP Server

A comprehensive Model Context Protocol (MCP) server designed specifically for agentic AI development of CodeQL (QL) code. This server provides tools and resources to help AI assistants write, validate, and optimize CodeQL queries for security analysis and code quality.

## Quick Start

For users who want to quickly get started with the MCP server:

### Download and Install

1. Download the latest release from [GitHub Releases](https://github.com/advanced-security/codeql-development-mcp-server/releases)
2. Extract the archive:

   ```bash
   tar -xzvf codeql-development-mcp-server-vX.X.X.tar.gz -C /path/to/destination
   ```

3. Configure VS Code by adding to your `mcp.json`:

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

## Contributing

We welcome contributions to this project! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on how to contribute.

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

## Documentation

- [Getting Started Guide](docs/getting-started.md) - Installation and setup instructions
- [Tools Reference](docs/tools-reference.md) - Complete list of available MCP tools

## License

See [LICENSE.md](LICENSE.md) for license terms.

## Maintainers

This repository is maintained by the team specified in [CODEOWNERS](CODEOWNERS).

## Support

This project comes with no expectation or guarantee of support, with more details in the [SUPPORT.md](SUPPORT.md) document.
