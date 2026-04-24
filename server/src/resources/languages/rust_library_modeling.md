# Customizing Library Models for Rust

## Purpose

Customize data-flow and taint analysis for Rust by modeling crates and libraries via data extensions (YAML) and model packs. This enables accurate flow tracking through third-party crates not included in CodeQL databases.

For common guidance on data extensions (YAML structure, model packs, development workflow), see `codeql://learning/data-extensions`.

> Rust MaD support in CodeQL is evolving; column layouts and supported predicates may change between CodeQL releases. Always cross-reference the upstream `codeql/rust-all` pack and the official [CodeQL docs for Rust](https://codeql.github.com/docs/codeql-language-guides/codeql-for-rust/) for the column layout in use by the CodeQL CLI version pinned in this repo.

## Data Extensions Overview

### Structure

Data extensions use YAML format to extend CodeQL's knowledge of library behavior:

```yaml
extensions:
  - addsTo:
      pack: codeql/rust-all
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

Rust uses a **MaD (Models as Data)** format keyed on **crate path** (`crate::module::Type::method`-style canonical paths) rather than the namespace/type/name/signature columns used by Java/C#/C++/Go. Tuples are typically shorter than the MaD-tuple-format languages and closer in spirit to the API-graph access-path style used by JavaScript/Python/Ruby — but the exact column layout is defined by the `codeql/rust-all` pack.

## Extensible Predicates for Rust

| Predicate      | Purpose                                                               |
| -------------- | --------------------------------------------------------------------- |
| `sourceModel`  | Model sources of tainted data (e.g. data read from network or env)    |
| `sinkModel`    | Model sinks where tainted data is used unsafely                       |
| `summaryModel` | Model flow through opaque library functions (taint or value flow)     |
| `neutralModel` | Mark functions as having no dataflow impact (suppress generated rows) |

Refer to `codeql/rust-all` (the `ext/*.model.yml` files in the upstream `codeql` repository under `rust/ql/lib/ext/`) for canonical examples of the exact tuple shape required by the current CodeQL CLI release.

## Crate Path Column

The crate path identifies a function or method by its fully qualified Rust path:

- Free function: `tokio::fs::read_to_string`
- Inherent method: `<std::path::PathBuf>::push`
- Trait method: `<T as core::iter::Iterator>::next`
- Generic types may need to be normalised (e.g. lifetime/type parameters elided) per the upstream pack's conventions.

## Access Paths

Rust models use access paths similar to other MaD languages, with `Argument[n]`, `Argument[self]`, `ReturnValue`, and (where supported) field/element selectors. Always validate against `codeql/rust-all` for which selectors are supported by the current release.

## Common Sink Kinds

`command-injection`, `path-injection`, `sql-injection`, `request-forgery`, `url-redirection`, `code-injection`

## Sample Model

```yaml
extensions:
  - addsTo:
      pack: codeql/rust-all
      extensible: sinkModel
    data:
      - [
          'repo:https://github.com/rust-lang/rust:std',
          '<crate::process::Command>::arg',
          'Argument[0]',
          'command-injection',
          'manual'
        ]
```

> The exact column count and ordering above is **illustrative**; verify against the `codeql/rust-all` pack shipped with the CodeQL CLI version recorded in `.codeql-version`. Authoring a tuple with the wrong column count will fail to load (often silently).

## Validation Workflow

1. Place `*.model.yml` files in your model-pack directory (or under `.github/codeql/extensions/` for the single-repo path).
2. Run `codeql_query_run` against a database that exercises the modelled APIs and confirm new findings appear (sources/sinks) or expected findings disappear (barriers/neutrals).
3. Add a unit test that exercises the new chain end-to-end using `codeql_test_run`.

## Related Resources

- `codeql://learning/data-extensions` — Common data extensions overview (both model formats)
- `codeql://languages/rust/ast` — Rust AST class reference
- [CodeQL for Rust](https://codeql.github.com/docs/codeql-language-guides/codeql-for-rust/) — Official Rust language guide
