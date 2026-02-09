# Resources

> MCP resources provided by the CodeQL Development MCP Server.

## Overview

The server exposes **4 static learning resources** and a set of **dynamic per-language resources** that supply AI assistants with CodeQL reference material. Resources are read-only and backed by `*.prompt.md` files bundled with the server.

## Static Resources

| Resource                    | URI                                 | Description                                         |
| --------------------------- | ----------------------------------- | --------------------------------------------------- |
| CodeQL Getting Started      | `codeql://learning/getting-started` | Comprehensive introduction to CodeQL for beginners  |
| CodeQL Query Basics         | `codeql://learning/query-basics`    | Learn the fundamentals of writing CodeQL queries    |
| CodeQL Security Templates   | `codeql://templates/security`       | Ready-to-use security query templates               |
| CodeQL Performance Patterns | `codeql://patterns/performance`     | Best practices for writing efficient CodeQL queries |

## Language-Specific Resources

Each supported language can expose one or more of the following resource types under the URI pattern `codeql://languages/{language}/{type}`:

| Language   | AST Reference | Security Patterns | Additional                                |
| ---------- | :-----------: | :---------------: | ----------------------------------------- |
| actions    |       ✓       |                   |                                           |
| cpp        |       ✓       |         ✓         |                                           |
| csharp     |       ✓       |         ✓         |                                           |
| go         |       ✓       |         ✓         | dataflow, library-modeling, basic-queries |
| java       |       ✓       |                   |                                           |
| javascript |       ✓       |         ✓         |                                           |
| python     |       ✓       |         ✓         |                                           |
| ql         |       ✓       |                   |                                           |
| ruby       |       ✓       |                   |                                           |

### Resource Types

- **AST Reference** (`codeql://languages/{language}/ast`) — CodeQL AST class reference for the language, describing how source constructs map to QL classes.
- **Security Patterns** (`codeql://languages/{language}/security`) — Security query patterns and framework modeling guidance.
- **Dataflow** (`codeql://languages/go/dataflow`) — Guide to using the CodeQL dataflow library.
- **Library Modeling** (`codeql://languages/go/library-modeling`) — Guide to modeling third-party libraries for CodeQL analysis.
- **Basic Queries** (`codeql://languages/go/basic-queries`) — Introductory query examples for the language.
