---
applyTo: '**/*.prompt.md'
description: 'Instructions for managing .prompt.md files throughout the github/codeql-development-mcp-server repository.'
---

# Instructions for managing `*.prompt.md` files

## PURPOSE

The `github/codeql-development-mcp-server` repository contains `*.prompt.md` files in multiple locations. These files are intentionally interlinked in order to promote modularity and reusability of prompt content.

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
- ALWAYS start each `*.prompt.md` file with the following YAML block of frontmatter:

  ```yaml
  ---
  mode: agent
  ---
  ```

## PREFERENCES

- PREFER using links to other `*.prompt.md` files to avoid duplication and promote reuse of common prompt components.
- PREFER keeping higher-level prompts minimal, delegating detailed instructions, for language-specific and use-case-specific guidance, to dedicated `<use-case>-<language>.prompt.md` files.

## CONSTRAINTS

- NEVER leave any trailing whitespace on any line.
- NEVER use four backticks to nest one code block inside another. Re-organize content as needed to avoid this situation.
