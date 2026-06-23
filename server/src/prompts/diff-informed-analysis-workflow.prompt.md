---
agent: agent
---

# Diff-Informed (Incremental) Analysis Workflow

Use this workflow to make a CodeQL data-flow/taint query **diff-informed** and to
build and evaluate **overlay databases** for incremental analysis of changed
files. Diff-informed analysis restricts a query's alerts to code in a diff range
(for example, the lines changed in a pull request), which keeps results focused
and makes large queries cheaper to re-run on changes.

This workflow works in any environment where the `codeql` CLI and the MCP server
tools are available, including terminal-only environments without an IDE.

Read these MCP resources first:

- `codeql://learning/diff-informed-analysis` — query-side opt-in and validation
- `codeql://guides/overlay-databases` — overlay base/overlay databases and evaluation

> These CodeQL capabilities are **advanced and experimental** ("Wizards only!"
> in the CLI help). They are exposed by the MCP server for developing and
> validating diff-informed queries and overlay databases. Flag names and
> behavior may change in future CodeQL releases — always confirm against
> `codeql <subcommand> -h -vv`.

## Context

- Language: {{language}}
- Query: {{queryPath}}
- Base database (or source root): {{database}}

## How diff-informed analysis works

Diff-informed analysis has two cooperating parts:

1. **The query opts in** by overriding predicates in its data-flow configuration
   module (`DataFlow::ConfigSig` / `DataFlow::StateConfigSig`).
2. **The diff range is supplied.** In Code Scanning the CodeQL Action computes
   the changed lines and supplies them automatically. For **local development**
   you can supply a diff range yourself by populating the `restrictAlertsTo`
   extensible predicate via a data-extension pack (see Phase 2 → "drive a real
   diff range locally"). To check correctness without building a range, use
   `codeql test run --check-diff-informed` (see Phase 2).

Overlay databases are a separate-but-related incremental mechanism: a small
**overlay** database is built on top of a precomputed **overlay base** so that
only changed files are re-extracted.

## Phase 1: Make the data-flow query diff-informed

- [ ] **Locate the data-flow configuration module**
  - Tool: #find_predicate_position or #search_ql_code to find the
    `module ... implements DataFlow::ConfigSig` (or `StateConfigSig`) in
    {{queryPath}} or its imported `.qll`.
  - Diff-informed opt-in applies to the **configuration module**, not the
    `@kind problem`/`path-problem` select clause.

- [ ] **Override `observeDiffInformedIncrementalMode`**
  - Add this predicate to the config module to enable diff-informed filtering:

    ```ql
    predicate observeDiffInformedIncrementalMode() { any() }
    ```

  - Only apply this to configurations whose results are used **directly** in a
    query result. Do not apply it to configurations used as a helper/secondary
    flow inside another query.

- [ ] **Report every selected location via the location predicates**
  - By default the diff range is matched against the source and sink locations.
    If your `select` clause reports **additional** locations (the primary alert
    location or any `$@` interpolated location), override these so those
    locations are also considered:

    ```ql
    Location getASelectedSourceLocation(DataFlow::Node source) {
      result = source.getLocation()
      // add any other location your select reports for this source
    }

    Location getASelectedSinkLocation(DataFlow::Node sink) {
      result = sink.getLocation()
      // add any other location your select reports for this sink
    }
    ```

  - For `@kind path-problem` queries, these predicates **must** still return the
    node's own location. For a query that does not report the source (or sink)
    at all, return `none()` for that predicate.

- [ ] **Compile the query**
  - Tool: #codeql_query_compile with `query` set to {{queryPath}}
  - Fix any compilation errors before validating.

## Phase 2: Validate diff-informed correctness

- [ ] **Add or reuse a query unit test**
  - Diff-informed correctness is checked by the test runner, not by a normal
    analyze run. Ensure the query has a `.qlref`/`.expected` test (see
    `codeql://guides/query-unit-testing`).

- [ ] **Run the test with diff-informed checking enabled**
  - Tool: #codeql_test_run with `tests` set to the test directory and
    `check-diff-informed: true`
  - This verifies that the locations the query claims through
    `getASelectedSourceLocation` / `getASelectedSinkLocation` match the
    locations it actually reports. A mismatch fails the test.

- [ ] **Interpret failures**
  - A failure usually means the `select` reports a location that is not returned
    by the location predicates (or vice versa). Reconcile the two and re-run.

- [ ] **Optional: drive a real diff range locally and measure its effect**
  - The diff range is supplied through the
    `restrictAlertsTo(filePath, lineStart, lineEnd)` extensible predicate in
    `codeql/util` (whole-file = line `0, 0`; `filePath` absolute). Create a small
    data-extension pack to populate it:

    ```yaml
    # codeql-pack.yml
    library: true
    name: my-org/my-diff-range
    extensionTargets:
      codeql/util: '*'
    dataExtensions:
      - '*.model.yml'
    ```

    ```yaml
    # diff-range.model.yml
    extensions:
      - addsTo:
          pack: codeql/util
          extensible: restrictAlertsTo
        data:
          - ['/abs/path/to/changed/File.ext', 0, 0]
    ```

  - Run the query with the pack **activated via `--model-packs`** (placing it
    only on `--additional-packs` resolves but does NOT apply it):
    - Tool: #codeql_database_analyze with `database`, `queries` = {{queryPath}},
      and `additionalArgs: ["--model-packs=my-org/my-diff-range"]`.
  - See `codeql://learning/diff-informed-analysis` for the full mechanism.

## Phase 3: Build overlay databases (optional, for incremental evaluation)

Use overlay databases when you want to re-extract only changed files on top of a
precomputed base, rather than rebuilding the whole database.

- [ ] **Build the overlay base**
  - Tool: #codeql_database_create with:
    - `database`: a path for the base database (e.g. `base-db`)
    - `language`: {{language}}
    - `source-root`: {{database}} (the source tree)
    - `overlay-base: true`
    - `cache-cleanup: "overlay"` (retain only data useful for overlay evaluation)

- [ ] **Describe the changed files**
  - Create a JSON file (e.g. `changes.json`) with a top-level `changes` array of
    repository-relative paths that changed since the base was built:

    ```json
    { "changes": ["webapp/controller/Login.controller.js"] }
    ```

  - Tip: derive the list from version control, e.g. the files reported by
    `git diff --name-only <base-ref>...HEAD`.

- [ ] **Build the overlay database**
  - Tool: #codeql_database_create with:
    - `database`: a path for the overlay database (e.g. `overlay-db`)
    - `language`: {{language}}
    - `source-root`: {{database}}
    - `overlay-changes`: the path to `changes.json`

## Phase 4: Evaluate against the overlay

- [ ] **Analyze with overlay evaluation**
  - Tool: #codeql_database_analyze with:
    - `database`: the overlay database from Phase 3
    - `queries`: {{queryPath}} (or a suite containing it)
    - `format`: `sarif-latest`
    - `output`: a path for the SARIF results
    - `evaluate-as-overlay: true`

- [ ] **Or run a single query against the overlay**
  - Tool: #codeql_query_run with:
    - `database`: the overlay database
    - `query`: {{queryPath}}
    - `evaluate-as-overlay: true`

- [ ] **Inspect results**
  - Tool: #list_query_run_results then #codeql_bqrs_decode to read raw results,
    or open the SARIF output.

## Worked Example

Make a taint query diff-informed and validate it for `{{language}}`:

1. Find the config module:
   - #search_ql_code with a pattern like `implements DataFlow::ConfigSig`
2. Edit the config module to add `observeDiffInformedIncrementalMode() { any() }`
   and, if the select reports extra locations, override
   `getASelectedSourceLocation` / `getASelectedSinkLocation`.
3. Compile: #codeql_query_compile with `query` = {{queryPath}}
4. Validate: #codeql_test_run with `tests` = the query's test directory and
   `check-diff-informed: true`
5. (Optional) Build `base-db` (`overlay-base: true`, `cache-cleanup: "overlay"`)
   and `overlay-db` (`overlay-changes: changes.json`), then analyze `overlay-db`
   with `evaluate-as-overlay: true`.

## Validation Tools Comparison

| Goal                             | Tool                     | Key parameter               |
| -------------------------------- | ------------------------ | --------------------------- |
| Compile the query                | #codeql_query_compile    | `query`                     |
| Validate diff-informed filtering | #codeql_test_run         | `check-diff-informed: true` |
| Build overlay base               | #codeql_database_create  | `overlay-base: true`        |
| Build overlay database           | #codeql_database_create  | `overlay-changes: <file>`   |
| Evaluate against an overlay      | #codeql_database_analyze | `evaluate-as-overlay: true` |

## Notes and Limitations

- `observeDiffInformedIncrementalMode`, `getASelectedSourceLocation`, and
  `getASelectedSinkLocation` are `default` predicates of `DataFlow::ConfigSig`
  and `DataFlow::StateConfigSig` — you override them in your own config module.
- There is no dedicated `codeql database analyze` flag for a diff range; instead
  the range is supplied through the `restrictAlertsTo` extensible predicate
  (`codeql/util`), populated by a data-extension pack and **activated with
  `--model-packs`**. In Code Scanning the CodeQL Action does this for you; see
  `codeql://learning/diff-informed-analysis` to do it locally.
- The overlay and diff-informed CLI flags are experimental; verify their exact
  names and behavior with `codeql database create -h -vv`,
  `codeql database analyze -h -vv`, and `codeql test run -h -vv`.
