# Customizing Library Models for Ruby

## Purpose

Customize data-flow and taint analysis for Ruby by modeling frameworks and libraries via data extensions (YAML) and model packs. This enables accurate flow tracking through third-party libraries not included in CodeQL databases.

For common guidance on data extensions (YAML structure, model packs, development workflow), see `codeql://learning/data-extensions`.

## Data Extensions Overview

### Structure

Data extensions use YAML format to extend CodeQL's knowledge of library behavior:

```yaml
extensions:
  - addsTo:
      pack: codeql/ruby-all
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

Ruby uses an **API Graph-based** model format with short tuples (3–5 columns) — similar to JavaScript/TypeScript and Python.

## Extensible Predicates for Ruby

| Predicate           | Columns                              | Purpose                                                                  |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------------ |
| `sourceModel`       | `(type, path, kind)`                 | Model sources of tainted data                                            |
| `sinkModel`         | `(type, path, kind)`                 | Model sinks where tainted data is used vulnerably                        |
| `summaryModel`      | `(type, path, input, output, kind)`  | Model flow through method calls                                          |
| `barrierModel`      | `(type, path, kind)`                 | Model barriers (sanitizers) that stop taint flow                         |
| `barrierGuardModel` | `(type, path, acceptingValue, kind)` | Model barrier guards (validators) that stop taint via conditional checks |
| `typeModel`         | `(type1, type2, path)`               | Define type relationships                                                |

## Type Column

The `type` column identifies a starting point for access path evaluation:

- A class name like `"TTY::Command"` matches instances of that class
- Appending `!` (e.g., `"Sinatra::Base!"`) matches references to the **class itself** rather than instances
- `typeModel` rows can define aliases so that subtypes inherit all models from a parent type

## Access Paths

Access paths are `.`-separated, evaluated left to right:

| Component               | Description                                             |
| ----------------------- | ------------------------------------------------------- |
| `Method[name]`          | Calls to the named method                               |
| `Argument[n]`           | Argument at index n                                     |
| `Argument[name:]`       | Keyword argument with the given name                    |
| `Argument[self]`        | The receiver of a method call                           |
| `Argument[block]`       | The block argument                                      |
| `Argument[any]`         | Any argument (except self/block)                        |
| `Argument[any-named]`   | Any keyword argument                                    |
| `Argument[hash-splat]`  | All keyword arguments (`**kwargs`)                      |
| `Parameter[n]`          | Parameter at index n                                    |
| `Parameter[name:]`      | Keyword parameter with the given name                   |
| `Parameter[self]`       | The self parameter                                      |
| `Parameter[block]`      | The block parameter                                     |
| `Parameter[any]`        | Any parameter (except self/block)                       |
| `Parameter[any-named]`  | Any keyword parameter                                   |
| `Parameter[hash-splat]` | Hash splat parameter                                    |
| `ReturnValue`           | Return value of a call                                  |
| `Element[any]`          | Any element of an array or hash                         |
| `Element[n]`            | Array element at the given index                        |
| `Element[key]`          | Hash element at the given key                           |
| `Field[@name]`          | Instance variable with the given name                   |
| `Fuzzy`                 | All values derived from the current value (approximate) |

### Syntax Notes

- Multiple operands: `Method[foo,bar]` matches calls to either `foo` or `bar`
- Numeric ranges: `Argument[1..]` matches all arguments from index 1 onward

## Sink Kinds

`code-injection`, `command-injection`, `path-injection`, `sql-injection`, `url-redirection`, `log-injection`

## Sample Model

Given a snippet using the `tty-command` gem:

```ruby
tty = TTY::Command.new
tty.run(cmd) # sink: command injection
```

`tty_command.model.yml`

```yaml
extensions:
  - addsTo:
      pack: codeql/ruby-all
      extensible: sourceModel
    data: []

  - addsTo:
      pack: codeql/ruby-all
      extensible: sinkModel
    data:
      - ['TTY::Command', 'Method[run].Argument[0]', 'command-injection']

  - addsTo:
      pack: codeql/ruby-all
      extensible: summaryModel
    data: []

  - addsTo:
      pack: codeql/ruby-all
      extensible: barrierModel
    data: []

  - addsTo:
      pack: codeql/ruby-all
      extensible: barrierGuardModel
    data: []

  - addsTo:
      pack: codeql/ruby-all
      extensible: typeModel
    data: []
```

## Examples

### Flow Through a Method

Model flow through `URI.decode_uri_component`:

```yaml
extensions:
  - addsTo:
      pack: codeql/ruby-all
      extensible: summaryModel
    data:
      - ['URI!', 'Method[decode_uri_component]', 'Argument[0]', 'ReturnValue', 'taint']
```

Note: `URI!` with the `!` suffix matches the class itself (not instances), since `decode_uri_component` is a class method.

### Source from Block Parameters

Model `x` in a Sinatra route block as a remote source:

```yaml
extensions:
  - addsTo:
      pack: codeql/ruby-all
      extensible: sourceModel
    data:
      - ['Sinatra::Base!', 'Method[get].Argument[block].Parameter[0]', 'remote']
```

### typeModel for Subclass Inheritance

When `Mysql2::EM::Client` is a subclass of `Mysql2::Client`, add a type model so all parent models apply:

```yaml
extensions:
  - addsTo:
      pack: codeql/ruby-all
      extensible: typeModel
    data:
      - ['Mysql2::Client', 'Mysql2::EM::Client', '']
```

### Barrier: `Mysql2::Client#escape`

The `escape` method on `Mysql2::Client` escapes special characters in a string for use in SQL statements, preventing SQL injection.

```ruby
client = Mysql2::Client.new
escaped = client.escape(input) # Safe for SQL injection
client.query("SELECT * FROM users WHERE name = '#{escaped}'")
```

```yaml
extensions:
  - addsTo:
      pack: codeql/ruby-all
      extensible: barrierModel
    data:
      - ['Mysql2::Client', 'Method[escape].ReturnValue', 'sql-injection']
```

Note: The `type` `"Mysql2::Client"` matches instances of the class. The `kind` `"sql-injection"` must match the sink kind used by SQL injection queries.

### Barrier Guard: Validation Method

A barrier guard models a method that returns a boolean indicating whether data is safe. When the method returns the expected value, taint flow is stopped through the guarded branch.

```ruby
if Validator.is_safe(user_input)
  # The check guards the use, so the input is safe.
  client.query("SELECT * FROM users WHERE name = '#{user_input}'")
end
```

```yaml
extensions:
  - addsTo:
      pack: codeql/ruby-all
      extensible: barrierGuardModel
    data:
      - ['Validator!', 'Method[is_safe].Argument[0]', 'true', 'sql-injection']
```

Note: The `!` suffix on `"Validator!"` matches the class itself (not instances), since `is_safe` is a class method. The `acceptingValue` `"true"` means the barrier applies when `is_safe` returns true.

## Related Resources

- `codeql://learning/data-extensions` — Common data extensions overview
- `codeql://languages/ruby/ast` — Ruby AST class reference
- [Customizing Library Models for Ruby](https://codeql.github.com/docs/codeql-language-guides/customizing-library-models-for-ruby/)
- [Using API graphs in Ruby](https://codeql.github.com/docs/codeql-language-guides/using-api-graphs-in-ruby/)
