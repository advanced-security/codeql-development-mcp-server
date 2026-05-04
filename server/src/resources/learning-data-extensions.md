# CodeQL Data Extensions Overview

## Purpose

Data extensions (Models-as-Data / MaD) let you customize CodeQL's taint tracking and data-flow analysis for third-party libraries and frameworks — without writing QL code. You author YAML files that declare which functions are sources, sinks, summaries, barriers, barrier guards, or neutral.

For language-specific guidance, see the per-language library-modeling resources at `codeql://languages/{language}/library-modeling`.

## When to Use Data Extensions

Use data extensions when:

- A library is **not modeled** by the default CodeQL packs and you need taint to flow through its APIs
- You want to **add new sinks** for a framework that CodeQL does not cover out of the box
- You want to **reduce false positives** by marking sanitizers (barriers) or validation checks (barrier guards)
- You want to **reduce false negatives** by adding flow summaries for data-passing functions

Use a custom QL query instead when:

- You need complex control-flow reasoning beyond what access paths can express
- You need to correlate multiple call sites or match structural patterns that MaD cannot describe

## Two Model Formats

CodeQL uses two distinct formats depending on the language. The choice is fixed per language — you cannot mix formats. For authoritative language-specific details, see `codeql://languages/{language}/library-modeling`.

### MaD Tuple Format (9–10 Column Tuples)

**Languages**: C/C++, C#, Go, Java/Kotlin, Swift

Identifies callables by **package/namespace, type, method name, and signature**. Each row is a tuple of 9–10 string columns.

> **Rust** uses a distinct crate-path-based format that does not match either the tuple or API-graph layout described here. Consult `codeql://languages/rust/library-modeling` for the Rust-specific column layout.

```yaml
extensions:
  - addsTo:
      pack: codeql/<language>-all
      extensible: sinkModel
    data:
      - [
          'package',
          'Type',
          True,
          'methodName',
          '(Signature)',
          '',
          'Argument[0]',
          'sql-injection',
          'manual'
        ]
```

| Column                  | Description                                                               |
| ----------------------- | ------------------------------------------------------------------------- |
| `package` / `namespace` | Fully qualified package or namespace path                                 |
| `type`                  | Class or type name (`""` for free functions)                              |
| `subtypes`              | `True` to include subclass overrides; `False` for exact match only        |
| `name`                  | Method or function name                                                   |
| `signature`             | Parameter type signature (`""` to match all overloads)                    |
| `ext`                   | Reserved — always `""`                                                    |
| `input` / `output`      | Access path (see below)                                                   |
| `kind`                  | Source/sink/summary kind (e.g., `"sql-injection"`, `"taint"`, `"remote"`) |
| `provenance`            | Origin marker — use `"manual"` for hand-written models                    |

### API Graph Format (3–5 Column Tuples)

**Languages**: JavaScript/TypeScript, Python, Ruby

Identifies callables by **package name and access path** through the API graph. Tuples are shorter (3–5 columns).

```yaml
extensions:
  - addsTo:
      pack: codeql/<language>-all
      extensible: sinkModel
    data:
      - ['package-name', 'Member[method].Argument[0]', 'sql-injection']
```

| Column | Description                                       |
| ------ | ------------------------------------------------- |
| `type` | Package or module name, class name, or `"global"` |
| `path` | Dot-separated API graph access path               |
| `kind` | Source/sink kind                                  |

For `summaryModel`, two additional columns specify `input` and `output` access paths.

## YAML Structure

All data extension files use the same top-level structure:

```yaml
extensions:
  - addsTo:
      pack: codeql/<language>-all # Target pack
      extensible: <predicate-name> # e.g., sourceModel, sinkModel
    data:
      - <tuple1>
      - <tuple2>
```

Multiple `addsTo` blocks can appear in a single file. Multiple YAML files are combined using union semantics — rows merge across files and duplicates are automatically removed.

## Extensible Predicates

| Predicate           | Purpose                                                          | Available In                   |
| ------------------- | ---------------------------------------------------------------- | ------------------------------ |
| `sourceModel`       | Define sources of untrusted data (e.g., HTTP request parameters) | All languages                  |
| `sinkModel`         | Define dangerous operations (e.g., SQL query execution)          | All languages                  |
| `summaryModel`      | Define how data flows through a function (input → output)        | All languages                  |
| `barrierModel`      | Define sanitizers that stop taint flow (e.g., HTML-escaping)     | All languages (CodeQL 2.25.2+) |
| `barrierGuardModel` | Define validators that stop taint via conditional checks         | All languages (CodeQL 2.25.2+) |
| `neutralModel`      | Mark functions as having no dataflow impact (reduces noise)      | MaD tuple languages + Python   |
| `typeModel`         | Define type relationships for untyped code                       | API Graph languages only       |

## Common Access Path Components

### MaD Tuple Languages

| Component             | Description                                           |
| --------------------- | ----------------------------------------------------- |
| `Argument[n]`         | Argument at index n (0-based)                         |
| `Argument[this]`      | The receiver/qualifier of a method call               |
| `Argument[receiver]`  | The receiver (Go-specific, replaces `Argument[this]`) |
| `Argument[n1..n2]`    | Range of arguments                                    |
| `ReturnValue`         | Return value of the function                          |
| `ReturnValue[n]`      | The nth return value (Go only, 0-indexed)             |
| `Field[name]`         | Named field of a struct/class                         |
| `Element`             | Elements of a collection                              |
| `ArrayElement`        | Elements of an array/slice                            |
| `MapKey` / `MapValue` | Key or value of a map                                 |
| `Parameter[n]`        | Parameter of a callback/lambda                        |

### API Graph Languages

| Component      | Description                                             |
| -------------- | ------------------------------------------------------- |
| `Member[name]` | Property or attribute access                            |
| `Argument[n]`  | Argument at index n                                     |
| `Parameter[n]` | Parameter at index n                                    |
| `ReturnValue`  | Return value                                            |
| `ArrayElement` | Array element                                           |
| `MapValue`     | Map value                                               |
| `Instance`     | Instances of a class                                    |
| `Fuzzy`        | All values derived from the current value (approximate) |

## Threat Model Kinds (Sources)

| Kind       | Description                                                      |
| ---------- | ---------------------------------------------------------------- |
| `remote`   | Remote/network input (HTTP requests, WebSocket messages)         |
| `local`    | Local input (files, CLI arguments, environment variables, stdin) |
| `database` | Data from database reads                                         |

## Sink Kinds

Common sink kinds across all languages:

`sql-injection`, `command-injection`, `code-injection`, `path-injection`, `url-redirection`, `log-injection`, `request-forgery`, `xpath-injection`, `html-injection`

See per-language resources for language-specific sink kinds.

## Model Packs

### Structure

Group data extension files into a distributable CodeQL model pack:

```yaml
# codeql-pack.yml
name: my-org/security-models
version: 1.0.0
dependencies:
  codeql/<language>-all: '*'
dataExtensions:
  - 'ext/*.model.yml'
```

### Testing Extensions

Apply extensions during query execution or testing:

```bash
# Run a query with extensions
codeql query run --additional-packs=<model-pack-dir> <query.ql> --database=<db>

# Run tests with extensions
codeql test run --additional-packs=<model-pack-dir> <test-dir>
```

### Publishing to GitHub Container Registry

```bash
codeql pack publish
```

Consumers can use published model packs via:

```yaml
# In consumer's codeql-pack.yml
dependencies:
  my-org/security-models: '^1.0.0'
```

Or configure them org-wide for GitHub Code Scanning Default Setup.

## Development Workflow

1. **Identify the gap** — run a CodeQL query against a codebase and observe missing coverage (false negatives) or incorrect results (false positives)
2. **Analyze the library** — understand the API surface: which functions are sources, sinks, or data-passing
3. **Create model YAML** — write a `.model.yml` file with the appropriate extensible predicates
4. **Test with `--additional-packs`** — verify the extension produces expected results using `codeql query run` or `codeql test run`
5. **Iterate** — refine access paths and add barrier/barrierGuard models to reduce false positives
6. **Package and publish** — bundle into a model pack for distribution

## Related Resources

- `codeql://languages/{language}/library-modeling` — Language-specific library modeling guide
- `codeql://templates/security` — Security query templates
- `codeql://learning/query-basics` — QL query writing reference
- `codeql://learning/test-driven-development` — TDD workflow for CodeQL
