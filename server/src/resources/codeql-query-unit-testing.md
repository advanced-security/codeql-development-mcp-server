# CodeQL Query Unit Testing

Guide for creating and running unit tests for CodeQL queries. For the broader TDD workflow (write tests, implement, iterate), see the `test_driven_development` resource and `ql_tdd_basic` / `ql_tdd_advanced` prompts.

## Test Directory Layout

There is no one single way to arrange CodeQL unit tests, though there are some commonalities.

For a recommended setup that uses separate "qlpacks" for CodeQL queries versus tests, a given CodeQL query and associated unit test may be laid out on the filesystem like:

```text
<query-pack-root>/<optional-queries-subdir>/{QueryName}/
├── {QueryName}.{md,qhelp}  # Recommended query documentation file
├── {QueryName}.ql          # Required query implementation file
└── {QueryName}.qll         # Optional query-specific library file
<test-pack-root>/<optional-tests-subdir>/{QueryOrTestName}/
├── {QueryName}.qlref       # qlref file contents point to the path of the query, relative to <query-pack-root>
├── Example1.{ext}          # Test source code (positive + negative cases)
├── {QueryName}.actual      # Actual test results; created dynamically via `codeql_test_run` tool
├── {QueryName}.expected    # Expected query results; defined prior to calling `codeql_test_run` tool
└── {QueryName}.testproj/   # Test database; auto-created by `codeql_test_extract` or `codeql_test_run` tools
```

## File Extensions by Language

| Language   | Test source extension(s) | Notes                                    |
| ---------- | ------------------------ | ---------------------------------------- |
| C/C++      | `.cpp`, `.c`, `.h`       | Use header files for shared declarations |
| C#         | `.cs`                    |                                          |
| Go         | `.go`                    | Must include `package` declaration       |
| Java       | `.java`                  | Must include `class` matching filename   |
| JavaScript | `.js`                    | Use `.ts` for TypeScript                 |
| Python     | `.py`                    |                                          |
| Ruby       | `.rb`                    |                                          |
| Swift      | `.swift`                 |                                          |

## Creating a Test

### 1. Query Reference File (`{QueryName}.qlref`)

Single line with the path to the query, relative to the query pack root:

```sh
src/{QueryName}/{QueryName}.ql
```

### 2. Test Source Code

Write test source files containing:

- **Positive cases**: Code patterns the query **should** detect
- **Negative cases**: Safe code the query **should not** flag
- **Edge cases**: Boundary conditions and unusual but valid patterns

Add comments to describe what each section tests.

### 3. Expected Results (`{QueryName}.expected`)

Tabular format matching the query's `select` clause columns:

```text
| file        | line | col | endLine | endCol | message          |
| Example1.js | 5    | 1   | 7       | 2      | Function: myFunc |
```

Leave the file empty or create it with a placeholder initially — run the query to generate actual results, then baseline with `codeql_test_accept`.

## Language-Specific Notes

### C/C++

- Use an `options` file in the test directory to set the C++ standard (e.g., `--std=c++17`).
- Include header files with include guards when testing patterns that span headers.
- Test pointer/reference, smart pointer, template instantiation, and STL container patterns as relevant.
- Key AST nodes: `Function`, `MemberFunction`, `Constructor`, `Class`, `Struct`, `PointerDereferenceExpr`, `FunctionCall`, `NewExpr`, `DeleteExpr`, `TemplateClass`, `TemplateFunction`.

### C\#

- Always include required `using` statements so test code compiles.
- Test .NET-specific patterns: LINQ, async/await, properties, pattern matching, ASP.NET controllers, Entity Framework.
- Key AST nodes: `Class`, `Method`, `Property`, `MethodCall`, `QueryExpr`, `AwaitExpr`, `Annotation`.

### Go

- Every test file must have a `package` declaration (typically `package main`).
- Test goroutine, channel, interface assertion, and error-handling patterns as relevant.
- Key AST nodes: `Function`, `CallExpr`, `SelectorExpr`, `GoStmt`, `SendStmt`, `TypeAssertExpr`.

### Java

- Each `.java` test file must contain a `public class` matching the filename.
- Test annotations, generics, lambda expressions, streams, and try-with-resources as relevant.
- Supports Spring, Servlet, and Jakarta EE framework patterns.
- Key AST nodes: `Method`, `Constructor`, `Class`, `MethodCall`, `LambdaExpr`, `MethodReference`, `Annotation`, `TypeVariable`.

### JavaScript / TypeScript

- Both CommonJS (`require`) and ES modules (`import`) are supported.
- Use `.ts` for TypeScript; JSX is supported in `.jsx`/`.tsx` files.
- Test browser APIs (DOM, `document.write`), Node.js APIs (`child_process`, `fs`), and framework patterns (Express, React) as relevant.
- Test async/await, Promises, and callback patterns.
- Key AST nodes: `Function`, `ArrowFunctionExpr`, `CallExpr`, `MethodCallExpr`, `PropAccess`, `AwaitExpr`, `TemplateLiteral`.

### Python

- Supports both Python 2 and Python 3 syntax.
- Test decorators, async/await, type hints, and dynamic code execution (`eval`, `exec`) as relevant.
- Test framework patterns: Django (ORM, templates), Flask (request, routing), FastAPI (dependency injection).
- Key AST nodes: `FunctionDef`, `ClassDef`, `Call`, `Attribute`, `Name`, `Lambda`, `Await`.

### Ruby

- Test metaprogramming (`send`, `define_method`, `eval`), blocks/lambdas, and string interpolation as relevant.
- Test Rails patterns (params, ActiveRecord, ActionView) and gem-specific APIs (Sinatra, Grape).
- Note: `asExpr()` in Ruby returns `CfgNodes::ExprCfgNode` (CFG node), not an AST node; use `.getExpr()` to get the AST node.
- Key AST nodes: `MethodCall`, `Block`, `StringInterpolation`, `ConstantReadAccess`.

### Swift

- Requires macOS with Xcode installed for test extraction.
- Supports Swift 5.4 through 6.2.
- Test iOS/macOS framework patterns: Foundation, UIKit, Security, CryptoKit, WKWebView.
- Test actors, property wrappers, async/await, and result builders as relevant.
- Key AST nodes: `ClassDecl`, `StructDecl`, `FuncDecl`, `CallExpr`, `MemberRefExpr`, `ClosureExpr`, `GuardStmt`.

## MCP Tool Workflow

| Step                  | Tool                          | Purpose                                   |
| --------------------- | ----------------------------- | ----------------------------------------- |
| Create test files     | `create_codeql_query`         | Scaffold query + test + `.qlref`          |
| Install dependencies  | `codeql_pack_install`         | Install pack dependencies                 |
| Extract test database | `codeql_test_extract`         | Build test DB from source files           |
| Inspect AST           | `codeql_query_run` (PrintAST) | Understand how test code is represented   |
| Run tests             | `codeql_test_run`             | Compare actual vs. expected results       |
| Accept results        | `codeql_test_accept`          | Baseline correct results into `.expected` |
