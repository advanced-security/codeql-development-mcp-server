# CodeQL AST Classes for Rust Programs

## Purpose

Write CodeQL queries over Rust by navigating the Rust AST classes. Model: Syntax → CodeQL class hierarchy; use predicates to access parts (fields, expressions, patterns). Pattern: `get<Part>()`, `getA<Part>()`, `getName().getText()`, `getBody()`.

## Core Namespaces

- **Items**: `Function`, `Struct`, `Enum`, `Impl`, `Trait`, `Module`, `Const`, `Static`, `TypeAlias`, `Use`, `ExternBlock`
- **Expressions**: subclasses of `Expr` (literals, calls, operators, blocks, control flow)
- **Statements**: `LetStmt`, `ExprStmt`
- **Patterns**: `IdentPat`, `TuplePat`, `StructPat`, `TupleStructPat`, `WildcardPat`, `RefPat`, `LiteralPat`, `RangePat`
- **Types**: `PathTypeRepr`, `RefTypeRepr`, `TupleTypeRepr`, `ArrayTypeRepr`, `SliceTypeRepr`, `FnPtrTypeRepr`
- **Paths**: `Path`, `PathSegment`, `NameRef`
- **Names**: `Name` (use `.getText()` to get the string value)

## Items

### Functions

- **`Function`** — Function declaration: `fn foo(x: u32) -> u64 { ... }`
  - `getName()` → `Name` (use `.getText()` for string)
  - `getParamList()` → `ParamList`
  - `getRetType()` → `RetTypeRepr`
  - `getFunctionBody()` → `BlockExpr`
  - `getAbi()` → `Abi` (for `extern "C" fn`)

### Structs and Enums

- **`Struct`** — Struct declaration
  - `getName()` → `Name`
  - `getFieldList()` → `StructFieldList` or `TupleFieldList`
- **`Enum`** — Enum declaration
  - `getName()` → `Name`
  - `getVariantList()` → `VariantList`
- **`Variant`** — Enum variant
  - `getName()` → `Name`
  - `getFieldList()` → field list

### Implementations and Traits

- **`Impl`** — Implementation block: `impl Foo { ... }` or `impl Trait for Foo { ... }`
  - `getAssocItemList()` → `AssocItemList`
  - `getTrait()` → trait path (for trait implementations)
- **`Trait`** — Trait declaration
  - `getName()` → `Name`
  - `getAssocItemList()` → `AssocItemList`

### Other Items

- **`Module`** — Module declaration: `mod foo { ... }`
- **`Use`** — Use import: `use std::io;`
- **`Const`** — Constant: `const X: i32 = 42;`
- **`Static`** — Static variable: `static Y: &str = "hello";`
- **`TypeAlias`** — Type alias: `type Result<T> = std::result::Result<T, Error>;`

## Expressions (Expr)

### Literals

- **`IntegerLiteralExpr`** — Integer: `42`, `0xFF`
- **`FloatLiteralExpr`** — Float: `3.14`
- **`BooleanLiteralExpr`** — Boolean: `true`, `false`
- **`StringLiteralExpr`** — String: `"hello"`
- **`CharLiteralExpr`** — Character: `'a'`
- **`ByteLiteralExpr`** — Byte: `b'x'`
- **`ByteStringLiteralExpr`** — Byte string: `b"hello"`

### Calls and Method Calls

- **`CallExpr`** — Function call: `foo(42)`
  - `getFunction()` → callee expression
  - `getArgList()` → `ArgList`
  - `getResolvedTarget()` → resolved `Addressable`
  - `getEnclosingCallable()` → enclosing `Callable`
- **`MethodCallExpr`** — Method call: `x.foo(42)`
  - `getReceiver()` → receiver expression
  - `getIdentifier()` → `NameRef` (method name)
  - `getArgList()` → `ArgList`

### Operators

- **`BinaryExpr`** — Binary: `x + y`, `x && y`, `x <= y`, `x = y`
  - `getLhs()`, `getRhs()` → operands
  - `getOperatorName()` → operator string
- **`UnaryExpr`** / **`PrefixExpr`** — Unary: `-x`, `!x`, `*x`, `&x`
- **`RangeExpr`** — Range: `0..10`, `0..=10`

### Control Flow

- **`IfExpr`** — if/else: `if cond { ... } else { ... }`
  - `getCondition()`, `getThen()`, `getElse()`
- **`MatchExpr`** — Pattern matching: `match x { ... }`
  - `getExpr()` → scrutinee
  - `getMatchArmList()` → `MatchArmList`
- **`MatchArm`** — Match arm: `pat => expr`
  - `getPat()` → pattern
  - `getExpr()` → body
  - `getGuard()` → optional guard
- **`LoopExpr`** — Infinite loop: `loop { ... }`
- **`WhileExpr`** — While loop: `while cond { ... }`
  - `getCondition()`, `getBody()`
- **`ForExpr`** — For loop: `for x in iter { ... }`
  - `getPat()` → loop variable pattern
  - `getIterable()` → iterator expression
  - `getBody()` → loop body
- **`BreakExpr`** — Break: `break` or `break 'label value`
- **`ContinueExpr`** — Continue: `continue` or `continue 'label`
- **`ReturnExpr`** — Return: `return value`

### Blocks and Closures

- **`BlockExpr`** — Block: `{ stmts; tail_expr }`
  - `getStmtList()` → `StmtList`
- **`ClosureExpr`** — Closure: `|x| x + 1`, `move |x| { ... }`
  - `getParamList()` → parameters
  - `getBody()` → body expression
- **`AsyncBlockExpr`** — Async block: `async { ... }`
- **`UnsafeBlockExpr`** — Unsafe block: `unsafe { ... }`

### Field and Index Access

- **`FieldExpr`** — Field access: `x.field`
  - `getContainer()` → receiver
  - `getIdentifier()` → `NameRef` (field name)
- **`IndexExpr`** — Index: `arr[i]`
- **`TupleExpr`** — Tuple: `(a, b, c)`
- **`ArrayExpr`** / **`ArrayListExpr`** — Array: `[1, 2, 3]`

### Other Expressions

- **`PathExpr`** — Path reference: `std::io::stdin`
- **`StructExpr`** — Struct literal: `Point { x: 1, y: 2 }`
- **`CastExpr`** — Type cast: `x as u64`
- **`RefExpr`** — Reference: `&x`, `&mut x`
- **`AwaitExpr`** — Await: `future.await`
- **`TryExpr`** — Try operator: `expr?`
- **`MacroExpr`** — Macro invocation expression
  - `getMacroCall()` → `MacroCall`

## Statements

- **`LetStmt`** — Let binding: `let x: i32 = 42;`
  - `getPat()` → pattern
  - `getTypeRepr()` → optional type annotation
  - `getInitializer()` → optional initializer
- **`ExprStmt`** — Expression statement: `foo();`
  - `getExpr()` → expression

## Patterns (Pat)

- **`IdentPat`** — Variable pattern: `x`, `mut x`, `ref x`
  - `getName()` → `Name`
- **`WildcardPat`** — Wildcard: `_`
- **`TuplePat`** — Tuple: `(a, b)`
- **`StructPat`** — Struct: `Point { x, y }`
- **`TupleStructPat`** — Tuple struct: `Some(x)`
- **`LiteralPat`** — Literal: `42`, `"hello"`
- **`RangePat`** — Range: `0..=10`
- **`RefPat`** — Reference: `&x`, `&mut x`
- **`OrPat`** — Or pattern: `A | B`

## Navigation Idioms

```ql
// Find all function definitions
from Function f
where f.fromSource()
select f, f.getName().getText()

// Find all calls to a specific function
from CallExpr call, Function target
where
  call.getResolvedTarget() = target and
  target.getName().getText() = "dangerous_fn"
select call, "Call to dangerous_fn"

// Find all struct field accesses
from FieldExpr fe
where fe.getIdentifier().getText() = "password"
select fe, "Access to password field"

// Find match expressions with wildcard patterns
from MatchExpr m, MatchArm arm
where
  arm = m.getMatchArmList().getAnArm() and
  arm.getPat() instanceof WildcardPat
select m, "Match with wildcard arm"

// Navigate from method call to receiver type
from MethodCallExpr call
where call.getIdentifier().getText() = "unwrap"
select call, call.getReceiver()
```

## File and Module Navigation

- **`SourceFile`** — Top-level file node
  - `getItem(i)` → i-th item
- **`Module`** — Module declaration
  - `getName()` → `Name`
  - `getItemList()` → items in module

## Key API Differences from Other Languages

- `Function.getName()` returns a `Name` object, not a string — use `.getText()` to get the string value
- `CallExpr.getResolvedTarget()` returns an `Addressable` — cast to `Function` when needed
- `CallExpr.getEnclosingCallable()` returns a `Callable` — encompasses both `Function` and `ClosureExpr`
- Rust has no `class` concept — use `Struct`, `Enum`, `Impl`, and `Trait` instead
- Macro expansions are represented as `MacroExpr` → `MacroCall` → expansion

## Tips

- Use `fromSource()` to filter out elements from macro expansions and library code
- Use `.getName().getText()` instead of `.getName()` when comparing with strings
- `MethodCallExpr` and `CallExpr` are separate types — a unified `Call` type also exists
- Pattern matching is pervasive in Rust; many constructs use `Pat` subclasses
- Block expressions (`BlockExpr`) can appear anywhere an expression is expected
- The `?` operator creates a `TryExpr` node, not a method call
