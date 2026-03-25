# CodeQL AST Classes for Go Programs

## Purpose

Write CodeQL queries over Go by navigating the Go AST classes. Model: Syntax → CodeQL class hierarchy; use predicates to access parts (condition, body, operands). Pattern: `get<Part>()`, `getA<Part>()`, `get<Left/Right>Operand>()`, `getAnArgument()`, `getCallee()`.

## Core Namespaces

- **Statements**: subclasses of `Stmt`
- **Expressions**: subclasses of `Expr` (literals, unary, binary, calls, selectors, etc.)
- **Declarations**: `FuncDecl`, `GenDecl` (+ `ImportSpec`, `TypeSpec`, `ValueSpec`)
- **Types**: `TypeExpr` nodes (`ArrayTypeExpr`, `StructTypeExpr`, `FuncTypeExpr`, `InterfaceTypeExpr`, `MapTypeExpr`, `ChanTypeExpr` variants)
- **Names/Selectors**: `SimpleName`, `SelectorExpr`; Name hierarchy: `PackageName`, `TypeName`, `ValueName`, `LabelName`

## Statements (Stmt)

### Basic Statements

- **`EmptyStmt`** - Empty statement ";"
- **`ExprStmt`** - Expression used as statement
- **`BlockStmt`** - Block statement "{…}"
- **`DeclStmt`** - Declaration statement

### Control Flow Statements

- **`IfStmt`** - if condition then [else]; supports init; Then/Else are blocks or statements
  - `getCondition()`, `getThen()`, `getElse()`, `getInit()`
- **`ForStmt`** - Classic init/cond/post; `LoopStmt` superclass
  - `getInit()`, `getCondition()`, `getPost()`, `getBody()`
- **`RangeStmt`** - "for k,v := range expr { … }"
  - `getKey()`, `getValue()`, `getDomain()`, `getBody()`

### Switch and Select Statements

- **`SwitchStmt`/`ExpressionSwitchStmt`** - Expression-based switch
- **`TypeSwitchStmt`** - Type-based switch
- **`CaseClause`** - Case clause inside switch statements
  - `getExpr(i)`, `getStmt(i)`
- **`SelectStmt`** - Select statement for channel operations
- **`CommClause`** - Communication clause in select statement

### Channel and Concurrency Statements

- **`SendStmt`** - Channel send "ch <- x"
- **`RecvStmt`** - Channel receive "x = <-ch"
- **`GoStmt`** - Goroutine launch "go f()"
- **`DeferStmt`** - Deferred function call "defer f()"

### Assignment and Increment Statements

- **`SimpleAssignStmt`** - Simple assignment "="
- **`DefineStmt`** - Short variable declaration ":="
- **`CompoundAssignStmt`** - Compound assignment (+=, -=, \*=, /=, %=, &=, |=, ^=, <<=, >>=, &^=)
- **`IncStmt`** - Increment "x++"
- **`DecStmt`** - Decrement "x--"

### Jump Statements

- **`LabeledStmt`** - Labeled statement
- **`BreakStmt`** - Break statement
- **`ContinueStmt`** - Continue statement
- **`GotoStmt`** - Goto statement
- **`FallthroughStmt`** - Fallthrough statement
- **`ReturnStmt`** - Return statement
  - `getResult(i)` to access return values

## Expressions (Expr)

### Literals

- **`BasicLit`** subclasses:
  - **`IntLit`** - Integer literal
  - **`FloatLit`** - Floating point literal
  - **`ImagLit`** - Imaginary literal
  - **`CharLit`/`RuneLit`** - Character/rune literal
  - **`StringLit`** - String literal
- **`CompositeLit`** - Composite literals:
  - **`StructLit`** - Struct literal "T{…}"
  - **`MapLit`** - Map literal "map[K]V{…}"
- **`FuncLit`** - Function literal (anonymous function)

### Unary Expressions

- **`PlusExpr`** - Unary plus "+x"
- **`MinusExpr`** - Unary minus "-x"
- **`NotExpr`** - Logical not "!x"
- **`ComplementExpr`** - Bitwise complement "^x"
- **`AddressExpr`** - Address-of "&x"
- **`RecvExpr`** - Channel receive "<-x"

### Binary Expressions

- **Arithmetic**: `MulExpr`, `QuoExpr`, `RemExpr`, `AddExpr`, `SubExpr`
- **Shift**: `ShlExpr` "<<", `ShrExpr` ">>"
- **Logical**: `LandExpr` "&&", `LorExpr` "||"
- **Relational**: `LssExpr` "<", `GtrExpr` ">", `LeqExpr` "<=", `GeqExpr` ">="
- **Equality**: `EqlExpr` "==", `NeqExpr` "!="
- **Bitwise**: `AndExpr` "&", `OrExpr` "|", `XorExpr` "^", `AndNotExpr` "&^"

### Access and Call Expressions

- **`SelectorExpr`** - Field/method access "X.Y"
  - `getBase()`, `getSelector()`
- **`CallExpr`** - Function/method call
  - `getCallee()`, `getAnArgument()`, `getArgument(i)`
- **`IndexExpr`** - Array/slice/map index "a[i]"
- **`SliceExpr`** - Slice expression "a[i:j:k]"
- **`KeyValueExpr`** - Key-value pair in composite literals

### Type-related Expressions

- **`ParenExpr`** - Parenthesized expression
- **`StarExpr`** - Pointer dereference/type
- **`TypeAssertExpr`** - Type assertion "x.(T)"
- **`Conversion`** - Type conversion "T(x)"

## Type Expressions (no common superclass)

- **`ArrayTypeExpr`** - Array type "[N]T" or slice type "[]T"
- **`StructTypeExpr`** - Struct type "struct{…}"
- **`FuncTypeExpr`** - Function type "func(…) …"
- **`InterfaceTypeExpr`** - Interface type
- **`MapTypeExpr`** - Map type
- **`ChanTypeExpr`** variants:
  - **`SendChanTypeExpr`** - Send-only channel
  - **`RecvChanTypeExpr`** - Receive-only channel
  - **`SendRecvChanTypeExpr`** - Bidirectional channel

## Names and Identifiers

### Name Hierarchy

- **`Name`** subclasses:
  - **`SimpleName`** - Simple identifier
  - **`QualifiedName`** - Package-qualified name
- **`ValueName`** subclasses:
  - **`ConstantName`** - Constant identifier
  - **`VariableName`** - Variable identifier
  - **`FunctionName`** - Function identifier

### Specialized Names

- **`PackageName`** - Package name identifier
- **`TypeName`** - Type name identifier
- **`LabelName`** - Label identifier

## Declarations

### Function Declarations

- **`FuncDecl`/`FuncLit`** via **`FuncDef`**:
  - `getBody()`, `getName()`, `getParameter(i)`, `getResultVar(i)`, `getACall()`

### General Declarations

- **`GenDecl`** with:
  - **`ImportSpec`** - Import specification
  - **`TypeSpec`** - Type specification
  - **`ValueSpec`** - Variable/constant specification
- **`Field`/`FieldList`** - For parameters, results, struct/interface fields

## Navigation Idioms and Patterns

### Control Flow Navigation

- **If statements**: `getCondition()`, `getThen()`, `getElse()`
- **For/Range loops**: inspect `getInit()`/`getCondition()`/`getPost()` or range expression
- **Switch statements**: use `CaseClause`, `getExpr(i)`/`getStmt(i)`
- **Select statements**: use `CommClause`

### Function and Method Calls

```ql
// Method calls by name
from CallExpr call, SelectorExpr sel
where call.getCallee() = sel and sel.getMemberName() = "Close"
select call

// Method vs function calls
// SelectorExpr callee = method call
// SimpleName callee = function call
```

### Assignment Operations

- **Assignment**: match `AssignStmt` subclasses
- **Short variable declaration**: `DefineStmt` for ":="
- **Compound assignment**: `CompoundAssignStmt` for "+=", etc.

### Binary and Unary Operations

- Use specific subclasses or operator accessors
- Access operands via `getLeftOperand()`, `getRightOperand()`

### Literals and Composite Expressions

- **Basic literals**: filter `BasicLit` subclasses
- **Composite literals**: `CompositeLit` elements via keys/values
- **Struct literals**: `StructLit` with type information

## Common Query Patterns

### Finding Specific Constructs

```ql
// Range over map/slice
from RangeStmt r select r

// Defer calls
from DeferStmt d, CallExpr c
where d.getExpr() = c
select d, c

// Struct literal of specific type
from StructLit lit
where lit.getType().getName() = "Point"
select lit

// Channel operations
from SendStmt s select s  // ch <- x
from RecvStmt r select r  // x = <-ch
```

### Method Resolution

```ql
// Find method calls on specific receiver types
from CallExpr call, SelectorExpr sel
where call.getCallee() = sel and
      sel.getBase().getType().toString() = "MyType"
select call
```

## File and Module Navigation

- **`GoFile`** - Represents a Go source file
- **`GoModFile`** - Represents a go.mod file
- **`GoModModuleLine`** - Module declaration in go.mod
- **`GoModGoLine`** - Go version declaration in go.mod

## Comments and Documentation

- **`CommentGroup`** - Group of related comments
- **`DocComment`** - Documentation comment group (typically for functions/types)
- **`SlashSlashComment`** - Single-line comment (//) within comment groups

**Note**: The bundled `PrintAST` query uses a standalone implementation that directly
traverses the Go AST via `AstNode.getUniquelyNumberedChild()`, applying file filtering
at the source level for efficiency. Comments are excluded from the output.

## Advanced Features

### Generics Support

- **`TypeParamDecl`** - Type parameter declaration with constraints
- Generic type parameters and constraints for Go generics
- Support for type inference and constraint satisfaction

### Concurrency Constructs

- **Goroutines**: `GoStmt` for "go f()" patterns
- **Channels**: `SendStmt`, `RecvStmt`, `RecvExpr` for channel operations
- **Select**: `SelectStmt` with `CommClause` for channel multiplexing
- **Defer**: `DeferStmt` for cleanup patterns

## Tips and Best Practices

### Preferred Patterns

- **Class tests over string parsing**: Use specific AST classes rather than string matching
- **Type conversion disambiguation**: `CallExpr` callee is a `TypeExpr` for type conversions
- **Statement vs expression**: Inc/Dec are statements, not expressions
- **Assignment variants**: Handle ":=" vs "=" separately with `DefineStmt` vs `SimpleAssignStmt`
- **Error handling**: Exclude `BadStmt`/`BadExpr` from analysis

### Syntax to Class Mapping Cheatsheet

- **Control Flow**: If→`IfStmt`, For→`ForStmt`, Range→`RangeStmt`, Switch→`SwitchStmt`/`ExpressionSwitchStmt`, Type switch→`TypeSwitchStmt`, Select→`SelectStmt`
- **Cases**: Case→`CaseClause`, Select case→`CommClause`
- **Assignment**: `=`→`SimpleAssignStmt`, `:=`→`DefineStmt`, `+=` etc.→`CompoundAssignStmt`
- **Increment**: `++`→`IncStmt`, `--`→`DecStmt`
- **Access**: Call→`CallExpr`, Selector→`SelectorExpr`, Index→`IndexExpr`, Slice→`SliceExpr`
- **Type operations**: Type assert→`TypeAssertExpr`, Conversion→`Conversion`
- **Unary/Binary**: Specific subclasses of `UnaryExpr`/`BinaryExpr`
- **Literals**: `IntLit`, `FloatLit`, `StringLit`, `StructLit`, `MapLit`, `FuncLit`
- **Types**: `ArrayTypeExpr`, `StructTypeExpr`, `FuncTypeExpr`, `InterfaceTypeExpr`, `MapTypeExpr`, `ChanTypeExpr`

## Expected test results for local `PrintAst.ql` query

This repo contains a variant of the open-source `PrintAst.ql` query for `go` language, with modifications for local testing:

- Use the `codeql_query_run` tool with `queryName="PrintAST"` and `language="go"` to run the bundled PrintAST query
- Use the `codeql_test_run` tool to run the PrintAST test and compare against expected results
- The bundled query implements its own AST traversal directly using the Go `AstNode` API
- Comments are excluded from the output for deterministic results

## Expected test results for open-source `PrintAst.ql` query

The following links can be fetched to get the expected results for different unit tests of the open-source `PrintAst.ql` query for the `go` language:

- [library-tests/semmle/go/PrintAst/PrintAst.expected](https://github.com/github/codeql/blob/main/go/ql/test/library-tests/semmle/go/PrintAst/PrintAst.expected)
- [library-tests/semmle/go/PrintAst/PrintAstExcludeComments.expected](https://github.com/github/codeql/blob/main/go/ql/test/library-tests/semmle/go/PrintAst/PrintAstExcludeComments.expected)
- [library-tests/semmle/go/PrintAst/PrintAstNestedFunction.expected](https://github.com/github/codeql/blob/main/go/ql/test/library-tests/semmle/go/PrintAst/PrintAstNestedFunction.expected)
- [library-tests/semmle/go/PrintAst/PrintAstRestrictFile.expected](https://github.com/github/codeql/blob/main/go/ql/test/library-tests/semmle/go/PrintAst/PrintAstRestrictFile.expected)
- [library-tests/semmle/go/PrintAst/PrintAstRestrictFunction.expected](https://github.com/github/codeql/blob/main/go/ql/test/library-tests/semmle/go/PrintAst/PrintAstRestrictFunction.expected)
