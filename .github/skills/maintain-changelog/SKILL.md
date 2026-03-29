---
name: maintain-changelog
description: Maintain the CHANGELOG.md file by drafting or updating entries for new stable releases. Use this skill when preparing a release, after merging significant PRs, or when moving changes from Unreleased to a new version section.
---

# Maintain Changelog

This skill provides a systematic workflow for keeping `CHANGELOG.md` up-to-date as changes land on `main` and when cutting new stable releases.

## When to Use This Skill

- **After merging a PR** that adds, changes, removes, or fixes MCP server tools, prompts, resources, CodeQL query packs, VS Code extension features, or infrastructure.
- **When preparing a stable release** (tagging `vMAJOR.MINOR.PATCH` without a pre-release suffix).
- **When reviewing the `[Unreleased]` section** for accuracy before a release candidate or final release.

## Key Concepts

### Release Scope

The changelog tracks changes between **stable releases only** — tags matching `vMAJOR.MINOR.PATCH` with no `-rc*` or other suffix. Pre-release tags are excluded.

### Section Taxonomy

Each release entry follows the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) categories:

| Section              | What goes here                                                        |
| -------------------- | --------------------------------------------------------------------- |
| **Highlights**       | 2-4 sentence summaries of the most impactful changes, with PR links   |
| **Added**            | New tools, prompts, resources, query packs, extension features        |
| **Changed**          | Modifications to existing tools, prompts, resources, infrastructure   |
| **Deprecated**       | Features marked for future removal                                    |
| **Removed**          | Features or tools removed in this release                             |
| **Fixed**            | Bug fixes                                                             |
| **Security**         | Vulnerability fixes or hardening changes                              |
| **Dependencies**     | CodeQL CLI upgrades, npm dependency bumps, action version bumps       |
| **New Contributors** | First-time contributors (only in the release where they first appear) |

Within `Added` and `Changed`, use sub-headings to group by area: `MCP Server Tools`, `MCP Server Prompts`, `MCP Server Resources`, `CodeQL Query Packs`, `VS Code Extension`, `Infrastructure & CI/CD`.

### Entry Format

- Each bullet links to the PR: `- Description of change. ([#NNN](https://github.com/advanced-security/codeql-development-mcp-server/pull/NNN))`
- New or changed tools/prompts/resources use a two-column markdown table.
- Each release ends with: `**Full Changelog**: [\`vPREV...vCURR\`](https://github.com/advanced-security/codeql-development-mcp-server/compare/vPREV...vCURR)`

## Workflow

### Phase 1: Gather Changes

Identify all merged PRs since the last stable release tag.

```sh
# List PRs merged since the last stable release
git log --oneline --merges v2.25.0..HEAD
```

Alternatively, use the GitHub compare view:

```
https://github.com/advanced-security/codeql-development-mcp-server/compare/vPREV...HEAD
```

### Phase 2: Classify Each Change

For each merged PR, determine:

1. **Which section** it belongs to (Added, Changed, Fixed, Dependencies, etc.)
2. **Which sub-area** it affects (MCP Server Tools, VS Code Extension, Infrastructure, etc.)
3. **Whether it warrants a Highlights mention** (significant user-facing impact)

Use these heuristics:

| PR title pattern                          | Likely section                                   |
| ----------------------------------------- | ------------------------------------------------ |
| `Build(deps)` or `Bump`                   | Dependencies                                     |
| `Fix` or `Fixes`                          | Fixed                                            |
| `Add` or `New` or `Implement`             | Added                                            |
| `Update` or `Improve` or `Refactor`       | Changed                                          |
| `Upgrade CodeQL CLI`                      | Dependencies + possibly Highlights               |
| `[UPDATE PRIMITIVE]`                      | Changed > MCP Server Tools                       |
| `Pin actions` or `dependabot`             | Changed > Infrastructure & CI/CD or Dependencies |
| `Security` or `TOCTOU` or `vulnerability` | Security                                         |

### Phase 3: Draft Entries

1. Open `CHANGELOG.md`.
2. Add entries under the `[Unreleased]` section, grouped by section and sub-area.
3. Use concise, specific descriptions. Name the tool, prompt, or resource affected.
4. Link every entry to its PR number.

### Phase 4: Cut a Release Entry

When a stable release is being tagged:

1. Replace `[Unreleased]` content with a new version heading:
   ```markdown
   ## [vX.Y.Z] — YYYY-MM-DD
   ```
2. Re-create an empty `[Unreleased]` section above the new entry.
3. Write a `Highlights` section summarizing the 2-4 most important changes.
4. Add a `**Full Changelog**` comparison link at the bottom of the entry.
5. Update the reference-style link definitions at the bottom of the file:
   - Add `[vX.Y.Z]: https://github.com/advanced-security/codeql-development-mcp-server/releases/tag/vX.Y.Z`
   - Update `[Unreleased]` to compare against the new tag: `https://github.com/advanced-security/codeql-development-mcp-server/compare/vX.Y.Z...HEAD`
6. Add a `---` horizontal rule between the new entry and the previous release.

### Phase 5: Validate

1. Verify all PR links resolve correctly.
2. Verify the `[Unreleased]` comparison link points to `vLATEST...HEAD`.
3. Verify no duplicate entries exist across sections.
4. Verify entries are in reverse chronological order.
5. Run `npm run build-and-test` from the repo root to ensure no regressions.

## Example: Adding an Unreleased Entry

After merging PR #200 that adds a new `foo_bar` tool:

```markdown
## [Unreleased]

### Added

#### MCP Server Tools

| Tool      | Description               |
| --------- | ------------------------- |
| `foo_bar` | Does X for Y, enabling Z. |

- New `foo_bar` tool for doing X. ([#200](https://github.com/advanced-security/codeql-development-mcp-server/pull/200))
```

## Example: Promoting Unreleased to a New Version

```markdown
## [Unreleased]

_Changes on `main` since the latest tagged release that have not yet been included in a stable release._

## [v2.26.0] — 2026-04-15

### Highlights

- **New `foo_bar` tool** — ...

### Added

...

**Full Changelog**: [`v2.25.0...v2.26.0`](https://github.com/advanced-security/codeql-development-mcp-server/compare/v2.25.0...v2.26.0)

---

## [v2.25.0] — 2026-03-27

...
```

## Related Instructions

- [`.github/instructions/changelog_md.instructions.md`](../../instructions/changelog_md.instructions.md) — Formatting rules applied when editing `CHANGELOG.md`.
