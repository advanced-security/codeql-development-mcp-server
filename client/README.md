# gh-ql-mcp-client

A Go CLI for listing MCP server primitives, running MCP server integration tests, and (planned) managing Code Scanning alert lifecycles.

Installable as a standalone binary or as a `gh` CLI extension (`gh ql-mcp-client`).

## Prerequisites

- **Go** 1.25.6 or later
- **GitHub CLI** (`gh`) authenticated — used for GitHub API calls via `go-gh`
- **Node.js** v25.6.0 or later — required to run the MCP server subprocess in `stdio` mode
- **CodeQL CLI** — required for integration tests that exercise CodeQL tools

## Build

```bash
make build          # Build for current platform
make build-all      # Cross-compile for darwin/linux/windows (amd64+arm64)
make install        # Install to $GOPATH/bin
```

## Usage

```bash
# As standalone binary
gh-ql-mcp-client <command> [flags]

# As gh extension
gh ql-mcp-client <command> [flags]
```

### Global Flags

| Flag       | Default     | Description                              |
| ---------- | ----------- | ---------------------------------------- |
| `--mode`   | `stdio`     | MCP server transport (`stdio`/`http`)    |
| `--host`   | `localhost` | MCP server host (http mode)              |
| `--port`   | `3000`      | MCP server port (http mode)              |
| `--format` | `text`      | Output format (`text`/`json`/`markdown`) |

Transport is configured via CLI flags. The CLI does not currently read `MCP_MODE`.

### Commands

#### `list`

List MCP server primitives (tools, prompts, resources).

```bash
# List all tools registered on the MCP server
gh-ql-mcp-client list tools
gh-ql-mcp-client list tools --format json

# List all prompts
gh-ql-mcp-client list prompts

# List all resources
gh-ql-mcp-client list resources
```

#### `integration-tests`

Run MCP server integration tests from `client/integration-tests/`.

```bash
# Run all integration tests (stdio mode)
gh-ql-mcp-client integration-tests --mode stdio

# Filter by tool name
gh-ql-mcp-client integration-tests --tools codeql_query_run

# Filter by tool and test case
gh-ql-mcp-client integration-tests --tools codeql_query_run --tests basic_query_run
```

## Testing

```bash
make test            # Run unit tests + integration tests
make test-unit       # Go unit tests only
make test-integration  # Build binary + run integration tests
make test-verbose    # Unit tests with verbose output
make test-coverage   # Unit tests with coverage report
```

## Environment Variables

| Variable          | Description                                             | Default                      |
| ----------------- | ------------------------------------------------------- | ---------------------------- |
| `MCP_SERVER_URL`  | Override MCP server URL (http mode)                     | `http://localhost:3000/mcp`  |
| `MCP_SERVER_PATH` | Override path to MCP server JS entry point (stdio mode) | Auto-detected from repo root |

Transport mode is controlled by the `--mode` flag, which defaults to `stdio`. `MCP_SERVER_URL` is only used to override the server URL when running in `http` mode.

## Architecture

```text
client/
├── main.go                     # Entry point
├── cmd/                        # Cobra CLI commands
│   ├── root.go                 # Root command + global flags
│   ├── list.go                 # list subcommand group (tools/prompts/resources)
│   ├── helpers.go              # Shared CLI helpers
│   └── integration_tests.go    # integration-tests command
├── internal/
│   ├── mcp/                    # MCP server client (via mcp-go)
│   └── testing/                # Integration test runner and parameter builder
├── integration-tests/          # Test fixtures (before/after directories)
├── scripts/                    # Shell scripts for test orchestration
├── Makefile                    # Build, test, lint, cross-compile targets
└── go.mod                      # Go module definition
```

## Known Issues and Limitations

### BQRS Binary Format Compatibility

The BQRS-related tools (`codeql_bqrs_decode`, `codeql_bqrs_info`) may fail in integration tests due to binary format version incompatibility between test fixture BQRS files and the current CodeQL CLI version.

### Other Integration Test Notes

- Some pack dependency resolution warnings are expected in test environment
- Exit code 1 for `codeql query format --check-only` indicates "file would change" and is considered success
