# Customizing Library Models for Swift

## Purpose

Customize data-flow and taint analysis for Swift by modeling frameworks and libraries via data extensions (YAML) and model packs. This enables accurate flow tracking through third-party libraries not included in CodeQL databases.

For common guidance on data extensions (YAML structure, model packs, development workflow), see `codeql://learning/data-extensions`.

## Data Extensions Overview

### Structure

Data extensions use YAML format to extend CodeQL's knowledge of library behavior:

```yaml
extensions:
  - addsTo:
      pack: codeql/swift-all
      extensible: <extensible-predicate>
    data:
      - <tuple1>
      - <tuple2>
```

### Union Semantics

- Multiple YAML files are combined
- Rows are merged across files
- Duplicates are automatically removed
- Order of files doesn't matter

## Model Format

Swift uses a **MaD (Models as Data)** format with multi-column tuples that identify callables by module/type/name/signature — the same structural family as Java/Kotlin, C#, C/C++, and Go. Methods are keyed on Swift's module-qualified type and method names (e.g. `Foundation.URLRequest.init(url:)`).

## Extensible Predicates for Swift

| Predicate      | Purpose                                                               |
| -------------- | --------------------------------------------------------------------- |
| `sourceModel`  | Model sources of tainted data                                         |
| `sinkModel`    | Model sinks where tainted data is used unsafely                       |
| `summaryModel` | Model flow through opaque library functions/methods                   |
| `barrierModel` | Model barriers (sanitizers) that stop taint flow                      |
| `neutralModel` | Mark callables as having no dataflow impact (suppress generated rows) |

Refer to `codeql/swift-all` (the `ext/*.model.yml` files under `swift/ql/lib/ext/` in the upstream `codeql` repository) for the canonical column layout used by the current CodeQL CLI release. Authoring a tuple with the wrong column count will fail to load (often silently).

## Identifier Columns

Swift models typically identify a callable by:

- **module** — Swift module name (e.g. `Foundation`, `UIKit`, the package/target name for third-party code)
- **type** — Type name (`""` for module-level free functions)
- **subtypes** — Whether to apply to subtypes (`true`/`false`)
- **name** — Method or function name (e.g. `init(url:)`, `data(using:)`)
- **signature** — Parameter signature (`""` for any)

The exact column count and order is defined by the `codeql/swift-all` pack — always cross-check before authoring rows.

## Access Paths

Swift access paths follow the same conventions as the other MaD-tuple languages:

| Component        | Description                                     |
| ---------------- | ----------------------------------------------- |
| `Argument[n]`    | Argument at index n (0-based, excluding `self`) |
| `Argument[self]` | The receiver of a method call                   |
| `Parameter[n]`   | Parameter at index n (used by `summaryModel`)   |
| `ReturnValue`    | Return value of a call                          |

## Common Sink Kinds

`command-injection`, `path-injection`, `sql-injection`, `request-forgery`, `url-redirection`, `code-injection`, `predicate-injection`

## Sample Model

```yaml
extensions:
  - addsTo:
      pack: codeql/swift-all
      extensible: sinkModel
    data:
      - [
          'Foundation',
          'NSPredicate',
          false,
          'init(format:argumentArray:)',
          '',
          '',
          'Argument[0]',
          'predicate-injection',
          'manual'
        ]
```

> The exact column count above is **illustrative**; verify against the `codeql/swift-all` pack shipped with the CodeQL CLI version recorded in `.codeql-version`.

## Validation Workflow

1. Place `*.model.yml` files in your model-pack directory (or under `.github/codeql/extensions/` for the single-repo path).
2. Run `codeql_query_run` against a database that exercises the modelled APIs and confirm new findings appear (sources/sinks) or expected findings disappear (barriers/neutrals).
3. Add a unit test that exercises the new chain end-to-end using `codeql_test_run`.

## Related Resources

- `codeql://learning/data-extensions` — Common data extensions overview (both model formats)
- [CodeQL for Swift](https://codeql.github.com/docs/codeql-language-guides/codeql-for-swift/) — Official Swift language guide
