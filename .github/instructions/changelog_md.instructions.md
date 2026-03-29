---
applyTo: 'CHANGELOG.md'
description: 'Instructions for maintaining the CHANGELOG.md file that tracks changes between stable releases.'
---

# Copilot Instructions for `CHANGELOG.md`

## PURPOSE

This file contains instructions for maintaining the repository-root `CHANGELOG.md`. The changelog is the authoritative, human-readable record of all notable changes between stable (non-pre-release, non-RC) tagged releases, following the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format.

## REQUIREMENTS

### General

- ALWAYS follow the [Keep a Changelog v1.1.0](https://keepachangelog.com/en/1.1.0/) specification.
- ALWAYS list only **stable** releases (tags matching `vMAJOR.MINOR.PATCH` with no suffix). NEVER list pre-release or release-candidate tags (e.g., `v2.25.0-rc1`, `v2.24.3-rc2`).
- ALWAYS keep entries in **reverse chronological order** — newest release at the top, oldest at the bottom.
- ALWAYS include the full date in `YYYY-MM-DD` format after the version heading (e.g., `## [v2.25.0] — 2026-03-27`).
- ALWAYS include a `[Unreleased]` section at the top for changes on `main` that have not yet been included in a stable release.
- ALWAYS include reference-style link definitions at the bottom of the file for every version heading and the `[Unreleased]` comparison link.
- ALWAYS link PR numbers in the format `([#NNN](https://github.com/advanced-security/codeql-development-mcp-server/pull/NNN))`.
- ALWAYS link contributor handles in the format `[@username](https://github.com/username)`.
- **ALWAYS run `npm run build-and-test` from the repo root directory and ensure it passes completely before committing any changes.**

### Section Structure

Each release entry MUST use the following section hierarchy. Omit any section that has no entries for that release.

```
## [vX.Y.Z] — YYYY-MM-DD

### Highlights             ← 2-4 sentence summaries of the most important changes
### Added                  ← new tools, prompts, resources, queries, VS Code extension features
### Changed                ← modifications to existing tools, prompts, resources, infrastructure
### Deprecated             ← features marked for future removal
### Removed                ← features or tools that were removed
### Fixed                  ← bug fixes
### Security               ← vulnerability fixes or hardening
### Dependencies           ← CodeQL CLI upgrades, npm dependency bumps, action version bumps
### New Contributors       ← first-time contributors (include only in the release where they first appeared)
```

Within `Added` and `Changed`, use sub-headings to group entries by area:

```
#### MCP Server Tools
#### MCP Server Prompts
#### MCP Server Resources
#### CodeQL Query Packs
#### VS Code Extension
#### Infrastructure & CI/CD
```

### Tables for Tools, Prompts, and Resources

- ALWAYS use a two-column markdown table (`| Name | Description |`) when listing new or changed MCP server tools, prompts, or resources.
- For changed tools, use a two-column table (`| Tool | Change |`) describing what changed.

### Full Changelog Link

- ALWAYS end each release section with a **Full Changelog** comparison link in the format:
  ```
  **Full Changelog**: [`vPREV...vCURR`](https://github.com/advanced-security/codeql-development-mcp-server/compare/vPREV...vCURR)
  ```

### Horizontal Rule

- ALWAYS separate release entries with a `---` horizontal rule.

## PREFERENCES

- PREFER concise, specific descriptions over vague summaries. Name the tool, prompt, or resource affected.
- PREFER grouping related dependency bumps (e.g., multiple `@vitest/*` packages) into a single bullet.
- PREFER the `Highlights` section to summarize the 2-4 most impactful changes for a release, with links to relevant PRs.
- PREFER linking to PRs rather than issues when both exist, since PRs contain the implementation details.

## CONSTRAINTS

- NEVER leave any trailing whitespace on any line.
- NEVER include placeholder or TODO content — if a release section is not ready, keep changes under `[Unreleased]` until the release is tagged.
- NEVER duplicate the same change under multiple sections (e.g., do not list the same fix under both `Fixed` and `Changed`).
- NEVER include internal-only or draft PR references that have not been merged to `main`.
- NEVER modify historical release entries unless correcting a factual error (wrong PR number, broken link, etc.).
