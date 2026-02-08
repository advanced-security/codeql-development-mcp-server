# advanced-security/codeql-development-mcp-server:server/README.md

This README provides documentation for the `server` subproject of the `advanced-security/codeql-development-mcp-server` repository.
The `server` subproject implements the actual Model Context Protocol (MCP) server for CodeQL development and is the main component of the repository.

## For End Users

If you're using the distributed release package (downloaded from GitHub Releases), the server is ready to use. See the [Getting Started Guide](../docs/getting-started.md) for setup instructions.

### Running the Server

The server can run in two modes:

**STDIO Mode (recommended for VS Code):**

```bash
node dist/codeql-development-mcp-server.js
```

**HTTP Mode (for debugging):**

```bash
TRANSPORT_MODE=http node dist/codeql-development-mcp-server.js
```

### Configuration

Configure the server using environment variables:

| Variable         | Description                            | Default  |
| ---------------- | -------------------------------------- | -------- |
| `CODEQL_PATH`    | Absolute path to the CodeQL CLI binary | `codeql` |
| `TRANSPORT_MODE` | `stdio` or `http`                      | `stdio`  |
| `HTTP_PORT`      | HTTP port (when using HTTP mode)       | `3000`   |
| `DEBUG`          | Enable debug logging                   | `false`  |

## Subproject Structure

The `server` subproject is structured as follows:

```text
server/
├── dist/                    # Base directory for compiled output
│   ├── codeql-development-mcp-server.js     # Compiled, bundled MCP server entry point
│   └── codeql-development-mcp-server.js.map # Source map for the bundled MCP server
├── src/                     # TypeScript source library code
│   ├── codeql-development-mcp-server.ts     # MCP server entry point
│   ├── lib/                 # Core library code
│   ├── tools/               # Implementation of MCP tools
├── test/                    # Base directory for tests
│   ├── src/                 # Base directory for test source files
│   │   ├── lib/             # Test files for core library code
│   │   ├── tools/           # Test files for MCP tools
├── eslint.config.mjs        # ESLint configuration
├── esbuild.config.js        # esbuild configuration for bundling
├── package.json             # NPM package configuration
├── tsconfig.json            # TypeScript configuration
└── README.md                # This README file
```

## Troubleshooting

### Server Won't Start

1. **Check Node.js version**: The server requires Node.js v22.0.0 or later

   ```bash
   node --version
   ```

2. **Verify the entry point exists**:

   ```bash
   ls dist/codeql-development-mcp-server.js
   ```

3. **Check for missing dependencies**: If using the distributed package, ensure `node_modules` is present

### CodeQL Tools Return Errors

1. **Verify CodeQL CLI is installed**:

   ```bash
   codeql --version
   ```

2. **Check CodeQL is in PATH**: The server expects `codeql` to be available in the system PATH, or set `CODEQL_PATH` to the absolute path of the CodeQL CLI binary

3. **Ensure you have a valid database**: Most query tools require a CodeQL database

### HTTP Mode Not Working

1. **Check if port is in use**:

   ```bash
   lsof -i :3000
   ```

2. **Try a different port**:

   ```bash
   TRANSPORT_MODE=http HTTP_PORT=8080 node dist/codeql-development-mcp-server.js
   ```

### VS Code Integration Issues

See the [Getting Started Guide](../docs/getting-started.md#troubleshooting) for troubleshooting steps.

## References

- [MCP Architecture](https://modelcontextprotocol.io/docs/learn/architecture)
- [Getting Started Guide](../docs/getting-started.md)
- [Tools Reference](../docs/tools-reference.md)
