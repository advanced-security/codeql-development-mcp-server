# Tools

> Complete reference of MCP tools provided by the CodeQL Development MCP Server.

## Overview

The server exposes default tools and opt-in monitoring tools. Default tools are registered on startup; monitoring tools require explicit opt-in (see [Monitoring and Reporting](../mcp-server-monitoring-and-reporting.md)). Users control which tools are enabled in their MCP client configuration.

> **Authoritative reference**: The MCP-served resource at `codeql://server/tools` ([`server/src/resources/server-tools.md`](../../server/src/resources/server-tools.md)) is the canonical documentation for default tools. Update that file when adding, removing, or changing any default tool.

## Default Tools

For the complete default tools reference (CodeQL CLI tools, LSP tools, query development tools, common workflows, and input conventions), see [`server/src/resources/server-tools.md`](../../server/src/resources/server-tools.md).

## Optional Monitoring Tools

These tools are disabled by default and require opt-in. See [Monitoring and Reporting](../mcp-server-monitoring-and-reporting.md) for details.

### Session Management

| Tool                   | Description                                                  |
| ---------------------- | ------------------------------------------------------------ |
| `session_end`          | End a query development session with final status            |
| `session_get`          | Get complete details of a specific query development session |
| `session_list`         | List query development sessions with optional filtering      |
| `session_update_state` | Update the current state of a query development session      |

### Session Analytics

| Tool                              | Description                                                      |
| --------------------------------- | ---------------------------------------------------------------- |
| `session_calculate_current_score` | Calculate current quality score for a session based on its state |
| `session_get_call_history`        | Get MCP call history for a specific session                      |
| `session_get_score_history`       | Get quality score history for a specific session                 |
| `session_get_test_history`        | Get test execution history for a specific session                |

### Batch Operations

| Tool                 | Description                                                             |
| -------------------- | ----------------------------------------------------------------------- |
| `sessions_aggregate` | Generate aggregate insights from multiple sessions based on filters     |
| `sessions_compare`   | Compare multiple query development sessions across specified dimensions |
| `sessions_export`    | Export session data in specified format for external analysis           |
