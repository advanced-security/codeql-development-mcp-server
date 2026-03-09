# CodeQL AST nodes for `csharp` language

## CodeQL's core AST classes for `csharp` language

Based on the C# PrintAst.expected test results, here are the core CodeQL AST classes for the C# language:

### Declarations and Members

- **`Class`** - Class declaration
- **`NamespaceDeclaration`** - Namespace declaration
- **`Method`** - Method declaration
- **`Property`** - Property declaration
- **`Field`** - Field declaration
- **`Parameter`** - Method parameter
- **`DelegateType`** - Delegate type declaration
- **`InstanceConstructor`** - Instance constructor
- **`StaticConstructor`** - Static constructor
- **`Destructor`** - Destructor/finalizer

### Type System

- **`TypeMention`** - Reference to a type
- **`TypeParameter`** - Generic type parameter
- **`TypeAccess`** - Access to a type
- **`TypeAccessPatternExpr`** - Type access in pattern expressions

### Statements

- **`BlockStmt`** - Block statement `{...}`
- **`ExprStmt`** - Expression statement
- **`LocalVariableDeclStmt`** - Local variable declaration statement
- **`ReturnStmt`** - Return statement
- **`IfStmt`** - If statement
- **`TryStmt`** - Try statement
- **`ThrowStmt`** - Throw statement
- **`UsingBlockStmt`** - Using statement with block
- **`FixedStmt`** - Fixed statement (for unsafe code)
- **`LabelStmt`** - Label statement
- **`EmptyStmt`** - Empty statement `;`

### Expressions

- **`LocalVariableDeclAndInitExpr`** - Local variable declaration and initialization
- **`LocalVariableAccess`** - Access to local variable
- **`ParameterAccess`** - Access to parameter
- **`FieldAccess`** - Access to field
- **`PropertyCall`** - Property access/call
- **`MethodCall`** - Method call
- **`MethodAccess`** - Method access
- **`ObjectCreation`** - Object creation expression `new T()`
- **`AnonymousObjectCreation`** - Anonymous object creation
- **`ArrayCreation`** - Array creation expression
- **`ArrayAccess`** - Array element access
- **`AssignExpr`** - Assignment expression `=`
- **`AssignAddExpr`** - Addition assignment `+=`
- **`AssignSubExpr`** - Subtraction assignment `-=`
- **`ThisAccess`** - `this` access
- **`CastExpr`** - Type cast expression
- **`IsExpr`** - Type check expression `is`
- **`DefaultValueExpr`** - Default value expression `default(...)`

### Arithmetic and Logical Expressions

- **`AddExpr`** - Addition expression `+`
- **`SubExpr`** - Subtraction expression `-`
- **`DivExpr`** - Division expression `/`
- **`BitwiseAndExpr`** - Bitwise AND expression `&`
- **`LogicalOrExpr`** - Logical OR expression `||`
- **`LTExpr`** - Less than expression `<`
- **`GEExpr`** - Greater than or equal expression `>=`
- **`PostIncrExpr`** - Post-increment expression `++`
- **`OperatorCall`** - Operator call

### Literals

- **`IntLiteral`** - Integer literal
- **`StringLiteralUtf16`** - String literal
- **`BoolLiteral`** - Boolean literal (`true`/`false`)
- **`DoubleLiteral`** - Double literal
- **`CharLiteral`** - Character literal
- **`NullLiteral`** - Null literal

### Object and Collection Initialization

- **`ObjectInitializer`** - Object initializer `{ ... }`
- **`MemberInitializer`** - Member initializer in object initializer
- **`CollectionInitializer`** - Collection initializer `{ ..., ... }`
- **`ElementInitializer`** - Element initializer in collection
- **`ArrayInitializer`** - Array initializer `{ ..., ... }`

### Delegates and Events

- **`DelegateCall`** - Delegate call
- **`ImplicitDelegateCreation`** - Implicit delegate creation
- **`ExplicitDelegateCreation`** - Explicit delegate creation
- **`EventAccess`** - Event access
- **`EventCall`** - Event call
- **`AddEventExpr`** - Event subscription `+=`
- **`RemoveEventExpr`** - Event unsubscription `-=`

### Properties and Accessors

- **`Getter`** - Property getter
- **`Setter`** - Property setter

### Special Members and Access

- **`MemberConstantAccess`** - Access to member constant
- **`LocalFunctionAccess`** - Access to local function
- **`AddressOfExpr`** - Address-of expression `&` (unsafe code)

## Expected test results for local `PrintAst.ql` query

This repo contains a variant of the open-source `PrintAst.ql` query for `csharp` language, with modifications for local testing:

- Use the `codeql_query_run` tool with `queryName="PrintAST"` and `language="csharp"` to run the bundled PrintAST query
- Use the `codeql_test_run` tool to run the PrintAST test and compare against expected results

## Expected test results for open-source `PrintAst.ql` query

The following links can be fetched to get the expected results for different unit tests of the open-source `PrintAst.ql` query for the `csharp` language:

- [library-tests/arguments/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/arguments/PrintAst.expected)
- [library-tests/assignments/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/assignments/PrintAst.expected)
- [library-tests/attributes/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/attributes/PrintAst.expected)
- [library-tests/comments/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/comments/PrintAst.expected)
- [library-tests/constructors/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/constructors/PrintAst.expected)
- [library-tests/conversion/operator/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/conversion/operator/PrintAst.expected)
- [library-tests/csharp6/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/csharp6/PrintAst.expected)
- [library-tests/csharp7/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/csharp7/PrintAst.expected)
- [library-tests/csharp7.1/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/csharp7.1/PrintAst.expected)
- [library-tests/csharp7.2/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/csharp7.2/PrintAst.expected)
- [library-tests/csharp7.3/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/csharp7.3/PrintAst.expected)
- [library-tests/csharp8/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/csharp8/PrintAst.expected)
- [library-tests/csharp9/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/csharp9/PrintAst.expected)
- [library-tests/csharp11/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/csharp11/PrintAst.expected)
- [library-tests/dataflow/implicittostring/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/dataflow/implicittostring/PrintAst.expected)
- [library-tests/dataflow/tuples/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/dataflow/tuples/PrintAst.expected)
- [library-tests/definitions/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/definitions/PrintAst.expected)
- [library-tests/delegates/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/delegates/PrintAst.expected)
- [library-tests/dynamic/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/dynamic/PrintAst.expected)
- [library-tests/enums/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/enums/PrintAst.expected)
- [library-tests/exceptions/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/exceptions/PrintAst.expected)
- [library-tests/expressions/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/expressions/PrintAst.expected)
- [library-tests/events/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/events/PrintAst.expected)
- [library-tests/fields/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/fields/PrintAst.expected)
- [library-tests/generics/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/generics/PrintAst.expected)
- [library-tests/goto/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/goto/PrintAst.expected)
- [library-tests/indexers/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/indexers/PrintAst.expected)
- [library-tests/initializers/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/initializers/PrintAst.expected)
- [library-tests/linq/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/linq/PrintAst.expected)
- [library-tests/members/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/members/PrintAst.expected)
- [library-tests/methods/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/methods/PrintAst.expected)
- [library-tests/namespaces/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/namespaces/PrintAst.expected)
- [library-tests/nestedtypes/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/nestedtypes/PrintAst.expected)
- [library-tests/operators/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/operators/PrintAst.expected)
- [library-tests/partial/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/partial/PrintAst.expected)
- [library-tests/properties/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/properties/PrintAst.expected)
- [library-tests/statements/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/statements/PrintAst.expected)
- [library-tests/stringinterpolation/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/stringinterpolation/PrintAst.expected)
- [library-tests/types/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/types/PrintAst.expected)
- [library-tests/unsafe/PrintAst.expected](https://github.com/github/codeql/blob/main/csharp/ql/test/library-tests/unsafe/PrintAst.expected)
