# Diff-Informed (Incremental) Analysis

Diff-informed analysis restricts a CodeQL query's alerts to a **diff range** —
typically the lines changed in a pull request. This keeps results focused on new
or modified code and makes expensive data-flow queries cheaper to re-run on
changes. This resource explains how to make a query diff-informed and how to
validate it with the CodeQL Development MCP Server tools.

> **Status:** The CodeQL CLI surface for diff-informed analysis and overlay
> evaluation is **advanced and experimental** (marked "Wizards only!" in
> `codeql <subcommand> -h -vv`). Flag names and behavior may change. The MCP
> server exposes these capabilities to help you develop and validate
> diff-informed queries locally. Always confirm against the CLI help for your
> installed CodeQL version.

## How it works

Diff-informed analysis has two cooperating parts:

1. **The query opts in.** A data-flow/taint configuration declares that it wants
   its sources and sinks filtered to the diff range.
2. **The diff range is supplied.** In GitHub Code Scanning the CodeQL Action
   computes the changed lines and supplies them automatically. You can also
   supply a diff range **locally** by populating the `restrictAlertsTo`
   extensible predicate via a data-extension pack (see
   "Supplying a diff range locally" below) — this is exactly the mechanism Code
   Scanning uses. For checking _correctness_ of a diff-informed query without
   constructing a range, use `codeql test run --check-diff-informed`.

## Query-side opt-in

Diff-informed behavior is controlled by three `default` predicates on the
data-flow configuration signatures `DataFlow::ConfigSig` and
`DataFlow::StateConfigSig`. You override them inside your own configuration
module.

### 1. `observeDiffInformedIncrementalMode`

Override this to enable diff-informed filtering for the configuration:

```ql
predicate observeDiffInformedIncrementalMode() { any() }
```

Apply it **only** to configurations whose results are used directly in a query
result. Do not apply it to a configuration that is used as a helper or secondary
flow inside another query — doing so can incorrectly filter the secondary flow.

### 2. `getASelectedSourceLocation`

By default the diff range is matched against the location of each source and
sink. If your `select` clause reports **additional** locations for a source (the
primary alert location, or any `$@` interpolated location), override this so
those locations are also considered part of the diff match:

```ql
Location getASelectedSourceLocation(DataFlow::Node source) {
  result = source.getLocation()
  // include any other location your select reports for this source
}
```

### 3. `getASelectedSinkLocation`

The sink equivalent:

```ql
Location getASelectedSinkLocation(DataFlow::Node sink) {
  result = sink.getLocation()
  // include any other location your select reports for this sink
}
```

Rules for the location predicates:

- For `@kind path-problem` queries, these predicates **must** still return the
  node's own location.
- For a query that does not report the source (or sink) at all, return `none()`
  for that predicate.

## Complete example

A taint-tracking configuration opting into diff-informed analysis:

```ql
private import javascript

module MyFlowConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) { source instanceof RemoteFlowSource }

  predicate isSink(DataFlow::Node sink) {
    exists(DOM::DocumentWriteCall write | sink = write.getAnArgument())
  }

  predicate observeDiffInformedIncrementalMode() { any() }

  Location getASelectedSourceLocation(DataFlow::Node source) {
    result = source.getLocation()
  }

  Location getASelectedSinkLocation(DataFlow::Node sink) {
    result = sink.getLocation()
  }
}

module MyFlow = TaintTracking::Global<MyFlowConfig>;
```

## Supplying a diff range locally

The diff range is provided through two **extensible predicates** declared in the
`codeql/util` library's `AlertFiltering.qll`:

- `restrictAlertsTo(string filePath, int lineStart, int lineEnd)` — line-range
  match; use `lineStart = lineEnd = 0` for a whole-file match. `filePath` is the
  **absolute** path of the alert location.
- `restrictAlertsToExactLocation(string filePath, int startLine, int startColumn, int endLine, int endColumn)`
  — character-precise match (useful for tests).

Diff-informed filtering is **active only when at least one of these predicates is
non-empty**. To drive it locally, populate `restrictAlertsTo` with a
data-extension pack that targets `codeql/util`:

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
# diff-range.model.yml — one row per changed file / line range
extensions:
  - addsTo:
      pack: codeql/util
      extensible: restrictAlertsTo
    data:
      - ['/abs/path/to/changed/File.ext', 0, 0] # whole file
      - ['/abs/path/to/another/File.ext', 10, 24] # lines 10-24
```

**Activate the pack with `--model-packs`.** Putting it only on the search path
(`--additional-packs`) makes it resolvable but **does not apply** the data
extension, so `restrictAlertsTo` stays empty and diff-informed mode is a no-op.

With the MCP server, run `codeql_database_analyze` and pass the activation
through `additionalArgs`:

- `database`: your CodeQL database
- `queries`: the diff-informed query (or a suite containing it)
- `additionalArgs`: `["--model-packs=my-org/my-diff-range"]`

> Tip: generate the diff-range rows from version control — e.g. the files and
> line ranges reported by `git diff` against the pull request's base.
>
> Note: when a query's results are cached in the database, changing the active
> model packs does not by itself invalidate that cache. The MCP
> `codeql_database_analyze` tool defaults `--rerun` on when model packs are
> requested so the diff range actually takes effect; pass `rerun: false` to opt
> out.

## Validate with the MCP server

1. Compile the query — tool `codeql_query_compile` with the `query` parameter set
   to your `.ql` file.
2. Validate diff-informed filtering — tool `codeql_test_run` with `tests` set to
   the query's test directory and `check-diff-informed: true`. This checks that
   the locations the query claims through `getASelectedSourceLocation` /
   `getASelectedSinkLocation` match the locations it actually reports. A mismatch
   fails the test.

A `check-diff-informed` failure usually means the `select` reports a location
that is not returned by the location predicates (or vice versa). Reconcile the
two and re-run the test.

## Workflow prompt

For a guided, end-to-end workflow use the `diff_informed_analysis_workflow`
prompt, which walks through making a query diff-informed, validating it, and
building overlay databases.

## Related resources

- `codeql://guides/overlay-databases` — overlay base/overlay databases and
  overlay evaluation
- `codeql://learning/query-basics` — QL query writing reference
- `codeql://guides/query-unit-testing` — query unit testing conventions
