# Customizing Library Models for Python

## Purpose

Customize data-flow and taint analysis for Python by modeling frameworks and libraries via data extensions (YAML) and model packs. This enables accurate flow tracking through third-party libraries not included in CodeQL databases.

For common guidance on data extensions (YAML structure, model packs, development workflow), see `codeql://learning/data-extensions`.

## Data Extensions Overview

### Structure

Data extensions use YAML format to extend CodeQL's knowledge of library behavior:

```yaml
extensions:
  - addsTo:
      pack: codeql/python-all
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

Python uses an **API Graph-based** model format with short tuples (3–5 columns) — similar to JavaScript/TypeScript and Ruby. Access paths in extensions are powered by API graphs.

## Extensible Predicates for Python

| Predicate           | Columns                              | Purpose                                                                  |
| ------------------- | ------------------------------------ | ------------------------------------------------------------------------ |
| `sourceModel`       | `(type, path, kind)`                 | Model sources of tainted data                                            |
| `sinkModel`         | `(type, path, kind)`                 | Model sinks where tainted data is used vulnerably                        |
| `summaryModel`      | `(type, path, input, output, kind)`  | Model flow through function calls                                        |
| `barrierModel`      | `(type, path, kind)`                 | Model barriers (sanitizers) that stop taint flow                         |
| `barrierGuardModel` | `(type, path, acceptingValue, kind)` | Model barrier guards (validators) that stop taint via conditional checks |
| `neutralModel`      | `(type, path, kind)`                 | Mark functions as having no dataflow impact                              |
| `typeModel`         | `(type1, type2, path)`               | Define type relationships                                                |

## Type Column

The `type` column identifies the top-level Python module import. For example:

- `"flask"` matches `import flask` or `from flask import ...`
- `"databricks"` matches `import databricks` or `from databricks import ...`

## Access Paths

Access paths are `.`-separated, evaluated left to right. They mirror Python's API graph navigation:

| Component           | Description                                 |
| ------------------- | ------------------------------------------- |
| `Member[name]`      | Attribute access (e.g., `.sql`, `.connect`) |
| `Argument[n]`       | Positional argument at index n              |
| `Argument[name:]`   | Keyword argument with the given name        |
| `Argument[n,name:]` | Positional or keyword argument              |
| `ReturnValue`       | Return value of a call                      |
| `Parameter[n]`      | Parameter at index n                        |
| `Subclass`          | Subclasses of a class                       |

### API Graph Verification

You can verify API graph paths by running a QL query against your database:

```ql
import python
import semmle.python.ApiGraphs

from API::CallNode call
where
  call = API::moduleImport("re").getMember("compile").getACall() and
  call.getParameter(0, "pattern") =
    API::moduleImport("argparse")
      .getMember("ArgumentParser")
      .getReturn()
      .getMember("parse_args")
      .getMember(_)
select call
```

### How Access Path Parsing Works

The path `"Member[sql].Member[connect].ReturnValue.Member[cursor].ReturnValue.Member[execute].Argument[0]"` is tokenized into:

1. `Member[sql]` — attribute access `.sql`
2. `Member[connect]` — attribute access `.connect`
3. `ReturnValue` — the return value of calling `.connect()`
4. `Member[cursor]` — attribute access `.cursor`
5. `ReturnValue` — the return value of calling `.cursor()`
6. `Member[execute]` — attribute access `.execute`
7. `Argument[0]` — the first argument to `.execute()`

## Sink Kinds

`sql-injection`, `command-injection`, `code-injection`, `path-injection`, `url-redirection`, `log-injection`, `request-forgery`

## Sample Model

Given this snippet using the Databricks SQL connector:

```python
from flask import Flask, request
import databricks.sql as dbsql

app = Flask(__name__)

@app.get("/q")
def q():
    s = request.args["s"] # remote user input
    query = "SELECT * FROM users WHERE name='" + s + "'"

    with dbsql.connect(server_hostname="HOST", http_path="HTTP_PATH", access_token="TOKEN") as conn:
        with conn.cursor() as cursor:
            cursor.execute(query) # sink we want to model
            return str(cursor.fetchall())
```

`databricks.model.yml`

```yaml
extensions:
  - addsTo:
      pack: codeql/python-all
      extensible: sourceModel
    data: []

  - addsTo:
      pack: codeql/python-all
      extensible: sinkModel
    data:
      - [
          'databricks',
          'Member[sql].Member[connect].ReturnValue.Member[cursor].ReturnValue.Member[execute].Argument[0]',
          'sql-injection'
        ]

  - addsTo:
      pack: codeql/python-all
      extensible: summaryModel
    data: []

  - addsTo:
      pack: codeql/python-all
      extensible: barrierModel
    data: []

  - addsTo:
      pack: codeql/python-all
      extensible: barrierGuardModel
    data: []

  - addsTo:
      pack: codeql/python-all
      extensible: neutralModel
    data: []

  - addsTo:
      pack: codeql/python-all
      extensible: typeModel
    data: []
```

## Examples

### Barrier: `html.escape`

The `html.escape` function HTML-escapes a string, preventing HTML injection (XSS) attacks.

```python
import html
escaped = html.escape(unknown) # Safe for XSS
```

```yaml
extensions:
  - addsTo:
      pack: codeql/python-all
      extensible: barrierModel
    data:
      - ['html', 'Member[escape].ReturnValue', 'html-injection']
```

Note: The `type` `"html"` starts at the `html` module import. The `path` navigates to the return value of `escape`. The `kind` `"html-injection"` must match the sink kind used by XSS queries.

### Barrier Guard: Django URL Validation

The `url_has_allowed_host_and_scheme` function from Django validates that a URL is safe for redirects.

```python
if url_has_allowed_host_and_scheme(url, allowed_hosts=...):
    redirect(url) # Safe
```

```yaml
extensions:
  - addsTo:
      pack: codeql/python-all
      extensible: barrierGuardModel
    data:
      - [
          'django',
          'Member[utils].Member[http].Member[url_has_allowed_host_and_scheme].Argument[0,url:]',
          'true',
          'url-redirection'
        ]
```

Note: The `acceptingValue` `"true"` means the barrier applies when the function returns true. `Argument[0,url:]` matches either the first positional argument or the keyword argument `url`.

## Related Resources

- `codeql://learning/data-extensions` — Common data extensions overview
- `codeql://languages/python/ast` — Python AST class reference
- `codeql://languages/python/security` — Python security query patterns
- [Customizing Library Models for Python](https://codeql.github.com/docs/codeql-language-guides/customizing-library-models-for-python/)
- [Using API graphs in Python](https://codeql.github.com/docs/codeql-language-guides/using-api-graphs-in-python/)
