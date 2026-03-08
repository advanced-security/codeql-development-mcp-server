# CodeQL AST nodes for `java` language

## CodeQL's core AST classes for `java` language

Based on comprehensive analysis of CodeQL's Java test results from GitHub, here are the core AST classes for Java analysis:

### Compilation and Package Structure

**Top-Level Units:**

- `CompilationUnit` - Java source file compilation units (e.g., `CompilationUnit A`)
- `ImportType` - Single type imports (e.g., `import HashMap`, `import IOException`)
- `ImportOnDemandFromPackage` - Wildcard imports (e.g., `import java.util.*`)

### Class and Interface Declarations

**Class Structure:**

- `Class` - Class declarations (e.g., `class A`, `class Test`)
- `Interface` - Interface declarations (e.g., `interface Ann1`)
- `GenericType` - Generic classes with type parameters
- `ParameterizedType` - Parameterized types with specific type arguments

**Generic Support:**

- `TypeVariable` - Generic type parameters (e.g., `T`, `S extends Comparable`)
- Generic class declarations and instantiations
- Diamond operator support (`<>`) for type inference

### Type System

**Basic Type Access:**

- `TypeAccess` - Type references (e.g., `String`, `int`, `void`, `Object`)
- `ArrayTypeAccess` - Array types (e.g., `String[]`, `int[][]`)
- Type access in generic contexts (e.g., `List<String>`, `Map<String,Integer>`)

**Advanced Type Features:**

- Parameterized types with multiple type arguments
- Nested type access and inner class types
- Array types with multiple dimensions

### Field and Variable Declarations

**Field Declarations:**

- `FieldDeclaration` - Class field declarations (e.g., `String[] a;`, `float ff;`)
- Field initialization with expressions
- Generic field types (e.g., `List<> l`, `Map<String,Integer> m`)

**Variable Declarations:**

- `LocalVariableDeclStmt` - Local variable declaration statements
- `LocalVariableDeclExpr` - Local variable declarator expressions
- `Parameter` - Method and constructor parameters
- `VarDecl` - Variable declaration identifiers

### Method and Constructor Declarations

**Method Structure:**

- `Method` - Method declarations with return types and parameters
- `Constructor` - Constructor declarations
- Method signatures with generic types and varargs support

**Parameter Handling:**

- Parameter declarations with type access
- Varargs parameters (e.g., `int... is`, `Object... os`)
- Generic parameter types

### Expressions

**Primary Expressions:**

- `IntegerLiteral` - Integer constants (e.g., `42`, `1`, `2`)
- `FloatLiteral` - Floating-point literals (e.g., `2.3f`)
- `StringLiteral` - String literals (e.g., `"hello"`, `"rawtypes"`)
- `NullLiteral` - Null literal (`null`)
- `BooleanLiteral` - Boolean literals (`true`, `false`)

**Variable Access:**

- `VarAccess` - Variable references (e.g., `thing`, `o`, `Initializers.SFIELD`)
- Qualified variable access with type prefixes

**Object Creation:**

- `ClassInstanceExpr` - Object instantiation (e.g., `new ArrayList<>()`, `new LinkedHashMap<String,Integer>()`)
- Constructor calls with type arguments
- Anonymous class instances

**Method Calls:**

- `MethodCall` - Method invocations (e.g., `source()`, `sink()`)
- Method calls with arguments and generic types

**Type Operations:**

- `CastExpr` - Type casting (e.g., `(E) thing`)
- `InstanceOfExpr` - instanceof checks with pattern matching

### Statements

**Control Flow:**

- `BlockStmt` - Block statements containing multiple statements
- `IfStmt` - Conditional statements
- `SwitchStmt` - Switch statements with traditional and pattern cases
- `SwitchExpr` - Switch expressions with yield statements
- `ReturnStmt` - Return statements
- `YieldStmt` - Yield statements in switch expressions

**Exception Handling:**

- `TryStmt` - Try-catch-finally statements
- `CatchClause` - Catch clauses with exception types
- `ThrowStmt` - Throw statements
- Multi-catch support for multiple exception types

**Constructor Calls:**

- `ThisConstructorInvocationStmt` - this() constructor calls
- `SuperConstructorInvocationStmt` - super() constructor calls

### Modern Java Features

**Pattern Matching (Java 14+):**

- `PatternCase` - Pattern matching in switch statements
- `RecordPatternExpr` - Record pattern matching expressions
- Pattern case declarations with local variables
- Guarded patterns and complex pattern matching

**Switch Expressions:**

- `ConstCase` - Traditional constant cases
- `DefaultCase` - Default cases in switch statements
- Pattern-based case statements with guards

**Records (Java 14+):**

- Record declarations and pattern matching
- Record component access and destructuring

### Annotations and Documentation

**Annotations:**

- `Annotation` - Annotation usage (e.g., `@SuppressWarnings("rawtypes")`)
- Annotation with arguments and values

**Documentation:**

- `Javadoc` - Javadoc comments (e.g., `/** A JavaDoc comment */`)
- `JavadocText` - Text content within Javadoc
- `JavadocTag` - Javadoc tags (e.g., `@author someone`)
- Multi-line Javadoc support

### Enum Support

**Enumeration Features:**

- Enum class declarations
- Enum constant declarations with initialization
- Enum constants with constructor arguments

### Lambda Expressions and Functional Interfaces

**Functional Programming:**

- Anonymous class expressions for functional interfaces
- Functional interface implementations (e.g., `BiFunction<Integer,Integer,Integer>`)
- Lambda-style anonymous parameter handling

### Advanced Expression Features

**Complex Expressions:**

- Parenthesized expressions for precedence control
- Conditional expressions (ternary operator)
- Assignment expressions and compound assignments

**Array Operations:**

- Array access and indexing expressions
- Array initialization and manipulation
- Multi-dimensional array support

### Modifier Support

**Access Modifiers:**

- Support for `public`, `private`, `protected` modifiers
- `static`, `final`, `abstract` modifier handling
- Enum constant modifiers and initialization

### Collection Framework Integration

**Collections:**

- Generic collection types (e.g., `List<String>`, `Map<String,Integer>`)
- Collection instantiation with type inference
- Iterator and collection method support

### Error Handling and Diagnostics

**Error Types:**

- `ErrorExpr` - Error expressions for malformed code
- `ErrorType` - Error types for type resolution failures
- Error handling in generic contexts

### Example AST Hierarchy

Based on CodeQL's comprehensive Java analysis capabilities:

## Expected test results for local `PrintAst.ql` query

This repo contains a variant of the open-source `PrintAst.ql` query for `java` language, with modifications for local testing:

- [local java PrintAst.ql query](../src/PrintAST/PrintAST.ql)
- [local java PrintAst.expected results](../test/PrintAST/PrintAST.expected)

## Expected test results for open-source `PrintAst.ql` query

The following links can be fetched to get the expected results for different unit tests of the open-source `PrintAst.ql` query for the `java` language:

- [library-tests/comments/PrintAst.expected](https://github.com/github/codeql/blob/main/java/ql/test/library-tests/comments/PrintAst.expected)
- [library-tests/dependency-counts/PrintAst.expected](https://github.com/github/codeql/blob/main/java/ql/test/library-tests/dependency-counts/PrintAst.expected)
- [library-tests/generics/PrintAst.expected](https://github.com/github/codeql/blob/main/java/ql/test/library-tests/generics/PrintAst.expected)
- [library-tests/java7/Diamond/PrintAst.expected](https://github.com/github/codeql/blob/main/java/ql/test/library-tests/java7/Diamond/PrintAst.expected)
- [library-tests/java7/MultiCatch/PrintAst.expected](https://github.com/github/codeql/blob/main/java/ql/test/library-tests/java7/MultiCatch/PrintAst.expected)
- [library-tests/modifiers/PrintAst.expected](https://github.com/github/codeql/blob/main/java/ql/test/library-tests/modifiers/PrintAst.expected)
- [library-tests/guards12/PrintAst.expected](https://github.com/github/codeql/blob/main/java/ql/test/library-tests/guards12/PrintAst.expected)
- [library-tests/pattern-instanceof/PrintAst.expected](https://github.com/github/codeql/blob/main/java/ql/test/library-tests/pattern-instanceof/PrintAst.expected)
- [library-tests/typeaccesses/PrintAst.expected](https://github.com/github/codeql/blob/main/java/ql/test/library-tests/typeaccesses/PrintAst.expected)
- [library-tests/JDK/PrintAst.expected](https://github.com/github/codeql/blob/main/java/ql/test/library-tests/JDK/PrintAst.expected)
- [library-tests/constants/PrintAst.expected](https://github.com/github/codeql/blob/main/java/ql/test/library-tests/constants/PrintAst.expected)
- [library-tests/errortype/PrintAst.expected](https://github.com/github/codeql/blob/main/java/ql/test/library-tests/errortype/PrintAst.expected)
- [library-tests/comment-encoding/PrintAst.expected](https://github.com/github/codeql/blob/main/java/ql/test/library-tests/comment-encoding/PrintAst.expected)
- [library-tests/dependency/PrintAst.expected](https://github.com/github/codeql/blob/main/java/ql/test/library-tests/dependency/PrintAst.expected)
- [library-tests/errortype-with-params/PrintAst.expected](https://github.com/github/codeql/blob/main/java/ql/test/library-tests/errortype-with-params/PrintAst.expected)
- [library-tests/printAst/PrintAst.expected](https://github.com/github/codeql/blob/main/java/ql/test/library-tests/printAst/PrintAst.expected)
- [library-tests/constructors/PrintAst.expected](https://github.com/github/codeql/blob/main/java/ql/test/library-tests/constructors/PrintAst.expected)
- [library-tests/arrays/PrintAst.expected](https://github.com/github/codeql/blob/main/java/ql/test/library-tests/arrays/PrintAst.expected)
- [library-tests/errorexpr/PrintAst.expected](https://github.com/github/codeql/blob/main/java/ql/test/library-tests/errorexpr/PrintAst.expected)
- [library-tests/fields/PrintAst.expected](https://github.com/github/codeql/blob/main/java/ql/test/library-tests/fields/PrintAst.expected)
- [library-tests/javadoc/PrintAst.expected](https://github.com/github/codeql/blob/main/java/ql/test/library-tests/javadoc/PrintAst.expected)
- [library-tests/collections/PrintAst.expected](https://github.com/github/codeql/blob/main/java/ql/test/library-tests/collections/PrintAst.expected)
- [library-tests/varargs/PrintAst.expected](https://github.com/github/codeql/blob/main/java/ql/test/library-tests/varargs/PrintAst.expected)
- [library-tests/reflection/PrintAst.expected](https://github.com/github/codeql/blob/main/java/ql/test/library-tests/reflection/PrintAst.expected)
