# Changelog

All notable changes to the **CodeQL Development MCP Server** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
aligned with the [CodeQL CLI](https://github.com/github/codeql-cli-binaries/releases)
release cadence.

> **Scope**: Only stable (non-pre-release, non-RC) tagged versions are listed.
> Pre-release and release-candidate tags (e.g., `v2.25.0-rc1`) are omitted.

## [Unreleased]

_Changes on `main` since the latest tagged release that have not yet been included in a stable release._

### Highlights

- **Second supply-chain hardening pass for release workflows** — All release-generating workflows now opt out of every cache step, pin runners, strictly validate version inputs, and refuse mid-publish cancellation. See **Security** below for the full inventory. ([#279](https://github.com/advanced-security/codeql-development-mcp-server/pull/279))
- **First-class Rust toolchain support in CI** — `setup-codeql-environment` now installs a pinned Rust toolchain (default `1.80.0`, via a pinned `dtolnay/rust-toolchain` action with `rust-src`) for any matrix entry that includes `rust`, so the CodeQL rust extractor can expand `format!` / `println!` / `vec!` macros against the standard library on Linux runners. The `query-unit-tests.yml` workflow now passes `languages: ${{ matrix.language }}` so each matrix entry only installs its own runtime. ([#279](https://github.com/advanced-security/codeql-development-mcp-server/pull/279))

### Added

#### VS Code Extension

- **Built-in portable custom agents** — The extension now ships two `.agent.md` custom agents (`ql-mcp-ext-query-developer`, `ql-mcp-ext-workshop-author`) bundled inside the VSIX and contributed declaratively via `contributes.chatAgents`, so both agents are discoverable in VS Code Copilot Chat without any manual configuration. The `ql-mcp-ext-` prefix distinguishes extension-shipped customizations from repo-native `.github/agents/` definitions. No specific model is required — users choose their own. To add personal or team agents, set [`chat.agentFilesLocations`](https://code.visualstudio.com/docs/copilot/customization/custom-agents) to a workspace-relative path directly (VS Code rejects absolute paths there, so the extension does not write to that setting). ([#281](https://github.com/advanced-security/codeql-development-mcp-server/pull/281))
- **Build-time overlay for custom VSIXes** — A `--customizations-dir` CLI flag (or `CODEQL_MCP_CUSTOMIZATIONS_DIR` env var) on `bundle:customizations` enables building custom VSIXes with overlay agents and skills. ([#281](https://github.com/advanced-security/codeql-development-mcp-server/pull/281))
- **`codeql-mcp.showAgentsStatus` command** — New Command Palette entry (**CodeQL MCP: Show Built-in Custom Agents Status**) that reports the bundled directory and the agents contributed via `contributes.chatAgents`. ([#281](https://github.com/advanced-security/codeql-development-mcp-server/pull/281))
- **Bundled skills** — Two skills (`ql-mcp-ext-create-workshop`, `ql-mcp-ext-validate-tools-queries`) are copied into the VSIX as static `contributes.chatSkills` contributions so they are available to Copilot Chat alongside the bundled agents. Source dirs in `.github/skills/` retain their original names; the bundler renames on copy and rewrites the `name:` frontmatter so the VS Code skill registry resolves them under the bundled name. ([#281](https://github.com/advanced-security/codeql-development-mcp-server/pull/281))

### Changed

#### VS Code Extension

- **Workflow prompts now come exclusively from the `ql-mcp` MCP server** — Previously the extension also bundled four `.prompt.md` files (`ql-mcp-ext-tdd-basic`, `ql-mcp-ext-tdd-advanced`, `ql-mcp-ext-tools-query-workflow`, `ql-mcp-ext-workshop-creation-workflow`) as `contributes.chatPromptFiles`. Those were byte-for-byte renamed copies of prompts the MCP server already serves via `prompts/list`, which Copilot Chat surfaces as slash commands (`/ql_tdd_basic`, etc.). The duplicate `chatPromptFiles` contributions have been removed; the two shipped agents now reference an expanded set of canonical MCP slash IDs (`/ql_tdd_basic`, `/ql_tdd_advanced`, `/ql_lsp_iterative_development`, `/tools_query_workflow`, `/explain_codeql_query`, `/document_codeql_query`, `/data_extension_development`, `/workshop_creation_workflow`) so users get a richer workflow palette without the duplicate-slash-command UX. ([#281](https://github.com/advanced-security/codeql-development-mcp-server/pull/281))

#### Infrastructure & CI/CD

- The `setup-codeql-environment` composite action gained an `enable-cache` input (default `true`) that gates every cache-related step it owns (gh-codeql, language-runtimes, .NET packages) and every `cache:` feature it passes to `actions/setup-*`. Release workflows now pass `enable-cache: false`. ([#279](https://github.com/advanced-security/codeql-development-mcp-server/pull/279))
- The `setup-codeql-environment` composite action now sets up Rust (default `1.80.0`, configurable via `rust-version`) when `rust` is in the `languages` input, including a dedicated cache for `~/.cargo`/`~/.rustup` and a Cargo dependency-file detector. **Rust is opt-in only** — it is intentionally NOT included in the default `languages` value (`csharp,go,java,javascript,python,ruby`) because the Rust toolchain (rustc + cargo + rust-src) is a several-hundred-megabyte download. Callers that need Rust support must pass an explicit `languages:` override that includes `rust` (e.g. `languages: ${{ matrix.language }}` from a per-language matrix entry). ([#279](https://github.com/advanced-security/codeql-development-mcp-server/pull/279))
- The `setup-codeql-environment` composite action now matches the `languages` input with comma-bounded tokens (`contains(format(',{0},', inputs.languages), ',java,')`) instead of bare substring `contains()`. This fixes a latent bug where the JavaScript matrix entry triggered the Java setup steps because `contains('javascript', 'java')` was true. ([#279](https://github.com/advanced-security/codeql-development-mcp-server/pull/279))
- `query-unit-tests.yml` matrix entries now pass `languages: ${{ matrix.language }}` to the composite action so each language matrix entry installs only its own runtime instead of the full default set, and `runs-on` is pinned to `ubuntu-24.04`. ([#279](https://github.com/advanced-security/codeql-development-mcp-server/pull/279))
- All release workflow `version` inputs (in `release.yml`, `release-tag.yml`, `release-npm.yml`, `release-vsix.yml`, `release-codeql.yml`) now document the actual accepted format (`^vMAJOR.MINOR.PATCH(-PRERELEASE)?$` where `PRERELEASE` may contain alphanumerics, dots, and hyphens) and are validated against that regex via an `env:` intermediate variable. Validation also runs `git check-ref-format "refs/tags/${VERSION}"` so values that pass the regex but are rejected by git as a tag ref (e.g. `v1.2.3-..`, `v1.2.3-foo.`, `v1.2.3-foo.lock`, `v1.2.3-a..b`) are caught up front instead of failing later in `actions/checkout`. ([#279](https://github.com/advanced-security/codeql-development-mcp-server/pull/279))

### Fixed

- **Rust `PrintAST` and `PrintCFG` unit tests failed on CI.** Two distinct root causes: (1) CI had no Rust toolchain installed, so the extractor could not expand `format!`/`println!`/`vec!` and the entire `getMacroCallExpansion()` subtrees were missing from `PrintAST` output; (2) the legacy rust test extractor produces non-deterministic CFG entity ordering under parallel evaluation, which made the `PrintCFG` snapshot test flaky (5 distinct outputs across 5 runs with `--threads=-1`, identical output across every run with `--threads=1`). Fixes: install Rust in CI via the composite action; regenerate the rust `PrintAST.expected` baseline; and force `--threads=1` for the rust language entry in `run-query-unit-tests.sh` so `PrintCFG` produces deterministic output. ([#279](https://github.com/advanced-security/codeql-development-mcp-server/pull/279))
- **`run-query-unit-tests.sh` broke the Swift macOS workflow with `unbound variable`.** Bash 3.2 (the default `/bin/bash` on macOS GitHub Actions runners) errors when expanding an empty array under `set -u`. Replaced the `local _threads_arg=()` array with a plain scalar string and unquoted expansion so the script is portable across Bash 3.2 and 4+. ([#279](https://github.com/advanced-security/codeql-development-mcp-server/pull/279))

### Security

### Dependencies

- Bumped `actions/dependency-review-action` from 4.9.0 to 5.0.0. ([#278](https://github.com/advanced-security/codeql-development-mcp-server/pull/278))
- Added `dtolnay/rust-toolchain` (pinned to the `stable` branch commit SHA `29eef336d9b2848a0b548edc03f92a220660cdb8`) as a new dependency of `setup-codeql-environment` for the rust language. ([#279](https://github.com/advanced-security/codeql-development-mcp-server/pull/279))

## [v2.25.4] — 2026-05-08

### Highlights

- **Upgraded CodeQL CLI to v2.25.4** — Full compatibility with the latest CodeQL CLI release, including upgraded QL pack dependencies for all supported languages and re-baselined `PrintCFG` test expectations for C# (csharp-all 6.0.0 dropped the legacy `ControlFlow::Node` namespace) and Java (deterministic node-ordering change). ([#272](https://github.com/advanced-security/codeql-development-mcp-server/pull/272))
- **First-class Models-as-Data (MaD) authoring support** — New `data_extension_development` workflow prompt plus a `codeql://learning/data-extensions` overview resource and per-language `codeql://languages/<lang>/library-modeling` guides for every CodeQL language that supports MaD upstream (`cpp`, `csharp`, `go`, `java`, `javascript`, `python`, `ruby`, `rust`, `swift`). ([#271](https://github.com/advanced-security/codeql-development-mcp-server/pull/271))
- **`codeql_query_run` auto-caches results for `@kind problem` / `path-problem` / `graph` queries by default** — The post-processor now infers `format` from the query's `@kind` metadata when the caller omits it, so SARIF (`sarif-latest`) and graph (`graphtext`) output is generated and added to the query results cache automatically, matching the documented behavior. ([#275](https://github.com/advanced-security/codeql-development-mcp-server/pull/275))

### Added

#### MCP Server Prompts

| Prompt                       | Description                                                                                                                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data_extension_development` | End-to-end workflow for authoring CodeQL data extensions (Models-as-Data) for third-party libraries; restricts `language` to MaD-supported languages. ([#271](https://github.com/advanced-security/codeql-development-mcp-server/pull/271)) |

#### MCP Server Resources

| URI                                              | Description                                                                                                                                                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `codeql://learning/data-extensions`              | Models-as-Data (MaD) overview: YAML model formats, extensible predicates, and model-pack layout. ([#271](https://github.com/advanced-security/codeql-development-mcp-server/pull/271))                  |
| `codeql://languages/cpp/library-modeling`        | C/C++-specific library-modeling guide for the `data_extension_development` workflow. ([#271](https://github.com/advanced-security/codeql-development-mcp-server/pull/271))                              |
| `codeql://languages/csharp/library-modeling`     | C#-specific library-modeling guide for the `data_extension_development` workflow. ([#271](https://github.com/advanced-security/codeql-development-mcp-server/pull/271))                                 |
| `codeql://languages/go/library-modeling`         | Go-specific library-modeling guide for the `data_extension_development` workflow. ([#271](https://github.com/advanced-security/codeql-development-mcp-server/pull/271))                                 |
| `codeql://languages/java/library-modeling`       | Java/Kotlin-specific library-modeling guide for the `data_extension_development` workflow. ([#271](https://github.com/advanced-security/codeql-development-mcp-server/pull/271))                        |
| `codeql://languages/javascript/library-modeling` | JavaScript/TypeScript-specific library-modeling guide for the `data_extension_development` workflow. ([#271](https://github.com/advanced-security/codeql-development-mcp-server/pull/271))              |
| `codeql://languages/python/library-modeling`     | Python-specific library-modeling guide for the `data_extension_development` workflow. ([#271](https://github.com/advanced-security/codeql-development-mcp-server/pull/271))                             |
| `codeql://languages/ruby/library-modeling`       | Ruby-specific library-modeling guide for the `data_extension_development` workflow. ([#271](https://github.com/advanced-security/codeql-development-mcp-server/pull/271))                               |
| `codeql://languages/rust/library-modeling`       | Rust-specific library-modeling guide (crate-path-based MaD format) for the `data_extension_development` workflow. ([#271](https://github.com/advanced-security/codeql-development-mcp-server/pull/271)) |
| `codeql://languages/swift/library-modeling`      | Swift-specific library-modeling guide (MaD tuple format) for the `data_extension_development` workflow. ([#271](https://github.com/advanced-security/codeql-development-mcp-server/pull/271))           |

With these additions, every CodeQL language that supports Models-as-Data upstream (`cpp`, `csharp`, `go`, `java`, `javascript`, `python`, `ruby`, `rust`, `swift`) now has a registered `codeql://languages/<lang>/library-modeling` resource. `actions` is intentionally excluded because it does not support data extensions.

### Fixed

- **`codeql_query_run` did not auto-cache results for `@kind problem` / `@kind path-problem` / `@kind graph` queries when `format` was not provided** — The query result post-processor only ran BQRS interpretation (and therefore only populated the query results cache) when the caller passed an explicit `format`. The tool description already documented that `format` defaults based on `@kind`, but the implementation returned early. The post-processor now reads the query's `@kind` metadata and defaults `format` to `sarif-latest` for `problem`/`path-problem` queries and `graphtext` for `graph` queries, so SARIF/graphtext output is generated and cached automatically. Explicitly-provided `format` values continue to take precedence. ([#275](https://github.com/advanced-security/codeql-development-mcp-server/pull/275))
- **C# `PrintCFG` query failed to compile against `codeql/csharp-all` 6.0.0** — The legacy `ControlFlow::Node` namespace was removed by the new pack; the query now uses `ControlFlowNode` directly and the `PrintCFG.expected` baseline has been regenerated against the new CFG (`Entry` / `Normal Exit` / `Exit` markers and explicit `Before <expr>` nodes). The Java `PrintCFG.expected` baseline was also re-generated to absorb a deterministic node-ordering change in CodeQL CLI v2.25.4 (same nodes and edges, reordered). ([#272](https://github.com/advanced-security/codeql-development-mcp-server/pull/272))

### Dependencies

- Upgraded CodeQL CLI dependency to v2.25.4 and synchronized all `ql-mcp-*` pack dependencies to the matching upstream library packs. ([#272](https://github.com/advanced-security/codeql-development-mcp-server/pull/272))
- Bumped `hono` from 4.12.14 to 4.12.18. ([#273](https://github.com/advanced-security/codeql-development-mcp-server/pull/273))
- Bumped `fast-uri` (transitive) from 3.1.0 to 3.1.2. ([#277](https://github.com/advanced-security/codeql-development-mcp-server/pull/277))

### Changed

#### Infrastructure & CI/CD

- Tightened `on.paths` triggers for the `build-server`, `build-and-test-client`, and `build-and-test-extension` workflows so unrelated changes no longer re-run the matrix builds. ([#274](https://github.com/advanced-security/codeql-development-mcp-server/pull/274))

**Full Changelog**: [`v2.25.3...v2.25.4`](https://github.com/advanced-security/codeql-development-mcp-server/compare/v2.25.3...v2.25.4)

---

## [v2.25.3] — 2026-05-04

### Highlights

- **Upgraded CodeQL CLI to v2.25.3** — Full compatibility with the latest CodeQL CLI release. The release also fixes `upgrade-packs.sh` so that pack lock files are actually refreshed on CLI bumps (previously a no-op for packs with pinned `codeql/<lang>-all` dependencies), regenerates all `codeql-pack.lock.yml` files, and re-baselines Ruby / Rust / Swift `PrintAST` and `PrintCFG` expected outputs for benign ordering and macro-expansion changes introduced by the upgraded upstream packs. ([#269](https://github.com/advanced-security/codeql-development-mcp-server/pull/269), [#270](https://github.com/advanced-security/codeql-development-mcp-server/pull/270))
- **Schema fix unblocks GitHub Copilot Chat** — Replaced `z.tuple([...])` parameters on `query_results_cache_retrieve` with `z.object({ start, end })` so the MCP SDK emits a valid JSON Schema accepted by Copilot Chat's strict validator. ([#263](https://github.com/advanced-security/codeql-development-mcp-server/pull/263))
- **Supply-chain hardening for npm and GitHub Actions** — Pinned npm install scripts, enforced `--ignore-scripts` on CI installs, and tightened action SHA pinning across workflows. ([#258](https://github.com/advanced-security/codeql-development-mcp-server/pull/258))

### Fixed

- **`query_results_cache_retrieve` rejected by GitHub Copilot Chat (HTTP 400 invalid schema)** — The `lineRange` and `resultIndices` parameters were defined with `z.tuple([...])`, which the MCP SDK serialized to a bare-array JSON Schema value (e.g. `[{"type":"integer"}, {"type":"integer"}]`). GitHub Copilot Chat enforces strict JSON Schema validation and rejected the entire `ql-mcp` server with `"... is not of type 'object', 'boolean'"`. Both parameters now use `z.object({ start, end })` so they serialize to a valid `type: "object"` JSON Schema. Tool callers must now pass `{ "lineRange": { "start": 1, "end": 10 } }` instead of `{ "lineRange": [1, 10] }`. ([#263](https://github.com/advanced-security/codeql-development-mcp-server/pull/263))
- **`upgrade-packs.sh` left pack lock files unchanged on CLI bumps** — `codeql pack upgrade` was a no-op for packs with pinned `codeql/<lang>-all` dependencies because the existing pin already satisfied the constraint. The script now temporarily rewrites the pinned dependency to a wildcard before running `codeql pack upgrade`, then restores the manifest pinned to the resolved version, so lock files are actually refreshed against the new CLI. ([#269](https://github.com/advanced-security/codeql-development-mcp-server/pull/269))
- **Scheduled `update-codeql` workflow could force-push over reviewer commits** — Added a `check-existing-branch` gate so that on `schedule` (cron) runs the workflow is skipped when the target `codeql/upgrade-to-vX.Y.Z` branch already exists on origin. The check is bypassed on `workflow_dispatch` so maintainers can still force a refresh manually. ([#269](https://github.com/advanced-security/codeql-development-mcp-server/pull/269))
- **Rust `PrintAST` / `PrintCFG` expected output mismatched CI** — Re-learned the Rust `.expected` baselines with `rustc`/`cargo` installed (matching the CI runner's `install-language-runtimes: true` setting) so that `println!`-style macros are expanded into their stdlib internals as they are on CI. ([#270](https://github.com/advanced-security/codeql-development-mcp-server/pull/270))

### Changed

#### Infrastructure & CI/CD

- Hardened the supply chain for npm dependencies and GitHub Actions workflows: stricter SHA pinning, `--ignore-scripts` on CI installs, and audit-trail improvements. ([#258](https://github.com/advanced-security/codeql-development-mcp-server/pull/258))
- Merged the `next` integration branch into `main` to consolidate release-prep history. ([#260](https://github.com/advanced-security/codeql-development-mcp-server/pull/260))

### Dependencies

- Upgraded CodeQL CLI dependency to v2.25.3 and re-pinned all `ql-mcp-*` pack dependencies to the matching upstream library packs (with regenerated lock files for every supported language). ([#269](https://github.com/advanced-security/codeql-development-mcp-server/pull/269))
- Bumped the `all-npm-dependencies` group across 4 directories with 5 updates. ([#257](https://github.com/advanced-security/codeql-development-mcp-server/pull/257))
- Bumped the `all-npm-dependencies` dev-dependency group across 4 directories with 3 updates. ([#259](https://github.com/advanced-security/codeql-development-mcp-server/pull/259))
- Bumped `actions/cache` from 5.0.4 to 5.0.5. ([#256](https://github.com/advanced-security/codeql-development-mcp-server/pull/256))
- Bumped `actions/upload-artifact` from 7.0.0 to 7.0.1. ([#255](https://github.com/advanced-security/codeql-development-mcp-server/pull/255))
- Bumped `actions/setup-node` from 6.3.0 to 6.4.0. ([#264](https://github.com/advanced-security/codeql-development-mcp-server/pull/264))
- Bumped `actions/setup-go` from 5.6.0 to 6.4.0. ([#265](https://github.com/advanced-security/codeql-development-mcp-server/pull/265))
- Bumped `peter-evans/create-pull-request` from 8.1.0 to 8.1.1. ([#253](https://github.com/advanced-security/codeql-development-mcp-server/pull/253))
- Bumped `softprops/action-gh-release` from 2.6.1 to 3.0.0. ([#254](https://github.com/advanced-security/codeql-development-mcp-server/pull/254))

**Full Changelog**: [`v2.25.2...v2.25.3`](https://github.com/advanced-security/codeql-development-mcp-server/compare/v2.25.2...v2.25.3)

---

## [v2.25.2] — 2026-04-15

### Highlights

- **Prompt auto-completions and optional language derivation** — All 14 workflow prompts now provide auto-complete suggestions for parameters like `queryPath`, `database`, `language`, and `sarifPath` via the MCP SDK's `completable()` function. Several prompts no longer require the `language` parameter, automatically deriving it from the nearest `codeql-pack.yml`. ([#230](https://github.com/advanced-security/codeql-development-mcp-server/pull/230))
- **LLM-friendly tool input validation** — CLI tools now silently normalize camelCase and snake_case parameter names to kebab-case, and report all validation errors at once instead of one-at-a-time, reducing failed tool invocations. ([#224](https://github.com/advanced-security/codeql-development-mcp-server/pull/224), [#227](https://github.com/advanced-security/codeql-development-mcp-server/pull/227))
- **SARIF analysis tools and persistent workflow state** — Added 5 SARIF analysis tools, annotation/audit/cache tools backed by a new `SqliteStore`, and first-class Rust language support with 10 languages now covered. ([#169](https://github.com/advanced-security/codeql-development-mcp-server/pull/169), [#195](https://github.com/advanced-security/codeql-development-mcp-server/pull/195), [#204](https://github.com/advanced-security/codeql-development-mcp-server/pull/204))
- **Upgraded CodeQL CLI to v2.25.2** — Full compatibility with the latest CodeQL CLI release, including upgraded QL pack dependencies for all supported languages. Fixed `upgrade-packs.sh` to include Rust packs in the all-languages upgrade loop. ([#195](https://github.com/advanced-security/codeql-development-mcp-server/pull/195))

### Added

#### MCP Server Tools

| Tool                                                                                                                     | Description                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `annotation_create`, `annotation_get`, `annotation_list`, `annotation_update`, `annotation_delete`, `annotation_search`  | General-purpose annotation tools for creating, managing, and searching notes and bookmarks on analysis entities. ([#169](https://github.com/advanced-security/codeql-development-mcp-server/pull/169))                                                                     |
| `audit_store_findings`, `audit_list_findings`, `audit_add_notes`, `audit_clear_repo`                                     | Repo-keyed audit tools for MRVA finding management and triage workflows. ([#169](https://github.com/advanced-security/codeql-development-mcp-server/pull/169))                                                                                                             |
| `query_results_cache_lookup`, `query_results_cache_retrieve`, `query_results_cache_clear`, `query_results_cache_compare` | Query result cache tools for lookup, subset retrieval, cache clearing, and cross-database comparison. ([#169](https://github.com/advanced-security/codeql-development-mcp-server/pull/169))                                                                                |
| `sarif_list_rules`, `sarif_extract_rule`, `sarif_rule_to_markdown`, `sarif_compare_alerts`, `sarif_diff_runs`            | SARIF analysis tools for rule discovery, per-rule extraction, Mermaid dataflow visualization, alert overlap comparison, and cross-run behavioral diffing. ([#204](https://github.com/advanced-security/codeql-development-mcp-server/pull/204))                            |
| `sarif_store`, `sarif_deduplicate_rules`                                                                                 | SARIF session cache ingest and cross-file rule deduplication tools. `sarif_compare_alerts` enhanced with `fingerprint` overlap mode with automatic fallback to full-path comparison. ([#234](https://github.com/advanced-security/codeql-development-mcp-server/pull/234)) |

#### MCP Server Resources

| URI                           | Description                                                                                                                                                                       |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `codeql://languages/rust/ast` | Rust AST reference resource with verified accessor predicates for CodeQL query development. ([#195](https://github.com/advanced-security/codeql-development-mcp-server/pull/195)) |

#### MCP Server Prompts

| Prompt                       | Description                                                                                                                                                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `compare_overlapping_alerts` | Multi-SARIF alert comparison workflow: compares alerts across rules, files, runs, databases, or CodeQL versions with 8-step guided analysis using SARIF tools. ([#204](https://github.com/advanced-security/codeql-development-mcp-server/pull/204)) |

#### CodeQL Query Packs

| Pack            | Description                                                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rust tools pack | Added `PrintAST`, `PrintCFG`, `CallGraphFrom`, `CallGraphTo`, and `CallGraphFromTo` support for Rust. ([#195](https://github.com/advanced-security/codeql-development-mcp-server/pull/195)) |

#### Infrastructure & CI/CD

- Added Rust coverage to CI and release workflows, including query unit tests and VSIX bundling. ([#195](https://github.com/advanced-security/codeql-development-mcp-server/pull/195))
- Added client integration tests for the new Rust queries and for the annotation, audit, and cache tool suites, including an MRVA triage workflow end-to-end test. ([#169](https://github.com/advanced-security/codeql-development-mcp-server/pull/169), [#195](https://github.com/advanced-security/codeql-development-mcp-server/pull/195))
- Added missing `Cargo.lock` files and `ext/` crate scaffolding for Rust query test fixtures (`CallGraphFromTo`, `CallGraphTo`, `PrintCFG`). ([#210](https://github.com/advanced-security/codeql-development-mcp-server/pull/210))
- Added `code-scanning` and `sarif` subcommand groups to `gh-ql-mcp-client` with GitHub REST API client integration via `go-gh` for Code Scanning alert lifecycle management. ([#234](https://github.com/advanced-security/codeql-development-mcp-server/pull/234))
- Added `gh` extension packaging support with cross-compilation targets for `darwin/amd64`, `darwin/arm64`, `linux/amd64`, `linux/arm64`, `windows/amd64`. ([#234](https://github.com/advanced-security/codeql-development-mcp-server/pull/234))

### Changed

#### MCP Server Tools

| Tool                                   | Change                                                                                                                                                                                                                                                                                    |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| All CLI tools                          | camelCase and snake_case parameter names are now silently normalized to kebab-case; unknown properties are rejected with the property name and a "did you mean?" suggestion. ([#224](https://github.com/advanced-security/codeql-development-mcp-server/pull/224))                        |
| All tools (validation)                 | Validation errors are now reported all-at-once instead of one-at-a-time, reducing iterative trial-and-error tool invocations. ([#227](https://github.com/advanced-security/codeql-development-mcp-server/pull/227))                                                                       |
| `codeql_query_run`                     | Query results are now auto-cached after SARIF interpretation, enabling later lookup and comparison workflows. ([#169](https://github.com/advanced-security/codeql-development-mcp-server/pull/169))                                                                                       |
| query metadata and database resolution | Added in-memory caching with mtime-based invalidation and deduplicated resolution logic for better performance. ([#169](https://github.com/advanced-security/codeql-development-mcp-server/pull/169))                                                                                     |
| `codeql_bqrs_interpret`                | Added optional `database` parameter mapped to `--source-archive` for SARIF source context; validates that `src.zip` or `src` exists. ([#199](https://github.com/advanced-security/codeql-development-mcp-server/pull/199))                                                                |
| `codeql_bqrs_info`                     | **Breaking**: renamed `files` (array) parameter to `file` (string) to match the CLI which accepts exactly one file. ([#199](https://github.com/advanced-security/codeql-development-mcp-server/pull/199))                                                                                 |
| `codeql_database_analyze`              | Results are now auto-cached after SARIF output for `query_results_cache_compare` and `query_results_cache_retrieve`; concurrent calls to the same database are serialized via a per-database mutex. ([#199](https://github.com/advanced-security/codeql-development-mcp-server/pull/199)) |
| `audit_add_notes`                      | Added `findingId` as preferred lookup; `owner`/`repo`/`sourceLocation`/`line` are now optional fallback fields. ([#199](https://github.com/advanced-security/codeql-development-mcp-server/pull/199))                                                                                     |
| `annotation_search`                    | Category field is now matched with case-insensitive `COLLATE NOCASE` alongside the existing FTS index. ([#199](https://github.com/advanced-security/codeql-development-mcp-server/pull/199))                                                                                              |
| `query_results_cache_compare`          | SARIF content fallback for result count is now gated on SARIF output format, avoiding unnecessary JSON parsing of non-SARIF cache entries. ([#199](https://github.com/advanced-security/codeql-development-mcp-server/pull/199))                                                          |
| `sarif_list_rules`                     | Documented per-rule `resultCount` field in the `server-tools.md` MCP resource with JSON response schema and field reference table. ([#219](https://github.com/advanced-security/codeql-development-mcp-server/pull/219))                                                                  |

#### MCP Server Prompts

- All 14 workflow prompts now provide auto-complete suggestions for `queryPath`, `database`, `language`, `sarifPath`, `workspaceUri`, and `packRoot` parameters via `completable()`. ([#230](https://github.com/advanced-security/codeql-development-mcp-server/pull/230))
- `language` parameter is now optional on `workshop_creation_workflow`, `explain_codeql_query`, `document_codeql_query`, and `ql_lsp_iterative_development` prompts, with auto-derivation from `codeql-pack.yml`. ([#230](https://github.com/advanced-security/codeql-development-mcp-server/pull/230))

#### VS Code Extension

- `McpProvider.requestRestart()` now invalidates the environment cache and bumps a `+rN` revision suffix so VS Code reliably restarts the MCP server after configuration changes. ([#196](https://github.com/advanced-security/codeql-development-mcp-server/pull/196))
- Cached the extension version in the provider constructor to avoid repeated synchronous reads of `package.json`. ([#196](https://github.com/advanced-security/codeql-development-mcp-server/pull/196))
- New `codeql-mcp.enableAnnotationTools` setting (default: `true`) auto-sets `ENABLE_ANNOTATION_TOOLS` and `MONITORING_STORAGE_LOCATION` environment variables; `additionalEnv` overrides for advanced users. ([#199](https://github.com/advanced-security/codeql-development-mcp-server/pull/199))
- `CliResolver` ensures only one resolution runs at a time, validates PATH-discovered binaries, and uses generation tokens to prevent stale cache writes after invalidation. ([#230](https://github.com/advanced-security/codeql-development-mcp-server/pull/230))
- `PackInstaller` uses consistent "download" terminology for `codeql pack download` operations with detailed per-language logging. ([#230](https://github.com/advanced-security/codeql-development-mcp-server/pull/230))
- `McpProvider.fireDidChange` debounces rapid-fire notifications and clears pending timers on dispose/restart. ([#230](https://github.com/advanced-security/codeql-development-mcp-server/pull/230))
- File watchers use relative paths in log messages and no longer trigger MCP definition changes for content-only file events. ([#230](https://github.com/advanced-security/codeql-development-mcp-server/pull/230))
- The earlier `codeql-mcp.enableAnnotationTools` setting is no longer applicable and has been removed from the extension as annotation tools are now enabled by default. ([#223](https://github.com/advanced-security/codeql-development-mcp-server/pull/223))

#### Infrastructure & CI/CD

- Refactored monolithic server logic into focused `database-resolver`, `query-resolver`, `result-processor`, and `codeql-version` modules for maintainability and reuse. ([#169](https://github.com/advanced-security/codeql-development-mcp-server/pull/169))
- `extract-test-databases.sh` now defaults to `--scope integration` for efficient CI runs; `--language` implies `--scope all`. ([#228](https://github.com/advanced-security/codeql-development-mcp-server/pull/228))

### Fixed

- **Workspace folder changes could leave the MCP server stopped but not restarted** — The VS Code extension now rebuilds the environment and forces a proper restart when workspace folders change. ([#196](https://github.com/advanced-security/codeql-development-mcp-server/pull/196))
- **`codeql_bqrs_interpret` unusable through MCP interface** — Added `database` parameter mapped to `--source-archive` with `src.zip`/`src` fallback and clear error when neither exists. ([#199](https://github.com/advanced-security/codeql-development-mcp-server/pull/199))
- **`query_results_cache_compare` reported `totalResultCount: 0`** — Result count is now computed from SARIF `runs[0].results.length` at cache time; compare tool falls back to parsing cached SARIF content only for SARIF-format entries. ([#199](https://github.com/advanced-security/codeql-development-mcp-server/pull/199))
- **`annotation_search` ignored `category` field** — Extended FTS search condition to also match category with case-insensitive `COLLATE NOCASE`. ([#199](https://github.com/advanced-security/codeql-development-mcp-server/pull/199))
- **`audit_add_notes` ignored `findingId`** — Added `findingId` as preferred direct-lookup alternative to the composite key fields. ([#199](https://github.com/advanced-security/codeql-development-mcp-server/pull/199))
- **`codeql_bqrs_info` `files` array caused CLI error** — Changed parameter from `files` (array) to `file` (string) to match the CLI expectation. ([#199](https://github.com/advanced-security/codeql-development-mcp-server/pull/199))
- **Per-database mutex lock key not normalized** — Database lock key now uses `realpath` to prevent bypassing serialization with relative paths, symlinks, or different casing. ([#199](https://github.com/advanced-security/codeql-development-mcp-server/pull/199))
- **`upgrade-packs.sh` missing Rust from all-languages upgrade loop** — Added `upgrade_packs "server/ql/rust/tools"` to the script, fixing CI failures where `codeql/rust-all` was not found in the pack download cache during CodeQL CLI upgrades. ([#195](https://github.com/advanced-security/codeql-development-mcp-server/pull/195))
- **Stale `interpretedOutput` directories in integration tests** — The integration test runner now cleans up stale output before running directory comparison tests. ([#228](https://github.com/advanced-security/codeql-development-mcp-server/pull/228))

### Dependencies

- Upgraded CodeQL CLI dependency to v2.25.2.
- Upgraded all `ql-mcp-*` pack dependencies and regenerated lock files for all supported languages.
- Replaced `lowdb` with `sql.js` as the persistence backend, removing the previous JSON-file storage dependency. ([#169](https://github.com/advanced-security/codeql-development-mcp-server/pull/169))
- Added `codeql/rust-all` support for the new Rust tool queries. ([#195](https://github.com/advanced-security/codeql-development-mcp-server/pull/195))
- Bumped `typescript` from 5.9.3 to 6.0.2, `esbuild` from 0.27.4 to 0.28.0, `@modelcontextprotocol/sdk` to 1.29.0, `dotenv` to 17.4.0, `typescript-eslint` to 8.58.0, and `adm-zip` to 0.5.17. ([#205](https://github.com/advanced-security/codeql-development-mcp-server/pull/205))
- Updated `eslint`, `prettier`, `@types/node`, `@types/vscode`, `@vitest/coverage-v8`, and `vitest` to latest compatible versions. ([#245](https://github.com/advanced-security/codeql-development-mcp-server/pull/245))
- Bumped minimum Node.js version from `>=24.13.0` to `>=25.6.0` across root, server, and VS Code extension workspaces. ([#240](https://github.com/advanced-security/codeql-development-mcp-server/pull/240))
- Bumped VS Code engine from `^1.110.0` to `^1.115.0` and `@types/vscode` to match. ([#240](https://github.com/advanced-security/codeql-development-mcp-server/pull/240))
- Updated devcontainer image from `typescript-node:24` to `typescript-node:25`. ([#240](https://github.com/advanced-security/codeql-development-mcp-server/pull/240))

### New Contributors

- [@Copilot](https://github.com/apps/copilot-swe-agent) made their first contribution in [#195](https://github.com/advanced-security/codeql-development-mcp-server/pull/195)

**Full Changelog**: [`v2.25.1...v2.25.2`](https://github.com/advanced-security/codeql-development-mcp-server/compare/v2.25.1...v2.25.2)

---

## [v2.25.1] — 2026-03-29

### Highlights

- **Upgraded CodeQL CLI to v2.25.1** — Full compatibility with the latest CodeQL CLI release, including upgraded QL pack dependencies for all supported languages. ([#192](https://github.com/advanced-security/codeql-development-mcp-server/pull/192))
- **Added `CHANGELOG.md` with full release history** — Comprehensive changelog following [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format, with a maintenance agent skill and `markdownlint` CI enforcement. ([#193](https://github.com/advanced-security/codeql-development-mcp-server/pull/193))

### Added

#### Infrastructure & CI/CD

- Added `CHANGELOG.md` covering all stable releases (v2.24.0 through v2.25.0) with Highlights, Added, Changed, Fixed, Dependencies, and other standard sections. ([#193](https://github.com/advanced-security/codeql-development-mcp-server/pull/193))
- Added `maintain-changelog` agent skill (`.github/skills/maintain-changelog/SKILL.md`) with a 5-phase workflow for drafting, classifying, and promoting changelog entries. ([#193](https://github.com/advanced-security/codeql-development-mcp-server/pull/193))
- Added `changelog_md.instructions.md` applied automatically when editing `CHANGELOG.md`. ([#193](https://github.com/advanced-security/codeql-development-mcp-server/pull/193))
- Added `markdownlint-cli` with `.markdownlint.yml` config and `.markdownlintignore`, enforced via `npm run lint:md` and the `lint-and-format.yml` CI workflow. ([#193](https://github.com/advanced-security/codeql-development-mcp-server/pull/193))

### Fixed

- **`upgrade-packs.sh` not enforcing explicit upgrades** — Fixed the pack upgrade script to always regenerate lock files and display output on failure, preventing silent staleness during CodeQL CLI upgrades. ([#192](https://github.com/advanced-security/codeql-development-mcp-server/pull/192))

### Dependencies

- Upgraded CodeQL CLI dependency to v2.25.1. ([#192](https://github.com/advanced-security/codeql-development-mcp-server/pull/192))
- Upgraded all `ql-mcp-*` pack dependencies and regenerated lock files for all supported languages. ([#192](https://github.com/advanced-security/codeql-development-mcp-server/pull/192))
- Added `markdownlint-cli` as a root dev dependency. ([#193](https://github.com/advanced-security/codeql-development-mcp-server/pull/193))

**Full Changelog**: [`v2.25.0...v2.25.1`](https://github.com/advanced-security/codeql-development-mcp-server/compare/v2.25.0...v2.25.1)

---

## [v2.25.0] — 2026-03-27

### Highlights

- **Duplicated code detection prompts and tools** — New workflow prompts and supporting tools for identifying and reporting duplicated code patterns across CodeQL databases, contributed by [@MichaelRFairhurst](https://github.com/MichaelRFairhurst). ([#109](https://github.com/advanced-security/codeql-development-mcp-server/pull/109))
- **CallGraphFromTo queries for all supported languages** — Unified call-graph entry-point queries added for every language pack. ([#168](https://github.com/advanced-security/codeql-development-mcp-server/pull/168))
- **Upgraded CodeQL CLI to v2.25.0** — Full compatibility with the latest CodeQL CLI release. ([#161](https://github.com/advanced-security/codeql-development-mcp-server/pull/161))

### Added

#### MCP Server Tools

| Tool                        | Description                                                                                                                                                                                    |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check_for_duplicated_code` | Detects duplicated code patterns across CodeQL databases to support the duplicate-code workflow prompts. ([#109](https://github.com/advanced-security/codeql-development-mcp-server/pull/109)) |
| `find_overlapping_queries`  | Finds overlapping or redundant CodeQL queries to support the duplicate-code workflow prompts. ([#109](https://github.com/advanced-security/codeql-development-mcp-server/pull/109))            |

#### MCP Server Prompts

| Prompt                      | Description                                                                                                                                                                          |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `check_for_duplicated_code` | Guides agents through finding and reporting duplicated code patterns across a CodeQL database. ([#109](https://github.com/advanced-security/codeql-development-mcp-server/pull/109)) |
| `find_overlapping_queries`  | Guides agents through identifying overlapping or redundant CodeQL queries. ([#109](https://github.com/advanced-security/codeql-development-mcp-server/pull/109))                     |

#### CodeQL Query Packs

| Pack              | Description                                                                                                                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CallGraphFromTo` | Unified call-graph entry-point queries added for all supported languages (actions, cpp, csharp, go, java, javascript, python, ruby, swift). ([#168](https://github.com/advanced-security/codeql-development-mcp-server/pull/168)) |

### Changed

#### Infrastructure & CI/CD

- Pinned all GitHub Actions to full-length commit SHAs for supply-chain integrity. ([#190](https://github.com/advanced-security/codeql-development-mcp-server/pull/190))
- Updated dependabot configuration to group related PRs. ([#191](https://github.com/advanced-security/codeql-development-mcp-server/pull/191))
- Improved prompt error handling and added relative path support for prompt resolution. ([#153](https://github.com/advanced-security/codeql-development-mcp-server/pull/153))
- Updated action versions and fixed the build-and-test step in the `update-codeql` workflow. ([#158](https://github.com/advanced-security/codeql-development-mcp-server/pull/158))
- Added support for a target upgrade version parameter in `update-codeql.yml`. ([#160](https://github.com/advanced-security/codeql-development-mcp-server/pull/160))

### Fixed

- `codeql_database_analyze` `additionalArgs` were silently dropped instead of being forwarded to the CLI. ([#188](https://github.com/advanced-security/codeql-development-mcp-server/pull/188))

### Dependencies

- Upgraded CodeQL CLI dependency to v2.25.0. ([#161](https://github.com/advanced-security/codeql-development-mcp-server/pull/161))
- Upgraded NodeJS dependencies and rebuilt `server/dist/**`. ([#189](https://github.com/advanced-security/codeql-development-mcp-server/pull/189))
- Bumped `@vitest/coverage-v8` from 4.0.18 to 4.1.0. ([#141](https://github.com/advanced-security/codeql-development-mcp-server/pull/141))
- Bumped `softprops/action-gh-release` from 2.5.0 to 2.6.1. ([#146](https://github.com/advanced-security/codeql-development-mcp-server/pull/146))
- Updated `copilot-setup-steps` and NodeJS dependencies. ([#142](https://github.com/advanced-security/codeql-development-mcp-server/pull/142))
- Applied `npm audit fix` for NodeJS dependencies. ([#144](https://github.com/advanced-security/codeql-development-mcp-server/pull/144))
- Upgraded NodeJS dependencies to latest. ([#156](https://github.com/advanced-security/codeql-development-mcp-server/pull/156))

**Full Changelog**: [`v2.24.3...v2.25.0`](https://github.com/advanced-security/codeql-development-mcp-server/compare/v2.24.3...v2.25.0)

---

## [v2.24.3] — 2026-03-11

### Highlights

- **Database lock contention fix** — Resolved a critical compatibility issue where `.lock` files created by the `GitHub.vscode-codeql` extension prevented the MCP server from running CLI commands. A new `DatabaseCopier` syncs databases into a managed, lock-free directory under the extension's `globalStorage`. ([#119](https://github.com/advanced-security/codeql-development-mcp-server/pull/119))
- **New CodeQL search and discovery tools** — Two new tools (`search_ql_code`, `codeql_resolve_files`) eliminate the need for LLMs to use `grep` or shell access for QL code search and file discovery. ([#119](https://github.com/advanced-security/codeql-development-mcp-server/pull/119))
- **Automatic CodeQL CLI discovery** — The MCP server now automatically finds the CodeQL CLI binary installed by the `GitHub.vscode-codeql` extension off-PATH, using `distribution.json` with a fallback to scanning `distribution*` directories. ([#91](https://github.com/advanced-security/codeql-development-mcp-server/pull/91))
- **Rewritten MCP resources as actionable LLM-oriented guides** — All static MCP resources rewritten with clearer URIs and actionable content. ([#113](https://github.com/advanced-security/codeql-development-mcp-server/pull/113))

### Added

#### MCP Server Tools

| Tool                   | Description                                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `search_ql_code`       | Searches QL source code by text or regex pattern across resolved CodeQL packs and workspace folders, returning matched lines with surrounding context. |
| `codeql_resolve_files` | Discovers files by extension or glob pattern within CodeQL databases and packs, enabling LLMs to find source files without CLI dependencies.           |

#### MCP Server Resources

| URI                                         | Description                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| `codeql://server/overview`                  | MCP server orientation guide (replaces getting-started.md)                |
| `codeql://server/queries`                   | PrintAST, PrintCFG, CallGraphFrom, CallGraphTo overview                   |
| `codeql://server/tools`                     | Complete default tool reference                                           |
| `codeql://server/prompts`                   | Complete prompt reference                                                 |
| `codeql://learning/query-basics`            | Practical query writing reference                                         |
| `codeql://learning/test-driven-development` | TDD theory overview with cross-links                                      |
| `codeql://learning/security-queries/*`      | Language-specific security query guides (migrated from `.github/skills/`) |

### Changed

#### MCP Server Tools

| Tool                             | Change                                                                                                                                                                                                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profile_codeql_query_from_logs` | Rewritten with two-tier design: compact inline JSON + line-indexed detail file. Parser now captures RA operations and pipeline-stage tuple progressions. Output is deterministic (no timestamps). Uses streaming async generators for large evaluator logs. |
| `codeql_query_run`               | `resolveDatabasePath` helper auto-resolves multi-language database roots and throws on ambiguity instead of silently picking the first candidate.                                                                                                           |
| `codeql_database_analyze`        | Same `resolveDatabasePath` helper applied for consistent database path resolution.                                                                                                                                                                          |
| `codeql_resolve_database`        | Now probes child directories for databases; uses `resolveDatabasePath` for ambiguity detection.                                                                                                                                                             |

#### MCP Server Prompts & Resources

- All existing workflow prompts and resources updated to remove `grep`/CLI references in favor of `search_ql_code` and `codeql_resolve_files`.

#### Infrastructure & CI/CD

- Added `CODEQL_MCP_TMP_DIR` and `CODEQL_MCP_WORKSPACE_FOLDERS` environment variables for workspace-local scratch directories. ([#119](https://github.com/advanced-security/codeql-development-mcp-server/pull/119))
- Added query-file-finder contextual hints for missing tests, documentation, and expected results. ([#119](https://github.com/advanced-security/codeql-development-mcp-server/pull/119))
- Set `ENABLE_MONITORING_TOOLS=false` for client integration tests to avoid CI interference. ([#115](https://github.com/advanced-security/codeql-development-mcp-server/pull/115))

### Fixed

- **Database lock contention with `vscode-codeql`** — `.lock` files created by the `vscode-codeql` query server prevented `codeql_query_run` and `codeql_database_analyze` from executing. A new `DatabaseCopier` syncs databases into a managed lock-free directory. ([#119](https://github.com/advanced-security/codeql-development-mcp-server/pull/119))
- **Version-bearing files not updated during release** — `update-release-version.sh` now tracks `server/src/codeql-development-mcp-server.ts` (`const VERSION`) alongside all other version files. ([#90](https://github.com/advanced-security/codeql-development-mcp-server/pull/90))
- **MCP resource content missing at runtime in VSIX** — Embedded MCP resource content at build time via esbuild loader for VSIX compatibility. ([#111](https://github.com/advanced-security/codeql-development-mcp-server/pull/111))
- **CODEQL_PATH tests failing on Windows CI** — Fixed robust binary search and MSYS2 FIFO skip for `windows-latest`. ([#115](https://github.com/advanced-security/codeql-development-mcp-server/pull/115))
- **TOCTOU race condition in `search_ql_code`** — Eliminated filesystem race (read-then-check instead of stat-then-read); added symlink cycle detection. ([#119](https://github.com/advanced-security/codeql-development-mcp-server/pull/119))
- **OOM risk with large files in `search_ql_code`** — Large files (>5 MB) are now streamed line-by-line instead of loaded into memory. ([#119](https://github.com/advanced-security/codeql-development-mcp-server/pull/119))
- **Transient HTTP 503 in `install-packs.sh`** — Added exponential backoff retry (3 attempts, 10s/20s/40s) for `codeql pack install` to handle GHCR.io rate limits. ([#121](https://github.com/advanced-security/codeql-development-mcp-server/pull/121))

### Dependencies

- Upgraded CodeQL CLI dependency to v2.24.3. ([#114](https://github.com/advanced-security/codeql-development-mcp-server/pull/114))
- Upgraded NodeJS dependencies to latest available versions. ([#108](https://github.com/advanced-security/codeql-development-mcp-server/pull/108), [#114](https://github.com/advanced-security/codeql-development-mcp-server/pull/114))
- Bumped `actions/download-artifact` from 7 to 8. ([#94](https://github.com/advanced-security/codeql-development-mcp-server/pull/94))
- Bumped `actions/upload-artifact` from 6 to 7. ([#93](https://github.com/advanced-security/codeql-development-mcp-server/pull/93))

**Full Changelog**: [`v2.24.2...v2.24.3`](https://github.com/advanced-security/codeql-development-mcp-server/compare/v2.24.2...v2.24.3)

---

## [v2.24.2] — 2026-02-24

### Highlights

- **New VS Code extension** — Introduced `advanced-security.vscode-codeql-development-mcp-server`, a VS Code extension distributed as a VSIX archive that bridges the [GitHub CodeQL extension](https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-codeql) and the MCP server. It auto-discovers databases, query results, and MRVA results; bundles the server and all CodeQL tool packs; manages the server lifecycle; and registers an MCP Server Definition Provider. ([#61](https://github.com/advanced-security/codeql-development-mcp-server/pull/61))
- **Five new MCP server tools** — `list_codeql_databases`, `list_query_run_results`, `list_mrva_run_results`, `profile_codeql_query_from_logs`, and `read_database_source`. ([#61](https://github.com/advanced-security/codeql-development-mcp-server/pull/61), [#70](https://github.com/advanced-security/codeql-development-mcp-server/pull/70))
- **New FP/FN diagnosis prompt** — `run_query_and_summarize_false_positives` guides agents through running queries and diagnosing precision issues. ([#70](https://github.com/advanced-security/codeql-development-mcp-server/pull/70))

### Added

#### MCP Server Tools

| Tool                             | Description                                                                                                                                                                                                          |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_codeql_databases`          | Discovers CodeQL databases in configured base directories. Returns path, language, CLI version, and creation time for each database.                                                                                 |
| `list_query_run_results`         | Lists discovered query run result directories. Returns path, query name, timestamp, language, and available artifacts. Supports filtering by queryName, language, or queryPath.                                      |
| `list_mrva_run_results`          | Lists discovered MRVA run results. Returns run ID, timestamp, repositories scanned, analysis status, and available artifacts.                                                                                        |
| `profile_codeql_query_from_logs` | Parses CodeQL query evaluation logs into a performance profile without re-running the query. Works with logs from `codeql query run`, `codeql database analyze`, or `vscode-codeql` query history.                   |
| `read_database_source`           | Reads source file contents directly from a CodeQL database's source archive (`src.zip`) or extracted source directory (`src/`), enabling agents to inspect code at alert locations without the original source tree. |

#### MCP Server Prompts

| Prompt                                    | Description                                                                                                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `run_query_and_summarize_false_positives` | Guides an agent through running a CodeQL query, reading source code from the database archive via `read_database_source`, and diagnosing false positives / false negatives to improve query precision. |

#### VS Code Extension

- Initial release of `advanced-security.vscode-codeql-development-mcp-server` VSIX. ([#61](https://github.com/advanced-security/codeql-development-mcp-server/pull/61))

### Changed

#### MCP Server Tools

| Tool                      | Change                                                                                                                                                                                         |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `codeql_bqrs_decode`      | Added `text` and `bqrs` output formats, `--result-set` selection, `--sort-key` / `--sort-direction` sorting, `--no-titles` flag, `--entities` column display control, and `--rows` pagination. |
| `codeql_bqrs_info`        | Enhanced description with cross-references to related tools and workflow guidance.                                                                                                             |
| `codeql_database_analyze` | Improved logging and error messages; auto-creates output directories.                                                                                                                          |
| `codeql_query_run`        | Minor logging improvements.                                                                                                                                                                    |
| `register_database`       | Error objects now chain the original cause for better debugging.                                                                                                                               |

#### MCP Server Prompts

- All existing workflow prompts updated to use `#tool_name` hashtag references (instead of backtick formatting) for tool mentions, improving consistency in VS Code Copilot Chat.
- Prompt templates embedded at build time via esbuild's `loader: { '.md': 'text' }`.

#### Infrastructure & CI/CD

- Refactored the release workflow into separate child workflows with isolated deployment environments. ([#45](https://github.com/advanced-security/codeql-development-mcp-server/pull/45))
- Added a nightly CodeQL CLI update workflow that automates version bumps across all packages. ([#58](https://github.com/advanced-security/codeql-development-mcp-server/pull/58))
- Added dedicated GitHub Actions workflows for building, testing (with coverage), linting, bundling, and packaging the VS Code extension. ([#61](https://github.com/advanced-security/codeql-development-mcp-server/pull/61))
- Added `stdio` transport support to the client integration test runner alongside SSE. ([#77](https://github.com/advanced-security/codeql-development-mcp-server/pull/77))
- Release artifacts now include version strings in filenames (e.g., `codeql-development-mcp-server-v2.24.2.vsix`). ([#81](https://github.com/advanced-security/codeql-development-mcp-server/pull/81))
- Release workflow uses a concurrency group keyed by version, preventing overlapping releases. ([#81](https://github.com/advanced-security/codeql-development-mcp-server/pull/81))
- Added `.md` documentation enforcement for all `.ql` tool queries. ([#81](https://github.com/advanced-security/codeql-development-mcp-server/pull/81))

### Fixed

- **VSIX bundle missing server dependencies** — esbuild `external` configuration excluded required Node.js dependencies (`express`, `cors`, `zod`, etc.) from the bundled VSIX, causing runtime failures. ([#71](https://github.com/advanced-security/codeql-development-mcp-server/pull/71))
- **Prompt templates not found at runtime** — Refactored prompt loading from `readFileSync` to build-time static imports for all deployment scenarios. ([#71](https://github.com/advanced-security/codeql-development-mcp-server/pull/71))
- **Client integration test timeouts** — Resolved timeout issues in client integration test fixtures that caused flaky CI runs. ([#74](https://github.com/advanced-security/codeql-development-mcp-server/pull/74))
- **VS Code extension version not tracked in release scripts** — `update-release-version.sh` and nightly CodeQL CLI update workflow now detect and update the version in `extensions/vscode/package.json`. ([#75](https://github.com/advanced-security/codeql-development-mcp-server/pull/75))
- **VSIX-bundled server pack installation** — Extension now prefers the bundled `server/` directory inside the VSIX for CodeQL pack resolution. ([#81](https://github.com/advanced-security/codeql-development-mcp-server/pull/81))
- **Error chaining in `register_database`** — All error paths now preserve the original `cause`. ([#61](https://github.com/advanced-security/codeql-development-mcp-server/pull/61))

### Dependencies

- Upgraded CodeQL CLI dependency to v2.24.2. ([#65](https://github.com/advanced-security/codeql-development-mcp-server/pull/65))
- Bumped `actions/download-artifact` from 6 to 7. ([#49](https://github.com/advanced-security/codeql-development-mcp-server/pull/49))
- Bumped `dotenv` from 17.2.4 to 17.3.0. ([#54](https://github.com/advanced-security/codeql-development-mcp-server/pull/54))
- Bumped `eslint` from ^10.0.0 to ^10.0.1 across all packages. ([#75](https://github.com/advanced-security/codeql-development-mcp-server/pull/75))

### New Contributors

- @dependabot\[bot\] made their first contribution in [#49](https://github.com/advanced-security/codeql-development-mcp-server/pull/49)
- [@MichaelRFairhurst](https://github.com/MichaelRFairhurst) made their first contribution in [#70](https://github.com/advanced-security/codeql-development-mcp-server/pull/70)
- @github-actions[bot] made their first contribution in [#65](https://github.com/advanced-security/codeql-development-mcp-server/pull/65)

**Full Changelog**: [`v2.24.1...v2.24.2`](https://github.com/advanced-security/codeql-development-mcp-server/compare/v2.24.1...v2.24.2)

---

## [v2.24.1] — 2026-02-10

### Changed

- Release preparation and version-bearing file updates. ([#38](https://github.com/advanced-security/codeql-development-mcp-server/pull/38))

**Full Changelog**: [`v2.24.0...v2.24.1`](https://github.com/advanced-security/codeql-development-mcp-server/compare/v2.24.0...v2.24.1)

---

## [v2.24.0] — 2026-02-09

_Initial public release of the CodeQL Development MCP Server._

### Highlights

- First public release, tested against CodeQL CLI v2.24.0.
- MCP server with tools for running CodeQL queries, decoding BQRS results, analyzing databases, and managing CodeQL packs.
- PrintAST, PrintCFG, CallGraphFrom, and CallGraphTo tool queries for all supported languages (actions, cpp, csharp, go, java, javascript, python, ruby, swift).
- Client integration test suite with SSE transport support.
- `npm`-installable package and tarball release artifacts.

### Added

- Core MCP server (`codeql-development-mcp-server`) with SSE and stdio transports.
- CodeQL query execution tools: `codeql_query_run`, `codeql_database_analyze`, `codeql_bqrs_decode`, `codeql_bqrs_info`, `register_database`, `codeql_resolve_database`.
- Tool query packs for all supported languages with PrintAST, PrintCFG, CallGraphFrom, and CallGraphTo queries.
- Client integration test runner (`ql-mcp-client.js`).
- Documentation: `README.md`, `docs/getting-started.md`, `docs/testing.md`, `docs/ql-mcp/tools.md`, `docs/ql-mcp/prompts.md`, `docs/ql-mcp/resources.md`.

### Fixed

- **Security: TOCTOU & OS tmp file vulnerabilities** — Fixed time-of-check-time-of-use races and insecure temporary file handling. ([#18](https://github.com/advanced-security/codeql-development-mcp-server/pull/18))

### Changed

- Cross-platform support ensured via CI integration tests on `ubuntu-latest` and `windows-latest`. ([#22](https://github.com/advanced-security/codeql-development-mcp-server/pull/22))
- Java PrintCFG query excludes exit nodes for deterministic test output. ([#23](https://github.com/advanced-security/codeql-development-mcp-server/pull/23))
- Dynamic package version resolution and `CODEQL_MCP_TMP_DIR` environment variable support. ([#27](https://github.com/advanced-security/codeql-development-mcp-server/pull/27))
- Improved MCP server integrations with `codeql execute *-server` servers. ([#29](https://github.com/advanced-security/codeql-development-mcp-server/pull/29))

### Dependencies

- Upgraded CodeQL CLI and dependencies to v2.24.0. ([#31](https://github.com/advanced-security/codeql-development-mcp-server/pull/31))

**Full Changelog**: [`v2.23.9...v2.24.0`](https://github.com/advanced-security/codeql-development-mcp-server/compare/v2.23.9...v2.24.0)

---

<!-- Link definitions -->

[Unreleased]: https://github.com/advanced-security/codeql-development-mcp-server/compare/v2.25.4...HEAD
[v2.25.4]: https://github.com/advanced-security/codeql-development-mcp-server/releases/tag/v2.25.4
[v2.25.3]: https://github.com/advanced-security/codeql-development-mcp-server/releases/tag/v2.25.3
[v2.25.2]: https://github.com/advanced-security/codeql-development-mcp-server/releases/tag/v2.25.2
[v2.25.1]: https://github.com/advanced-security/codeql-development-mcp-server/releases/tag/v2.25.1
[v2.25.0]: https://github.com/advanced-security/codeql-development-mcp-server/releases/tag/v2.25.0
[v2.24.3]: https://github.com/advanced-security/codeql-development-mcp-server/releases/tag/v2.24.3
[v2.24.2]: https://github.com/advanced-security/codeql-development-mcp-server/releases/tag/v2.24.2
[v2.24.1]: https://github.com/advanced-security/codeql-development-mcp-server/releases/tag/v2.24.1
[v2.24.0]: https://github.com/advanced-security/codeql-development-mcp-server/releases/tag/v2.24.0
