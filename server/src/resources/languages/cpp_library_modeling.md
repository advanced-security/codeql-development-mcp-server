# Customizing Library Models for C/C++

## Purpose

Customize data-flow and taint analysis for C/C++ by modeling frameworks and libraries via data extensions (YAML) and model packs. This enables accurate flow tracking through third-party libraries not included in CodeQL databases.

For common guidance on data extensions (YAML structure, model packs, development workflow), see `codeql://learning/data-extensions`.

## Data Extensions Overview

### Structure

Data extensions use YAML format to extend CodeQL's knowledge of library behavior:

```yaml
extensions:
  - addsTo:
      pack: codeql/cpp-all
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

C/C++ uses a **MaD (Models as Data)** format with **9–10 column tuples**. Same structural pattern as Java/Kotlin, C#, and Go, but with namespace-based identification and pointer indirection support.

## Extensible Predicates for C/C++

| Predicate           | Columns                                                                                      | Purpose                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `sourceModel`       | `(namespace, type, subtypes, name, signature, ext, output, kind, provenance)`                | Model sources of tainted data                                            |
| `sinkModel`         | `(namespace, type, subtypes, name, signature, ext, input, kind, provenance)`                 | Model sinks                                                              |
| `summaryModel`      | `(namespace, type, subtypes, name, signature, ext, input, output, kind, provenance)`         | Model flow through functions                                             |
| `barrierModel`      | `(namespace, type, subtypes, name, signature, ext, output, kind, provenance)`                | Model barriers (sanitizers) that stop taint flow                         |
| `barrierGuardModel` | `(namespace, type, subtypes, name, signature, ext, input, acceptingValue, kind, provenance)` | Model barrier guards (validators) that stop taint via conditional checks |

**Note:** C/C++ does **not** currently support `neutralModel`.

## Tuple Column Reference

| Column           | Description                                                                          | Example                           |
| ---------------- | ------------------------------------------------------------------------------------ | --------------------------------- |
| `namespace`      | C++ namespace (use `""` for global namespace)                                        | `"boost::asio"`, `""`             |
| `type`           | Class name (use `""` for free functions)                                             | `""`, `"Socket"`                  |
| `subtypes`       | Whether model applies to overrides (`True`/`False`). Use `False` for free functions. | `False`                           |
| `name`           | Function or method name                                                              | `"read_until"`, `"write"`         |
| `signature`      | Can narrow between overloaded functions. Use `""` to match all overloads.            | `""`                              |
| `ext`            | Leave empty (`""`)                                                                   | `""`                              |
| `input`/`output` | Access path (supports pointer indirection via `*`)                                   | `"Argument[*1]"`, `"ReturnValue"` |
| `kind`           | Source/sink/summary kind                                                             | `"remote"`, `"remote-sink"`       |
| `provenance`     | Origin of the model                                                                  | `"manual"`                        |

### Important: C/C++-Specific Rules

- **Pointer indirection**: Use the `*` prefix on argument indices to dereference pointers. `Argument[*1]` means "the pointed-to value of the second argument."
- **Free functions** have `type` = `""` and `subtypes` = `False`
- **Namespace nesting**: Use `::` separator (e.g., `"boost::asio"`)
- **Global namespace** functions use `""` for the namespace column
- **Signature column** can be used to disambiguate overloaded functions, but `""` matches all overloads

## Access Paths

| Component        | Description                                        |
| ---------------- | -------------------------------------------------- |
| `Argument[n]`    | Argument at index n (0-based, the value itself)    |
| `Argument[*n]`   | First indirection (pointed-to value) of argument n |
| `ReturnValue`    | Return value of the function                       |
| `ReturnValue[*]` | Pointed-to value of the return value               |

## Sink Kinds

`sql-injection`, `command-injection`, `path-injection`, `remote-sink` (data transmitted across network), `format-string` (uncontrolled format strings)

## Sample Model

Given a snippet using `boost::asio`:

```cpp
boost::asio::write(socket, send_buffer, error); // sink: data sent over network
```

`boost_asio.model.yml`

```yaml
extensions:
  - addsTo:
      pack: codeql/cpp-all
      extensible: sourceModel
    data: []

  - addsTo:
      pack: codeql/cpp-all
      extensible: sinkModel
    data:
      - ['boost::asio', '', False, 'write', '', '', 'Argument[*1]', 'remote-sink', 'manual']

  - addsTo:
      pack: codeql/cpp-all
      extensible: summaryModel
    data: []

  - addsTo:
      pack: codeql/cpp-all
      extensible: barrierModel
    data: []

  - addsTo:
      pack: codeql/cpp-all
      extensible: barrierGuardModel
    data: []
```

## Examples

### Source from Network Read

```yaml
extensions:
  - addsTo:
      pack: codeql/cpp-all
      extensible: sourceModel
    data:
      - ['boost::asio', '', False, 'read_until', '', '', 'Argument[*1]', 'remote', 'manual']
```

Note: `Argument[*1]` means the **pointed-to value** of the second argument (the buffer being filled with network data).

### Flow Through `boost::asio::buffer`

```yaml
extensions:
  - addsTo:
      pack: codeql/cpp-all
      extensible: summaryModel
    data:
      - [
          'boost::asio',
          '',
          False,
          'buffer',
          '',
          '',
          'Argument[*0]',
          'ReturnValue',
          'taint',
          'manual'
        ]
```

### Barrier: `mysql_real_escape_string`

The `mysql_real_escape_string` function escapes special characters in a string for use in SQL statements, preventing SQL injection. The escaped output (written to the second argument's pointed-to value) is safe.

```cpp
char *escaped_name = new char[2 * strlen(name) + 1];
mysql_real_escape_string(mysql, escaped_name, name, strlen(name)); // escaped_name is safe for SQL
```

```yaml
extensions:
  - addsTo:
      pack: codeql/cpp-all
      extensible: barrierModel
    data:
      - [
          '',
          '',
          False,
          'mysql_real_escape_string',
          '',
          '',
          'Argument[*1]',
          'sql-injection',
          'manual'
        ]
```

Note: `Argument[*1]` means the **pointed-to value** of the second argument — the output buffer that receives the escaped string. The `kind` `"sql-injection"` must match the sink kind used by SQL injection queries.

### Barrier Guard: Validation Function

A barrier guard models a function that returns a boolean indicating whether data is safe. When the function returns the expected value, taint flow is stopped through the guarded branch.

```cpp
if (is_safe(user_input)) { // The check guards the use
    mysql_query(user_input); // This is safe
}
```

```yaml
extensions:
  - addsTo:
      pack: codeql/cpp-all
      extensible: barrierGuardModel
    data:
      - ['', '', False, 'is_safe', '', '', 'Argument[*0]', 'true', 'sql-injection', 'manual']
```

Note: The `acceptingValue` `"true"` means the barrier applies when `is_safe` returns true. The `input` `"Argument[*0]"` identifies the value being validated (the pointed-to value of the first argument).

## Key Differences from Other Languages

| Aspect              | C/C++                                                 | Java/C#/Go                              |
| ------------------- | ----------------------------------------------------- | --------------------------------------- |
| Pack name           | `codeql/cpp-all`                                      | `codeql/java-all`, etc.                 |
| Identifier column 1 | `namespace` (C++ namespace)                           | `package`/`namespace`                   |
| Pointer indirection | `Argument[*n]` for dereferenced pointers              | Not applicable                          |
| `neutralModel`      | Not supported                                         | Supported                               |
| Receiver access     | Not applicable (C++ uses `Argument[this]` if modeled) | `Argument[this]` / `Argument[receiver]` |

## Related Resources

- `codeql://learning/data-extensions` — Common data extensions overview
- `codeql://languages/cpp/ast` — C/C++ AST class reference
- `codeql://languages/cpp/security` — C/C++ security query patterns
- [Customizing Library Models for C and C++](https://codeql.github.com/docs/codeql-language-guides/customizing-library-models-for-cpp/)
