# Overlay Databases

Overlay databases are a CodeQL incremental-analysis mechanism: instead of
rebuilding an entire database when a few files change, you build a small
**overlay** database on top of a precomputed **overlay base**, re-extracting only
the changed files. Overlay evaluation reuses cached intermediate results from the
base, which speeds up analysis of changes. This resource explains how to build
and evaluate overlay databases with the CodeQL Development MCP Server tools.

> **Status:** Overlay creation and overlay evaluation are **advanced and
> experimental** (marked "Wizards only!" in `codeql <subcommand> -h -vv`). Flag
> names and behavior may change between CodeQL releases. The MCP server exposes
> these capabilities for development and testing. Always confirm against the CLI
> help for your installed CodeQL version.

## Concepts

- **Overlay base** — a database built so that its evaluation cache is usable as
  the foundation for later overlays. Build it once for an unchanged snapshot of
  the code.
- **Overlay** — a database built on top of an overlay base that re-extracts only
  a declared set of changed files.
- **Overlay evaluation** — running queries against an overlay so that work is
  reused from the base wherever possible.

Overlay databases pair naturally with diff-informed analysis
(`codeql://learning/diff-informed-analysis`): the overlay re-extracts changed
files, and a diff-informed query restricts alerts to the changed lines.

## 1. Build the overlay base

Tool: `codeql_database_create`

| Parameter       | Value                                       |
| --------------- | ------------------------------------------- |
| `database`      | path for the base database (e.g. `base-db`) |
| `language`      | the source language (e.g. `javascript`)     |
| `source-root`   | the source tree to extract                  |
| `overlay-base`  | `true`                                      |
| `cache-cleanup` | `overlay`                                   |

Setting `overlay-base: true` marks the database as usable as an overlay base.
Setting `cache-cleanup: overlay` trims the evaluation cache to just the data that
is useful when evaluating against an overlay, keeping the base compact.

## 2. Describe the changed files

An overlay re-extracts a declared set of changed files. Create a JSON file whose
top-level object has a `changes` entry — a list of repository-relative paths of
files that changed since the base was built:

```json
{
  "changes": ["webapp/controller/Login.controller.js", "webapp/model/models.js"]
}
```

Derive the list from version control, for example the output of
`git diff --name-only <base-ref>...HEAD`.

## 3. Build the overlay database

Tool: `codeql_database_create`

| Parameter         | Value                                             |
| ----------------- | ------------------------------------------------- |
| `database`        | path for the overlay database (e.g. `overlay-db`) |
| `language`        | the same language as the base                     |
| `source-root`     | the source tree (with the changed files applied)  |
| `overlay-changes` | path to the JSON changes file from step 2         |

Only the files listed in the `changes` array are extracted into the overlay; all
other code is taken from the overlay base.

## 4. Evaluate against the overlay

Run queries with overlay evaluation forced on.

- Tool: `codeql_database_analyze`
  - `database`: the overlay database from step 3
  - `queries`: the query or suite to run
  - `format`: `sarif-latest`
  - `output`: a path for the SARIF results
  - `evaluate-as-overlay`: `true`

- Tool: `codeql_query_run` (single query)
  - `database`: the overlay database
  - `query`: the `.ql` file
  - `evaluate-as-overlay`: `true`

The `cache-at-frontier` parameter (on `codeql_database_analyze` and
`codeql_query_run`) forces evaluation and caching of intermediate results that
will be useful for future overlay evaluation. It is enabled automatically when
evaluating against an overlay-prepared base that does not yet have an overlay, so
it rarely needs to be set explicitly.

## Tool parameter reference

| Tool                      | Parameter             | Purpose                                             |
| ------------------------- | --------------------- | --------------------------------------------------- |
| `codeql_database_create`  | `overlay-base`        | build a database usable as an overlay base          |
| `codeql_database_create`  | `overlay-changes`     | build an overlay from a JSON changes file           |
| `codeql_database_create`  | `cache-cleanup`       | `clear`, `trim`, `fit`, or `overlay` cache trimming |
| `codeql_database_analyze` | `evaluate-as-overlay` | force overlay-mode evaluation                       |
| `codeql_database_analyze` | `cache-at-frontier`   | cache intermediate results for future overlays      |
| `codeql_query_run`        | `evaluate-as-overlay` | force overlay-mode evaluation                       |
| `codeql_query_run`        | `cache-at-frontier`   | cache intermediate results for future overlays      |

## Workflow prompt

The `diff_informed_analysis_workflow` prompt includes an overlay-database phase
that walks through building a base, declaring changes, building the overlay, and
evaluating against it.

## Related resources

- `codeql://learning/diff-informed-analysis` — query-side opt-in and validation
- `codeql://server/tools` — full MCP tool reference
