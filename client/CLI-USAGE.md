# gh-ql-mcp-client CLI Usage Guide

This document describes how to use the `gh-ql-mcp-client` CLI for MCP server integration testing and MCP primitive listing.

## Overview

`gh-ql-mcp-client` is a Go binary built with [Cobra](https://github.com/spf13/cobra). It can be used as a standalone CLI or as a `gh` CLI extension.

```bash
# Standalone
gh-ql-mcp-client <command> [flags]

# As gh extension
gh ql-mcp-client <command> [flags]

# Help for any command
gh-ql-mcp-client --help
gh-ql-mcp-client list --help
gh-ql-mcp-client integration-tests --help
```

## Commands

### `list`

List MCP server primitives (tools, prompts, resources).

#### `list tools`

List all tools registered on the MCP server.

```bash
gh-ql-mcp-client list tools
gh-ql-mcp-client list tools --format json
gh-ql-mcp-client list tools --mode http --port 3000
```

#### `list prompts`

List all prompts registered on the MCP server.

```bash
gh-ql-mcp-client list prompts
gh-ql-mcp-client list prompts --format json
```

#### `list resources`

List all resources registered on the MCP server.

```bash
gh-ql-mcp-client list resources
gh-ql-mcp-client list resources --format json
```

### `integration-tests`

Run MCP server integration tests from `client/integration-tests/`.

```bash
# Run all tests (stdio mode)
gh-ql-mcp-client integration-tests --mode stdio

# Run all tests (http mode, connecting to a running server)
gh-ql-mcp-client integration-tests --mode http --port 3000

# Filter by tool and/or test name
gh-ql-mcp-client integration-tests --tools codeql_query_run
gh-ql-mcp-client integration-tests --tools codeql_query_run --tests basic_query_run

# Skip CodeQL pack installation
gh-ql-mcp-client integration-tests --no-install-packs
```

**Flags:**

| Flag                 | Description                                    |
| -------------------- | ---------------------------------------------- |
| `--tools`            | Comma-separated list of tool names to test     |
| `--tests`            | Comma-separated list of test case names to run |
| `--no-install-packs` | Skip CodeQL pack installation                  |
| `--timeout`          | Per-tool-call timeout in seconds (default: 30) |

## Global Flags

These flags are available on all commands:

| Flag       | Default     | Description                           |
| ---------- | ----------- | ------------------------------------- |
| `--mode`   | `stdio`     | MCP server transport (`stdio`/`http`) |
| `--host`   | `localhost` | MCP server host (http mode)           |
| `--port`   | `3000`      | MCP server port (http mode)           |
| `--format` | `text`      | Output format (`text`/`json`)         |

Transport mode is controlled by the `--mode` flag, which defaults to `stdio`.

## Integration with Shell Scripts

The `client/scripts/run-integration-tests.sh` script builds the Go binary, starts the MCP server, and runs integration tests:

```bash
# Run all tests (default)
./client/scripts/run-integration-tests.sh

# Run specific tools
./client/scripts/run-integration-tests.sh --tools codeql_query_format

# Skip pack installation
./client/scripts/run-integration-tests.sh --no-install-packs
```

## Environment Variable Reference

| Variable          | Description                                             | Default                      |
| ----------------- | ------------------------------------------------------- | ---------------------------- |
| `MCP_SERVER_URL`  | Override MCP server URL (http mode)                     | `http://localhost:3000/mcp`  |
| `MCP_SERVER_PATH` | Override path to MCP server JS entry point (stdio mode) | Auto-detected from repo root |

Transport mode is controlled by the `--mode` flag (default: `stdio`). `MCP_SERVER_URL` is only used to override the server URL when running in `http` mode.

Cobra provides built-in help and validation for all flags. Use `--help` on any command for details.
