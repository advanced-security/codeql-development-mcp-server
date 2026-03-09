---
applyTo: 'server/src/resources/**/*.md'
description: 'Instructions for MCP server resource markdown files served to LLMs.'
---

# Copilot Instructions for `server/src/resources/**/*.md` resource files

## PURPOSE

This file contains instructions for working with markdown resource files in the `server/src/resources/` directory. These files are imported at build time (via esbuild's `.md: 'text'` loader) and served to LLMs through MCP resource endpoints (e.g., `codeql://server/overview`, `codeql://languages/go/ast`). Because LLMs consume these files as authoritative reference material, correctness and consistency are critical.

## REQUIREMENTS

- ALWAYS name resource files to match their MCP endpoint path. For example, a resource served at `codeql://server/overview` must be named `server-overview.md`, and a resource at `codeql://languages/go/ast` must be `languages/go_ast.md`.
- ALWAYS start each resource file with a `#`-level (H1) heading that identifies the resource topic and scope.
- ALWAYS use the v2 module-based DataFlow/TaintTracking API (`module MyConfig implements DataFlow::ConfigSig` with `TaintTracking::Global<MyConfig>`) in all CodeQL code examples. NEVER use the deprecated v1 class-based API (`class MyConfig extends TaintTracking::Configuration` with `override predicate`).
- ALWAYS use `codeql-pack.yml` (not `qlpack.yml`) as the pack configuration filename in all code examples and references.
- ALWAYS ensure any new resource file has a corresponding import and registration in `server/src/types/language-types.ts` (for language-specific resources) or `server/src/lib/resources.ts` (for general resources), and that the test expectations in `server/test/src/resources/` are updated accordingly.
- ALWAYS verify ASCII art diagrams have consistent box corners and formatting.
- ALWAYS ensure code examples are syntactically correct — class names, constructor names, and predicate names must all match (e.g., a class named `FooAsSink` must have a constructor named `FooAsSink()`).
- **ALWAYS run `npm run build-and-test` from the repo root directory and ensure it passes completely before committing any changes.**

## PREFERENCES

- PREFER actionable, tool-oriented content that tells an LLM exactly which MCP tools and prompts to invoke and in what order, over abstract descriptions.
- PREFER concrete code examples over prose explanations for CodeQL patterns and idioms.
- PREFER a single authoritative location for each piece of documentation — if content exists in a resource file, repo-level docs should reference it rather than restate it.

## DOCUMENTATION RELATIONSHIP: `server/src/resources/` ↔ `docs/ql-mcp/`

The `server/src/resources/server-*.md` files are the **authoritative source** for MCP server tools, prompts, and queries documentation. The `docs/ql-mcp/*.md` files are **thin wrappers** that link to these authoritative sources.

### When to update which file

| Change type                                  | Update `server/src/resources/server-*.md` | Update `docs/ql-mcp/*.md`              |
| -------------------------------------------- | ----------------------------------------- | -------------------------------------- |
| Add, remove, or modify an MCP tool           | YES — `server-tools.md`                   | Only if monitoring tools table changes |
| Add, remove, or modify an MCP prompt         | YES — `server-prompts.md`                 | NO — wrapper links to resource file    |
| Add or remove a language resource            | YES — registration in source code         | YES — update language table            |
| Add or remove a static resource              | YES — resource file + registration        | YES — update static resources table    |
| Change a resource URI or endpoint path       | YES — rename file to match new path       | YES — update URI references            |
| Fix a typo or improve wording in tool/prompt | YES — resource file only                  | NO — wrapper inherits the fix          |

### Rules

- ALWAYS update the authoritative `server/src/resources/server-*.md` file first, then verify the `docs/ql-mcp/*.md` wrapper still links correctly.
- ALWAYS keep `docs/ql-mcp/*.md` as thin wrappers — they should contain only a brief overview, a link to the authoritative resource file, and any content that is NOT served via MCP (e.g., the optional monitoring tools table in `docs/ql-mcp/tools.md`).
- NEVER duplicate detailed tool, prompt, or resource descriptions in both `server/src/resources/` and `docs/ql-mcp/`. The `docs/ql-mcp/` file must defer to the resource file for all MCP-served content.

## CONSTRAINTS

- NEVER leave any trailing whitespace on any line.
- NEVER include placeholder or TODO content in resource files — if a resource is not ready, exclude it from registration until the content is complete.
- NEVER reference deprecated or removed MCP tools in resource files. When a tool is deprecated, remove all mentions from resource files.
- NEVER mix deprecated and current API patterns in code examples within the same file or across files in this directory.
