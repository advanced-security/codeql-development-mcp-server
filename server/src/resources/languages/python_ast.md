# CodeQL AST nodes for `python` language

## Expected test results for local `PrintAst.ql` query

This repo contains a variant of the open-source `PrintAst.ql` query for `python` language, with modifications for local testing:

- Use the `codeql_query_run` tool with `queryName="PrintAST"` and `language="python"` to run the bundled PrintAST query
- Use the `codeql_test_run` tool to run the PrintAST test and compare against expected results

## CodeQL's core AST classes for `python` language

### Expression Types

- **`Call`** - Function/method calls (e.g., `func(args)`)
- **`Attribute`** - Attribute access (e.g., `obj.attr`, `module.function`)
- **`Subscript`** - Subscript operations (e.g., `obj[key]`, `list[0]`)
- **`Name`** - Variable references and identifiers
- **`StringLiteral`** - String literals (e.g., `"hello"`, `'world'`)
- **`Bytes`** - Byte string literals
- **`List`** - List literals (e.g., `[1, 2, 3]`)
- **`Dict`** - Dictionary literals (e.g., `{"key": "value"}`)
- **`KeyValuePair`** - Key-value pairs in dictionaries
- **`BinOp`** - Binary operations (e.g., `+`, `-`, `*`)
- **`UnaryExpr`** - Unary expressions (e.g., `not`, `-`)

### Statement Types

- **`FunctionDef`** - Function definitions
- **`FunctionExpr`** - Function expressions
- **`Function`** - Function objects
- **`ClassDef`** - Class definitions
- **`ClassExpr`** - Class expressions
- **`Class`** - Class objects
- **`Import`** - Import statements (`import module`)
- **`ImportFrom`** - From-import statements (`from module import name`)
- **`ImportExpr`** - Import expressions
- **`Assign`** - Assignment statements (e.g., `x = y`)
- **`AssignStmt`** - Assignment statement nodes
- **`If`** - Conditional statements
- **`For`** - For loop statements
- **`While`** - While loop statements
- **`Return`** - Return statements
- **`ExprStmt`** - Expression statements
- **`Pass`** - Pass statements

### Parameters and Arguments

- **`Parameter`** - Function parameters
- **`arguments`** - Function argument lists
- **`parameters`** - Function parameter lists

### Control Flow

- **`StmtList`** - Statement lists (body, orelse)
- **`body`** - Statement body containers
- **`orelse`** - Else clause containers

### YAML Support (for configuration files)

- **`YamlScalar`** - YAML scalar values
- **`YamlMapping`** - YAML mapping/dictionary structures
- **`YamlSequence`** - YAML sequence/list structures
- **`YamlAliasNode`** - YAML alias references

## Expected test results for open-source `PrintAst.ql` query

The following links can be fetched to get the expected results for different unit tests of the open-source `PrintAst.ql` query for the `python` language:

- [github-codeql:python/ql/test/library-tests/taint/general/printAst.expected](https://github.com/github/codeql/blob/main/python/ql/test/library-tests/taint/general/printAst.expected)
- [github-codeql:python/ql/test/library-tests/Yaml/printAst.expected](https://github.com/github/codeql/blob/main/python/ql/test/library-tests/Yaml/printAst.expected)
