---
applyTo: '.github/prompts/*.prompt.md'
description: 'Instructions for managing .prompt.md files throughout the advanced-security/codeql-development-mcp-server repository.'
---

# Instructions for managing `.github/prompts/*.prompt.md` files

## PURPOSE

The `advanced-security/codeql-development-mcp-server` repository contains `*.prompt.md` files in multiple locations. These files are intentionally interlinked in order to promote modularity and reusability of prompt content.

## ENTRY POINTS

We expect the LLM to be guided to the appropriate `*.prompt.md` files from some higher-level component, such as:

- an issue created from a `.github/ISSUE_TEMPLATE/*.yml` file, or...
- a Copilot instructions file from `.github/instructions/*.instructions.md`.

That higher-level component should link (i.e. point) to at least one `.github/prompts/*.prompt.md` file, which in turn may link to other `*.prompt.md` files elsewhere in the repository.

## REQUIREMENTS

- **ALWAYS run `npm run build-and-test` from the repo root directory and ensure it passes completely before committing any changes. This is MANDATORY and must be verified before every commit.**
- ALWAYS use the `.prompt.md` file extension for all prompt files (i.e. not just `.md`).
- ALWAYS follow prompt engineering best practices to ensure clarity, conciseness, and effectiveness of prompts.
- ALWAYS keep language-specific guidance (e.g. for `cpp`, `csharp`, `go`, `java`, `javascript`, `python`, `ruby`, etc.) in dedicated prompt files with a name following the pattern `*-<language>.prompt.md` (e.g. `generate-qspec-go.prompt.md`).
- ALWAYS follow best practices for writing markdown files, including proper use of headings, lists, links, and code blocks. This explicitly includes inserting a newline before and after code blocks, lists, and headings.
- ALWAYS check formatting with `npm run lint && npm run format:check` from the repo root directory to ensure consistent formatting after making changes.
- ALWAYS fix linting and formatting errors by running `npm run lint:fix && npm run format` from the repo root directory before committing changes.
- ALWAYS start each `*.prompt.md` file with a YAML front-matter block containing, at minimum, values for fields such as:
  - `agent` -> pointing to the name of the agent this prompt is intended for (e.g. `agent: ql-mcp-tool-tester`)
  - `name` -> a unique name for the prompt (e.g. `name: validate-ql-mcp-tools-via-workshop`)
  - `description` -> a concise description of the prompt's purpose and functionality
  - `argument-hint` -> a brief hint about the expected arguments for the prompt

## PREFERENCES

- PREFER using links to other `*.prompt.md` files to avoid duplication and promote reuse of common prompt components.
- PREFER keeping higher-level prompts minimal, delegating detailed instructions, for language-specific and use-case-specific guidance, to dedicated `<use-case>-<language>.prompt.md` files.

## CONSTRAINTS

- NEVER leave any trailing whitespace on any line.
- NEVER use four backticks to nest one code block inside another. Re-organize content as needed to avoid this situation.
