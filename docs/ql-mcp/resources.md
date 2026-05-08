# Resources

> MCP resources provided by the CodeQL Development MCP Server.

## Overview

The server exposes **11 static resources** and a set of **dynamic per-language resources** that supply AI assistants with CodeQL reference material. Resources are read-only and backed by `.md` files bundled with the server.

## Static Resources

| Resource                       | URI                                           | Description                                                                       |
| ------------------------------ | --------------------------------------------- | --------------------------------------------------------------------------------- |
| CodeQL Query Basics            | `codeql://learning/query-basics`              | QL query writing reference: syntax, metadata, patterns, testing                   |
| CodeQL Test-Driven Development | `codeql://learning/test-driven-development`   | TDD theory and workflow for developing CodeQL queries                             |
| CodeQL Data Extensions         | `codeql://learning/data-extensions`           | Models-as-Data (MaD) overview: YAML model formats, extensible predicates, layout  |
| CodeQL Performance Patterns    | `codeql://patterns/performance`               | Performance profiling and optimization for CodeQL queries                         |
| CodeQL Server Overview         | `codeql://server/overview`                    | MCP server orientation guide: tools, prompts, resources, and workflows            |
| CodeQL Server Prompts          | `codeql://server/prompts`                     | Complete reference of MCP prompts for CodeQL development workflows                |
| CodeQL Server Queries          | `codeql://server/queries`                     | Overview of bundled tools queries: PrintAST, PrintCFG, CallGraphFrom, CallGraphTo |
| CodeQL Server Tools            | `codeql://server/tools`                       | Complete reference of default MCP tools for CodeQL development                    |
| CodeQL Security Templates      | `codeql://templates/security`                 | Security query templates for multiple languages and vulnerability classes         |
| CodeQL Query Unit Testing      | `codeql://guides/query-unit-testing`          | Guide for creating and running unit tests for CodeQL queries                      |
| CodeQL Dataflow Migration      | `codeql://guides/dataflow-migration-v1-to-v2` | Guide for migrating from legacy v1 dataflow API to modern v2 module-based API     |

## Language-Specific Resources

Each supported language can expose one or more of the following resource types under the URI pattern `codeql://languages/{language}/{type}`:

| Language   | AST Reference | Security Patterns | Library Modeling | Additional               |
| ---------- | :-----------: | :---------------: | :--------------: | ------------------------ |
| actions    |       ✓       |                   |                  |                          |
| cpp        |       ✓       |         ✓         |        ✓         |                          |
| csharp     |       ✓       |         ✓         |        ✓         |                          |
| go         |       ✓       |         ✓         |        ✓         | dataflow, basic-queries  |
| java       |       ✓       |                   |        ✓         |                          |
| javascript |       ✓       |         ✓         |        ✓         |                          |
| python     |       ✓       |         ✓         |        ✓         |                          |
| ruby       |       ✓       |                   |        ✓         |                          |
| rust       |       ✓       |                   |        ✓         |                          |
| swift      |               |                   |        ✓         |                          |

### Resource Types

- **AST Reference** (`codeql://languages/{language}/ast`) — CodeQL AST class reference for the language, describing how source constructs map to QL classes.
- **Security Patterns** (`codeql://languages/{language}/security`) — Security query patterns and framework modeling guidance.
- **Library Modeling** (`codeql://languages/{language}/library-modeling`) — Language-specific guide for authoring CodeQL data extensions (Models-as-Data) for third-party libraries. Registered for every CodeQL language that supports MaD upstream (`cpp`, `csharp`, `go`, `java`, `javascript`, `python`, `ruby`, `rust`, `swift`).
- **Dataflow** (`codeql://languages/go/dataflow`) — Guide to using the CodeQL dataflow library.
- **Basic Queries** (`codeql://languages/go/basic-queries`) — Introductory query examples for the language.
