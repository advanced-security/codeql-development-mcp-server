# gh-ql-mcp-client CLI Usage Guide

This document describes how to use the `gh-ql-mcp-client` CLI for Code Scanning alert lifecycle management and MCP server integration testing.

## Overview

`gh-ql-mcp-client` is a Go binary built with [Cobra](https://github.com/spf13/cobra). It can be used as a standalone CLI or as a `gh` CLI extension.

```bash
# Standalone
gh-ql-mcp-client <command> [flags]

# As gh extension
gh ql-mcp-client <command> [flags]

# Help for any command
gh-ql-mcp-client --help
gh-ql-mcp-client code-scanning --help
gh-ql-mcp-client code-scanning list-alerts --help
```

## Commands

### `code-scanning` (alias: `cs`)

Interact with the GitHub Code Scanning REST API. Requires `gh` CLI authentication.

#### `list-analyses`

List Code Scanning analyses for a repository.

```bash
gh-ql-mcp-client code-scanning list-analyses --repo owner/repo
gh-ql-mcp-client cs list-analyses --repo owner/repo --tool-name CodeQL --ref refs/heads/main
gh-ql-mcp-client cs list-analyses --repo owner/repo --format json
```

**Flags:**

| Flag          | Description                                  |
| ------------- | -------------------------------------------- |
| `--repo`      | Repository in `owner/repo` format (required) |
| `--ref`       | Git ref to filter by                         |
| `--tool-name` | Tool name to filter by (e.g. `CodeQL`)       |
| `--sarif-id`  | SARIF ID to filter by                        |
| `--sort`      | Sort by (`created`)                          |
| `--direction` | Sort direction (`asc`, `desc`)               |
| `--per-page`  | Results per page (default: 30, max: 100)     |

#### `list-alerts`

List Code Scanning alerts for a repository.

```bash
gh-ql-mcp-client code-scanning list-alerts --repo owner/repo
gh-ql-mcp-client cs list-alerts --repo owner/repo --state open --severity high
gh-ql-mcp-client cs list-alerts --repo owner/repo --tool-name CodeQL --format json
```

**Flags:**

| Flag          | Description                                                      |
| ------------- | ---------------------------------------------------------------- |
| `--repo`      | Repository in `owner/repo` format (required)                     |
| `--ref`       | Git ref to filter by                                             |
| `--state`     | Alert state: `open`, `closed`, `dismissed`, `fixed`              |
| `--severity`  | Severity: `critical`, `high`, `medium`, `low`, `warning`, `note` |
| `--tool-name` | Tool name to filter by                                           |
| `--sort`      | Sort by (`created`, `updated`)                                   |
| `--direction` | Sort direction (`asc`, `desc`)                                   |
| `--per-page`  | Results per page (default: 30, max: 100)                         |

#### `download-analysis`

Download a Code Scanning analysis as SARIF.

```bash
gh-ql-mcp-client code-scanning download-analysis --repo owner/repo --analysis-id 12345
gh-ql-mcp-client cs download-analysis --repo owner/repo --analysis-id 12345 --output my-results.sarif
```

**Flags:**

| Flag            | Description                                                             |
| --------------- | ----------------------------------------------------------------------- |
| `--repo`        | Repository in `owner/repo` format (required)                            |
| `--analysis-id` | Analysis ID to download (required)                                      |
| `--output`      | Output file path (default: `sarif-downloads/<owner>_<repo>/<id>.sarif`) |

### `sarif`

SARIF analysis and alert comparison tools. These commands delegate to MCP server tools.

```bash
gh-ql-mcp-client sarif --help
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
| `--mode`   | `http`      | MCP server transport (`stdio`/`http`) |
| `--host`   | `localhost` | MCP server host (http mode)           |
| `--port`   | `3000`      | MCP server port (http mode)           |
| `--format` | `text`      | Output format (`text`/`json`)         |

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
| `MCP_MODE`        | Transport mode (`stdio`/`http`)                         | `http`                       |
| `HTTP_HOST`       | Server host                                             | `localhost`                  |
| `HTTP_PORT`       | Server port                                             | `3000`                       |

Cobra provides built-in help and validation for all flags. Use `--help` on any command for details.
