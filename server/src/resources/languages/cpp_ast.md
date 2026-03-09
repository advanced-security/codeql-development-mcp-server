# CodeQL AST nodes for `cpp` language

## CodeQL's core AST classes for `cpp` language

Based on comprehensive analysis of CodeQL's C++ AST test results from both local and GitHub test files, here are the core AST classes for C/C++ analysis:

### Function and Method Declarations

**Function Types:**

- `TopLevelFunction` - Global functions (e.g., `void fun3(someClass*)`, `int main()`)
- `MemberFunction` - Class member functions (e.g., `void someClass::f()`, `int someClass::g(int, int)`)
- `VirtualFunction` - Virtual functions with dynamic dispatch (e.g., `virtual void Base::v()`)
- `ConstMemberFunction` - Const member functions (e.g., `char const* std::type_info::name() const`)
- `FormattingFunction` - Functions with format string checking (e.g., `int printf(char const*)`)
- `TemplateFunction` - Template function declarations

**Constructors and Destructors:**

- `Constructor` - Class constructors (e.g., `void C::C(int)`)
- `CopyConstructor` - Copy constructors (e.g., `void C::C(C const&)`)
- `CopyAssignmentOperator` - Copy assignment operators (e.g., `C& C::operator=(C const&)`)
- `MoveAssignmentOperator` - Move assignment operators (e.g., `C& C::operator=(C&&)`)
- `Destructor` - Destructor declarations
- `DestructorCall` - Explicit and implicit destructor calls (e.g., `call to ~C`)

**Operator Functions:**

- `Operator` - Operator overloads (e.g., `void operator delete(void*)`, `void* operator new(unsigned long)`)

### Statements

**Control Flow Statements:**

- `BlockStmt` - Block statements containing multiple statements (e.g., `{ ... }`)
- `IfStmt` - Conditional statements with condition and branches
- `ForStmt` - For loops with initialization, condition, and increment
- `ReturnStmt` - Return statements with optional expressions
- `GotoStmt` - Goto statements for jumping to labels
- `LabelStmt` - Label statements for goto targets

**Declaration Statements:**

- `DeclStmt` - Declaration statements containing variable and type declarations
- `VariableDeclarationEntry` - Individual variable declarations (e.g., `definition of i`)
- `TypeDeclarationEntry` - Type declarations (e.g., `definition of u`)

**Expression Statements:**

- `ExprStmt` - Statement wrappers for expressions

**Variable Length Array Support:**

- `VlaDimensionStmt` - VLA dimension size statements
- `VlaDeclStmt` - VLA declaration statements

### Expressions

**Primary Expressions:**

- `Literal` - Literal values (e.g., `1`, `2`, `42`, `"hello"`)
- `StringLiteral` - String literals (e.g., `"int"`, `"string"`)
- `VariableAccess` - Variable references (e.g., `sc`, `i`, `args`)
- `ThisExpr` - The `this` keyword in member functions

**Function Calls:**

- `FunctionCall` - Function calls (e.g., `call to f`, `call to printf`)
- `FormattingFunctionCall` - Calls to format string functions with type checking
- `MethodCall` - Method calls on objects
- `ConstructorCall` - Constructor calls (e.g., `call to C`)

**Operators and Assignments:**

- `AssignExpr` - Assignment expressions (e.g., `... = ...`)
- `AddExpr` - Addition expressions (e.g., `... + ...`)
- `MulExpr` - Multiplication expressions (e.g., `... * ...`)
- `SubExpr` - Subtraction expressions

**Object Creation and Destruction:**

- `ClassInstanceExpr` - Object instantiation expressions
- `NewExpr` - Dynamic memory allocation with `new`
- `DeleteExpr` - Dynamic memory deallocation with `delete`
- `VacuousDestructorCall` - Vacuous destructor calls for trivial types

**Array and Pointer Operations:**

- `ArrayExpr` - Array access expressions (e.g., `access to array`)
- `PointerDereferenceExpr` - Pointer dereference (e.g., `* ...`)
- `AddressOfExpr` - Address-of operator (e.g., `& ...`)
- `ArrayToPointerConversion` - Implicit array to pointer conversions

**Field Access:**

- `ValueFieldAccess` - Value-based field access (e.g., `obj.field`)
- `PointerFieldAccess` - Pointer-based field access (e.g., `ptr->field`)

**Type Casting:**

- `CStyleCast` - C-style casts (e.g., `(int)...`, `(char)...`)
- `StaticCast` - Static casts for safe conversions
- `DynamicCast` - Dynamic casts for runtime type checking (e.g., `dynamic_cast<Derived *>...`)
- `ConstCast` - Const casts (e.g., `const_cast<T *>...`)
- `ReinterpretCast` - Reinterpret casts (e.g., `reinterpret_cast<S *>...`)

**Reference Operations:**

- `ReferenceToExpr` - Reference creation (e.g., `(reference to)`)
- `ReferenceDereferenceExpr` - Reference dereference (e.g., `(reference dereference)`)

**Type Information:**

- `TypeidOperator` - Runtime type information (e.g., `typeid ...`)

**Modern C++ Features:**

- `ParenthesizedExpr` - Parenthesized expressions for grouping

### Type System

**Basic Types:**

- `IntType` - Integer types (e.g., `int`)
- `VoidType` - Void type
- `FloatType` - Floating-point types
- `LongType` - Long integer types (e.g., `unsigned long`)
- `PlainCharType` - Plain char type
- `CharType` - Character types

**Pointer Types:**

- `PointerType` - Pointer types (e.g., `someClass *`, `Base *`)
- `IntPointerType` - Integer pointer types (e.g., `int *`)
- `CharPointerType` - Character pointer types (e.g., `char *`)
- `VoidPointerType` - Void pointer types (e.g., `void *`)
- `FunctionPointerType` - Function pointer types

**Reference Types:**

- `LValueReferenceType` - L-value references (e.g., `const someClass &`)
- `RValueReferenceType` - R-value references (e.g., `someClass &&`)

**Array Types:**

- `ArrayType` - Array types (e.g., `char[]`, `char[4]`)

**Class and Struct Types:**

- `Class` - Class types (e.g., `Base`, `Derived`)
- `Struct` - Struct types
- `NestedClass` - Nested class types
- `LocalUnion` - Local union types

**Template Types:**

- `TypeTemplateParameter` - Template type parameters (e.g., `T`)

**Advanced Types:**

- `SpecifiedType` - Type qualifiers (e.g., `const type_info`)
- `CTypedefType` - C typedef types (e.g., `va_list`, `MYINT`)

### C11 Generic Support

**Generic Expressions:**

- `C11GenericExpr` - C11 \_Generic expressions for type-based selection
- `ReuseExpr` - Expression reuse in generic contexts
- `TypeName` - Type names in generic associations

### Parameters and Initializers

**Parameter Handling:**

- `Parameter` - Function parameters with types (e.g., `i`, `j`, `sc`)
- Support for unnamed parameters and default arguments

**Initialization:**

- `Initializer` - Variable initializers (e.g., `initializer for i`)
- Constructor initialization lists
- Field initialization

### Built-in Functions

**Variable Arguments:**

- `BuiltInVarArgsStart` - `__builtin_va_start` for variadic functions
- `BuiltInVarArgsEnd` - `__builtin_va_end` for cleanup

### Type Conversions

**Implicit Conversions:**

- `IntegralConversion` - Integer type conversions
- `PointerConversion` - Pointer type conversions
- `BaseClassConversion` - Base class conversions for inheritance
- `GlvalueConversion` - Glvalue conversions

**Explicit Conversions:**

- Support for all cast types with conversion tracking
- Value category preservation through conversions

### Value Categories and Properties

**Value Categories:**

- `prvalue` - Pure r-values (temporary values)
- `lvalue` - L-values (addressable values)
- `prvalue(load)` - Loaded values from memory

**Type Properties:**

- Type information preservation through all expressions
- Conversion tracking for type safety analysis

### Example AST Hierarchy

Based on CodeQL's comprehensive C++ analysis capabilities:

```
TopLevelFunction (global functions)
├── Parameter (function parameters)
├── BlockStmt (function body)
│   ├── DeclStmt (declarations)
│   │   └── VariableDeclarationEntry (variable definitions)
│   ├── ExprStmt (expression statements)
│   │   ├── FunctionCall (function calls)
│   │   ├── AssignExpr (assignments)
│   │   └── VariableAccess (variable references)
│   └── ReturnStmt (return statements)
└── Type information (IntType, PointerType, etc.)

Class (class declarations)
├── Constructor/Destructor (special members)
├── MemberFunction (methods)
├── CopyAssignmentOperator (copy operations)
└── MoveAssignmentOperator (move operations)

Expression hierarchy with full type and conversion tracking
├── Primary expressions (literals, variables)
├── Operators (arithmetic, logical, comparison)
├── Casts (static, dynamic, const, reinterpret)
├── Object operations (new, delete, field access)
└── Type operations (sizeof, typeid, alignof)
```

## Expected test results for local `PrintAst.ql` query

This repo contains a variant of the open-source `PrintAst.ql` query for `cpp` language, with modifications for local testing:

- Use the `codeql_query_run` tool with `queryName="PrintAST"` and `language="cpp"` to run the bundled PrintAST query
- Use the `codeql_test_run` tool to run the PrintAST test and compare against expected results

## Expected test results for open-source `PrintAst.ql` query

The following links can be fetched to get the expected results for different unit tests of the open-source `PrintAst.ql` query for the `cpp` language:

- [library-tests/destructors/PrintAST.expected](https://github.com/github/codeql/blob/main/cpp/ql/test/library-tests/destructors/PrintAST.expected)
- [library-tests/c11_generic/PrintAST.expected](https://github.com/github/codeql/blob/main/cpp/ql/test/library-tests/c11_generic/PrintAST.expected)
- [library-tests/ir/ir/PrintAST.expected](https://github.com/github/codeql/blob/main/cpp/ql/test/library-tests/ir/ir/PrintAST.expected)
- [library-tests/ir/no-function-calls/PrintAST.expected](https://github.com/github/codeql/blob/main/cpp/ql/test/library-tests/ir/no-function-calls/PrintAST.expected)
- [examples/expressions/PrintAST.expected](https://github.com/github/codeql/blob/main/cpp/ql/test/examples/expressions/PrintAST.expected)
