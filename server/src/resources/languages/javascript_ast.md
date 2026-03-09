# CodeQL AST nodes for `javascript` language

## CodeQL's core AST classes for `javascript` language

Based on comprehensive analysis of CodeQL's JavaScript test results from GitHub, here are the core AST classes for JavaScript/TypeScript analysis:

### Core Expression Classes

**Primary Expressions:**

- `Literal` - String, number, boolean, null literals (e.g., `"hello"`, `42`, `true`, `null`)
- `VarRef` - Variable references (e.g., `x`, `myVar`)
- `ThisExpr` - The `this` keyword
- `ArrayExpr` - Array literals (e.g., `[1, 2, 3]`, `["source"]`)
- `ObjectExpr` - Object literals with properties (e.g., `{rel: "noopener"}`)

**Function and Call Expressions:**

- `FunctionExpr` - Function expressions and arrow functions
- `ArrowFunctionExpr` - Arrow function expressions (e.g., `(x) => x`, `() => true`)
- `CallExpr` - Function calls (e.g., `func()`, `getResource()`)
- `MethodCallExpr` - Method calls (e.g., `console.log()`, `arr.push()`)
- `NewExpr` - Constructor calls (e.g., `new Date()`, `new C3<number>()`)

**Access and Member Expressions:**

- `DotExpr` - Property access (e.g., `obj.prop`, `console.log`, `arr.length`)
- `IndexExpr` - Array/object indexing (e.g., `arr[0]`, `props["a:b"]`)
- `SpreadElement` - Spread syntax (e.g., `...arr`, `...linkTypes`)

**Operators and Assignments:**

- `BinaryExpr` - Binary operations (e.g., `x + y`, `i < arr.length`, `typeof val !== "string"`)
- `UnaryExpr` - Unary operations (e.g., `!condition`, `typeof val`, `++i`)
- `AssignExpr` - Assignment expressions (e.g., `x = 5`, `test = 20`)
- `CompoundAssignExpr` - Compound assignments (e.g., `a2 &&= a3`)
- `UpdateExpr` - Increment/decrement (e.g., `i++`, `--count`)

### Statement Classes

**Declaration Statements:**

- `DeclStmt` - Variable declarations (e.g., `var x = 5`, `const arr = []`)
- `VariableDeclarator` - Individual variable declarators within declarations
- `VarDecl` - Variable declaration identifiers
- `FunctionDeclStmt` - Function declarations
- `ClassDefinition` - Class declarations with constructors and methods

**Control Flow Statements:**

- `IfStmt` - Conditional statements with test expressions and blocks
- `ForStmt` - For loops with initialization, condition, and update
- `ForOfStmt` - For-of loops for iterating arrays and iterables
- `WhileStmt` - While loops
- `BlockStmt` - Block statements containing multiple statements
- `ReturnStmt` - Return statements with optional expressions
- `BreakStmt` - Break statements for loop control
- `ContinueStmt` - Continue statements
- `ThrowStmt` - Throw statements for error handling

**Expression Statements:**

- `ExprStmt` - Expression statements wrapping expressions

### Modern JavaScript Features

**ES6+ and Modern Syntax:**

- `TemplateString` - Template literals with interpolation
- `TaggedTemplateExpr` - Tagged template literals
- `ParenthesizedExpr` - Parenthesized expressions
- `ConditionalExpr` - Ternary conditional expressions

**Resource Management (Modern):**

- `ExplicitResource` - Using declarations for resource management (e.g., `using stream = getResource()`)
- Resource management in async contexts and for loops

### TypeScript-Specific AST Classes

**Type Annotations:**

- `KeywordTypeExpr` - Built-in types (e.g., `string`, `number`, `boolean`, `any`, `void`)
- `ArrayTypeExpr` - Array types (e.g., `string[]`, `number[][]`)
- `UnionTypeExpr` - Union types (e.g., `string | number | boolean`)
- `IntersectionTypeExpr` - Intersection types (e.g., `string & number & boolean`)
- `TupleTypeExpr` - Tuple types (e.g., `[number, string, boolean]`, `[...T, ...U]`)
- `ParenthesizedTypeExpr` - Parenthesized types (e.g., `(string)`, `(boolean | string)`)

**Advanced Types:**

- `GenericTypeExpr` - Generic types (e.g., `Generic<number>`, `Generic<Leaf[]>`)
- `LocalTypeAccess` - Local type references (e.g., `Interface`, `Generic`, `Leaf`)
- `FunctionTypeExpr` - Function types (e.g., `() => number`, `new () => Object`)
- `TypeofTypeExpr` - Typeof types (e.g., `typeof x`)
- `IsTypeExpr` - Type predicate expressions (e.g., `x is Generic<Leaf[]>`, `this is Leaf`)
- `PredicateTypeExpr` - Assertion signatures (e.g., `asserts condition`)
- `RestTypeExpr` - Rest types in tuples (e.g., `...T`, `...number[]`)

**Type Declarations:**

- `TypeDefinition` - Type definitions and interfaces
- `InterfaceDeclaration` - Interface declarations with properties
- `TypeParameter` - Generic type parameters (e.g., `T`, `S extends number`)
- `FieldDeclaration` - Interface/class field declarations

**Type Access:**

- `LocalVarTypeAccess` - Local variable type access (e.g., `x` in type position)
- `ThisVarTypeAccess` - This type access (e.g., `this` in type predicates)

### JSX Classes (React Support)

**JSX Elements:**

- `JsxElement` - JSX elements (e.g., `<div>`, `<MyComponent>`, `<Foo/>`)
- `JsxFragment` - JSX fragments (e.g., `<>...</>`)
- `JsxAttribute` - JSX attributes (e.g., `href={href}`, `target="_blank"`)
- `JsxEmptyExpr` - Empty JSX expressions (e.g., `{/* comment */}`)

**JSX Structure:**

- JSX elements support attributes, spread attributes, and nested content
- Namespaced attributes (e.g., `a:b="hello"`)
- Component references and dot notation (e.g., `MyComponents.FancyLink`)

### Decorator Support

**Decorator Classes:**

- `Decorator` - Decorator expressions (e.g., `@Dec()`)
- Decorators on classes, methods, and properties
- Support for decorator factories and complex decorator expressions

### Pattern Matching

**Destructuring Patterns:**

- `ObjectPattern` - Object destructuring patterns
- `ArrayPattern` - Array destructuring patterns
- `PropertyPattern` - Property patterns in object destructuring
- `RestElement` - Rest elements in destructuring

### Array Methods and Operations

**Array-Specific AST:**

- Comprehensive support for array methods: `forEach`, `map`, `filter`, `find`, `findLast`, `findLastIndex`
- Array method chaining with proper AST representation
- Spread operations in arrays and function calls
- Array manipulation methods: `push`, `pop`, `slice`, `splice`, `toSpliced`

### Class and OOP Features

**Class Components:**

- `ClassInitializedMember` - Class members (methods, constructors)
- `ConstructorDefinition` - Class constructors
- `MethodDefinition` - Class methods
- `FieldDeclaration` - Class fields and properties

### Parameter Handling

**Parameter Types:**

- `SimpleParameter` - Simple function parameters
- `Parameter` - General parameter interface
- `RestParameter` - Rest parameters (e.g., `...args`)

### Utility and Meta Classes

**Labels and References:**

- `Label` - Property names, method names, and identifiers
- `Identifier` - General identifiers in various contexts

**Parser Infrastructure:**

- `Arguments` - Function call arguments container
- `Parameters` - Function parameter container
- `Body` - Statement body container
- `Attributes` - JSX attributes container

## Expected test results for local `PrintAst.ql` query

This repo contains a variant of the open-source `PrintAst.ql` query for `javascript` language, with modifications for local testing:

- Use the `codeql_query_run` tool with `queryName="PrintAST"` and `language="javascript"` to run the bundled PrintAST query
- Use the `codeql_test_run` tool to run the PrintAST test and compare against expected results

## Expected test results for open-source `PrintAst.ql` query

The following links can be fetched to get the expected results for different unit tests of the open-source `PrintAst.ql` query for the `javascript` language:

- [library-tests/RegExp/VFlagOperations/QuotedString/printAst.expected](https://github.com/github/codeql/blob/main/javascript/ql/test/library-tests/RegExp/VFlagOperations/QuotedString/printAst.expected)
- [library-tests/RegExp/VFlagOperations/Subtraction/printAst.expected](https://github.com/github/codeql/blob/main/javascript/ql/test/library-tests/RegExp/VFlagOperations/Subtraction/printAst.expected)
- [library-tests/RegExp/VFlagOperations/CombinationOfOperators/printAst.expected](https://github.com/github/codeql/blob/main/javascript/ql/test/library-tests/RegExp/VFlagOperations/CombinationOfOperators/printAst.expected)
- [library-tests/RegExp/VFlagOperations/Intersection/printAst.expected](https://github.com/github/codeql/blob/main/javascript/ql/test/library-tests/RegExp/VFlagOperations/Intersection/printAst.expected)
- [library-tests/TypeScript/TypeAnnotations/printAst.expected](https://github.com/github/codeql/blob/main/javascript/ql/test/library-tests/TypeScript/TypeAnnotations/printAst.expected)
- [library-tests/HTML/HTMLElementAndHTMLAttribute/printAst.expected](https://github.com/github/codeql/blob/main/javascript/ql/test/library-tests/HTML/HTMLElementAndHTMLAttribute/printAst.expected)
- [library-tests/JSON/printAst.expected](https://github.com/github/codeql/blob/main/javascript/ql/test/library-tests/JSON/printAst.expected)
- [library-tests/Arrays/printAst.expected](https://github.com/github/codeql/blob/main/javascript/ql/test/library-tests/Arrays/printAst.expected)
- [library-tests/AST/Decorators/printAst.expected](https://github.com/github/codeql/blob/main/javascript/ql/test/library-tests/AST/Decorators/printAst.expected)
- [library-tests/AST/ExplicitResource/printAst.expected](https://github.com/github/codeql/blob/main/javascript/ql/test/library-tests/AST/ExplicitResource/printAst.expected)
- [library-tests/YAML/printAst.expected](https://github.com/github/codeql/blob/main/javascript/ql/test/library-tests/YAML/printAst.expected)
- [library-tests/frameworks/AngularJS/expressions/parsing/AstNodes.expected](https://github.com/github/codeql/blob/main/javascript/ql/test/library-tests/frameworks/AngularJS/expressions/parsing/AstNodes.expected)
- [library-tests/JSX/printAst.expected](https://github.com/github/codeql/blob/main/javascript/ql/test/library-tests/JSX/printAst.expected)
