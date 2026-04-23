# Customizing Library Models for Java/Kotlin

## Purpose

Customize data-flow and taint analysis for Java and Kotlin by modeling frameworks and libraries via data extensions (YAML) and model packs. This enables accurate flow tracking through third-party libraries not included in CodeQL databases.

For common guidance on data extensions (YAML structure, model packs, development workflow), see `codeql://learning/data-extensions`.

## Data Extensions Overview

### Structure

Data extensions use YAML format to extend CodeQL's knowledge of library behavior:

```yaml
extensions:
  - addsTo:
      pack: codeql/java-all
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

Java/Kotlin uses a **MaD (Models as Data)** format with **9–10 column tuples** that identify callables by fully qualified package, type, method name, and signature. Same structural pattern as C#, C/C++, and Go.

## Extensible Predicates for Java/Kotlin

| Predicate           | Columns                                                                                    | Purpose                                                                  |
| ------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `sourceModel`       | `(package, type, subtypes, name, signature, ext, output, kind, provenance)`                | Model sources of tainted data                                            |
| `sinkModel`         | `(package, type, subtypes, name, signature, ext, input, kind, provenance)`                 | Model sinks                                                              |
| `summaryModel`      | `(package, type, subtypes, name, signature, ext, input, output, kind, provenance)`         | Model flow through methods                                               |
| `barrierModel`      | `(package, type, subtypes, name, signature, ext, output, kind, provenance)`                | Model barriers (sanitizers) that stop taint flow                         |
| `barrierGuardModel` | `(package, type, subtypes, name, signature, ext, input, acceptingValue, kind, provenance)` | Model barrier guards (validators) that stop taint via conditional checks |
| `neutralModel`      | `(package, type, name, signature, kind, provenance)`                                       | Mark methods as having no dataflow impact                                |

## Tuple Column Reference

| Column           | Description                                         | Example                          |
| ---------------- | --------------------------------------------------- | -------------------------------- |
| `package`        | Fully qualified package name                        | `"java.sql"`                     |
| `type`           | Class or interface name                             | `"Statement"`                    |
| `subtypes`       | Whether model applies to overrides (`True`/`False`) | `True`                           |
| `name`           | Method name (constructors use the class name)       | `"execute"`                      |
| `signature`      | Method parameter type signature                     | `"(String)"`                     |
| `ext`            | Leave empty (`""`)                                  | `""`                             |
| `input`/`output` | Access path to the input/output of the flow         | `"Argument[0]"`, `"ReturnValue"` |
| `kind`           | Source/sink/summary kind                            | `"sql-injection"`, `"taint"`     |
| `provenance`     | Origin of the model                                 | `"manual"`                       |

### Important: `subtypes` Flag

- `True` — the model applies to the method **and all overrides** in subclasses/implementing classes
- `False` — only applies to the exact class specified

### Important: `signature` Column

- Type names must be **fully qualified**: `"(String)"` means `java.lang.String`
- Multiple parameters: `"(String,int)"`
- Generic type parameters must match source: `"Select<TSource,TResult>"`
- Empty `""` matches any signature (use sparingly)

## Access Paths

| Component          | Description                             |
| ------------------ | --------------------------------------- |
| `Argument[n]`      | Argument at index n (0-based)           |
| `Argument[this]`   | The qualifier/receiver of a method call |
| `Argument[n1..n2]` | Range of arguments                      |
| `ReturnValue`      | Return value of the method              |
| `Element`          | Elements of a collection                |
| `Field[name]`      | Named field of a class                  |
| `Parameter[n]`     | Parameter at index n of a callback      |
| `MapKey`           | Key of a map                            |
| `MapValue`         | Value of a map                          |

## Sink Kinds

`sql-injection`, `command-injection`, `code-injection`, `path-injection`, `url-redirection`, `log-injection`, `request-forgery`, `xpath-injection`, `ldap-injection`, `jndi-injection`, `template-injection`, `hostname-verification`

## Threat Models (Java-Specific)

In addition to `remote` and `local`, Java supports:

- `android` (`android-external-storage-dir`, `contentprovider`) — Android-specific sources
- `reverse-dns` — reverse DNS lookups

## Sample Model

Given a snippet where `stmt.execute(query)` is a SQL injection sink:

```java
public static void taintsink(Connection conn, String query) throws SQLException {
    Statement stmt = conn.createStatement();
    stmt.execute(query); // sink: SQL injection
}
```

`jdbc.model.yml`

```yaml
extensions:
  - addsTo:
      pack: codeql/java-all
      extensible: sourceModel
    data: []

  - addsTo:
      pack: codeql/java-all
      extensible: sinkModel
    data:
      - [
          'java.sql',
          'Statement',
          True,
          'execute',
          '(String)',
          '',
          'Argument[0]',
          'sql-injection',
          'manual'
        ]

  - addsTo:
      pack: codeql/java-all
      extensible: summaryModel
    data: []

  - addsTo:
      pack: codeql/java-all
      extensible: barrierModel
    data: []

  - addsTo:
      pack: codeql/java-all
      extensible: barrierGuardModel
    data: []

  - addsTo:
      pack: codeql/java-all
      extensible: neutralModel
    data: []
```

## Examples

### Source from Network Socket

```yaml
extensions:
  - addsTo:
      pack: codeql/java-all
      extensible: sourceModel
    data:
      - ['java.net', 'Socket', False, 'getInputStream', '()', '', 'ReturnValue', 'remote', 'manual']
```

### Flow Through `String.concat`

```yaml
extensions:
  - addsTo:
      pack: codeql/java-all
      extensible: summaryModel
    data:
      - [
          'java.lang',
          'String',
          False,
          'concat',
          '(String)',
          '',
          'Argument[this]',
          'ReturnValue',
          'taint',
          'manual'
        ]
      - [
          'java.lang',
          'String',
          False,
          'concat',
          '(String)',
          '',
          'Argument[0]',
          'ReturnValue',
          'taint',
          'manual'
        ]
```

### Flow Through Higher-Order Method `Stream.map`

```yaml
extensions:
  - addsTo:
      pack: codeql/java-all
      extensible: summaryModel
    data:
      - [
          'java.util.stream',
          'Stream',
          True,
          'map',
          '(Function)',
          '',
          'Argument[this].Element',
          'Argument[0].Parameter[0]',
          'value',
          'manual'
        ]
      - [
          'java.util.stream',
          'Stream',
          True,
          'map',
          '(Function)',
          '',
          'Argument[0].ReturnValue',
          'ReturnValue.Element',
          'value',
          'manual'
        ]
```

Note: Two rows are needed — one for flow into the lambda parameter, one for flow from the lambda return to the output stream elements.

### Neutral Model

```yaml
extensions:
  - addsTo:
      pack: codeql/java-all
      extensible: neutralModel
    data:
      - ['java.time', 'Instant', 'now', '()', 'summary', 'manual']
```

### Barrier: Path Injection Prevention

The `File.getName()` method returns only the final component of a path, which protects against path injection vulnerabilities.

```java
public static void barrier(File file) {
    String name = file.getName(); // Only the filename, no directory traversal
}
```

```yaml
extensions:
  - addsTo:
      pack: codeql/java-all
      extensible: barrierModel
    data:
      - ['java.io', 'File', True, 'getName', '()', '', 'ReturnValue', 'path-injection', 'manual']
```

Note: The `kind` `"path-injection"` must match the sink kind used by path injection queries. `subtypes: True` ensures the model applies to subclasses of `File`.

### Barrier Guard: Request Forgery Prevention

The `URI.isAbsolute()` method returns `false` when the URI is relative and therefore safe for request forgery because it cannot redirect to an external server.

```java
public static void barrierguard(URI uri) throws IOException {
    if (!uri.isAbsolute()) { // The check guards the request
        URL url = uri.toURL();
        url.openConnection(); // Safe
    }
}
```

```yaml
extensions:
  - addsTo:
      pack: codeql/java-all
      extensible: barrierGuardModel
    data:
      - [
          'java.net',
          'URI',
          True,
          'isAbsolute',
          '()',
          '',
          'Argument[this]',
          'false',
          'request-forgery',
          'manual'
        ]
```

Note: The `acceptingValue` `"false"` means the barrier applies when `isAbsolute` returns false (the URI is relative). The `input` `"Argument[this]"` identifies the qualifier (`uri`) whose taint flow is blocked.

## Related Resources

- `codeql://learning/data-extensions` — Common data extensions overview
- `codeql://languages/java/ast` — Java AST class reference
- [Customizing Library Models for Java and Kotlin](https://codeql.github.com/docs/codeql-language-guides/customizing-library-models-for-java-and-kotlin/)
