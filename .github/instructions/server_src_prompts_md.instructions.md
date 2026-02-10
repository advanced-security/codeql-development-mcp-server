---
applyTo: 'server/src/prompts/*.prompt.md'
description: 'Instructions for MCP-server-hosted workflow prompt files.'
---

# Copilot Instructions for `server/src/prompts/*.prompt.md` prompt files

## PURPOSE

This file contains instructions for working with workflow prompt files in the `server/src/prompts/` directory. These prompts are registered by the MCP server (via `workflow-prompts.ts`) and exposed as slash commands in VS Code Copilot Chat.

## REQUIREMENTS

- ALWAYS start each prompt file with the following YAML frontmatter block:

  ```yaml
  ---
  agent: agent
  ---
  ```

  Note: VS Code has deprecated `mode: agent` in favor of `agent: agent`.

- ALWAYS ensure each prompt has a corresponding registration in `server/src/prompts/workflow-prompts.ts`, including a Zod parameter schema and a `server.prompt()` call.
- ALWAYS ensure the prompt name in `WORKFLOW_PROMPT_NAMES` matches the registration.
- ALWAYS write prompts that work in **any environment** where `codeql` and the MCP server tools are available, including terminal-only environments without an IDE.
- ALWAYS use explicit, numeric tool parameters (e.g., `file_path`, `line`, `character`) instead of IDE-centric language like "position the cursor" or "click on".
- ALWAYS document when MCP tools use **0-based** positions (all `codeql_lsp_*` tools) versus **1-based** positions (`find_predicate_position`, `find_class_position`, `read_file`).
- ALWAYS note the `workspace_uri` requirement for LSP tools: it must be a **plain directory path** to the pack root containing `codeql-pack.yml`, not a `file://` URI.
- **ALWAYS run `npm run tidy` from the repo root directory to apply (markdown) linting for all prompt files.**

## PREFERENCES

- PREFER referencing other prompts by their registered MCP name (e.g., `codeql://prompts/ql_lsp_iterative_development`) to enable cross-prompt navigation.
- PREFER including a "Worked Example" section showing concrete tool invocations with realistic parameter values.
- PREFER a validation tools comparison table when multiple tools can validate queries at different fidelity levels (e.g., `validate_codeql_query` vs `codeql_lsp_diagnostics` vs `codeql_query_compile`).
- PREFER documenting tool limitations discovered through actual usage (e.g., `codeql_lsp_diagnostics` cannot resolve imports; `find_class_position` finds `class` only, not `module`).

## CONSTRAINTS

- NEVER leave any trailing whitespace on any line.
- NEVER use four backticks to nest one code block inside another.
- NEVER assume the calling LLM has access to an IDE, cursor, or editor UI.
- NEVER reference `file://` URIs for the `workspace_uri` parameter — use plain directory paths.
