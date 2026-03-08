# CodeQL AST nodes for `ruby` language

## CodeQL's core AST classes for `ruby` language

Based on comprehensive analysis of GitHub CodeQL Ruby AST test results

### Expression Types

#### Literal Expressions

- **IntegerLiteral**: Numeric constants (1, 2, 100, -5)
- **StringLiteral**: String constants with StringTextComponent and StringEscapeSequenceComponent
- **BooleanLiteral**: true/false values
- **NilLiteral**: nil value
- **SymbolLiteral**: :foo, :"foo bar" symbols with StringTextComponent
- **ArrayLiteral**: [1, 2, 3] arrays (desugared to Array.[])
- **HashLiteral**: {:foo => 1} hashes (desugared to Hash.[])
- **RegExpLiteral**: /foo.\*/ regular expressions with RegExpSequence, RegExpConstant, RegExpStar, RegExpDot
- **RangeLiteral**: 1..10, 1...10 ranges with getBegin/getEnd
- **HereDoc**: <<SQL heredoc strings

#### Variable Access

- **LocalVariableAccess**: Local variable references
- **InstanceVariableAccess**: @instance_var with getReceiver
- **ClassVariableAccess**: @@class_var
- **GlobalVariableAccess**: $global_var
- **SelfVariableAccess**: self references

#### Constant Access

- **ConstantReadAccess**: Reading constants with optional getScopeExpr
- **ConstantAssignment**: Assigning to constants with optional getScopeExpr

#### Method and Call Expressions

- **MethodCall**: Method invocations with getReceiver, getArgument, getBlock
- **SetterMethodCall**: Setter method calls (foo=)
- **SuperCall**: super calls with getArgument, getBlock

#### Binary Operations

- **AddExpr**: + addition
- **SubExpr**: - subtraction
- **MulExpr**: \* multiplication
- **DivExpr**: / division
- **ModExpr**: % modulo
- **PowerExpr**: \*\* exponentiation
- **EqExpr**: == equality
- **NeExpr**: != inequality
- **LTExpr**: < less than
- **LEExpr**: <= less than or equal
- **GTExpr**: > greater than
- **GEExpr**: >= greater than or equal
- **SpaceshipExpr**: <=> spaceship operator
- **RegExpMatchExpr**: =~ regex match
- **NoRegExpMatchExpr**: !~ regex no match

#### Logical Operations

- **LogicalAndExpr**: && and 'and'
- **LogicalOrExpr**: || and 'or'
- **NotExpr**: ! negation

#### Bitwise Operations

- **BitwiseAndExpr**: & bitwise and
- **BitwiseOrExpr**: | bitwise or
- **BitwiseXorExpr**: ^ bitwise xor
- **LeftShiftExpr**: << left shift
- **RightShiftExpr**: >> right shift

#### Unary Operations

- **UnaryMinusExpr**: -value
- **UnaryPlusExpr**: +value
- **ComplementExpr**: ~value

#### Assignment Operations

- **AssignExpr**: = assignment
- **AssignAddExpr**: += (desugared to = and +)
- **AssignSubExpr**: -= (desugared to = and -)
- **AssignMulExpr**: _= (desugared to = and _)
- **AssignDivExpr**: /= (desugared to = and /)
- **AssignModExpr**: %= (desugared to = and %)
- **AssignPowerExpr**: **= (desugared to = and **)
- **AssignLogicalAndExpr**: &&= (desugared to = and &&)
- **AssignLogicalOrExpr**: ||= (desugared to = and ||)
- **AssignBitwiseAndExpr**: &= (desugared to = and &)
- **AssignBitwiseOrExpr**: |= (desugared to = and |)
- **AssignBitwiseXorExpr**: ^= (desugared to = and ^)
- **AssignLeftShiftExpr**: <<= (desugared to = and <<)
- **AssignRightShiftExpr**: >>= (desugared to = and >>)

#### Special Expressions

- **TernaryIfExpr**: condition ? true_val : false_val
- **SplatExpr**: \*args splat operator
- **HashSplatExpr**: \*\*kwargs hash splat
- **DefinedExpr**: defined? operator
- **DestructuredLhsExpr**: (a, b, c) destructuring assignment left side

### Statement Types

#### Method Definitions

- **Method**: Regular method definitions with getParameter, getStmt
- **SingletonMethod**: Class method definitions with getObject

#### Class and Module Definitions

- **ClassDeclaration**: Class definitions with optional getSuperclassExpr
- **ModuleDeclaration**: Module definitions

#### Control Flow Statements

- **IfExpr**: if/elsif/else conditionals with getCondition, getThen, getElse
- **UnlessExpr**: unless conditionals with getCondition, getThen, getElse
- **IfModifierExpr**: statement if condition
- **UnlessModifierExpr**: statement unless condition
- **CaseExpr**: case statements with getValue, getBranch
- **WhenClause**: when branches with getPattern, getBody
- **InClause**: in pattern matching with getPattern, getCondition, getBody

#### Loop Statements

- **WhileExpr**: while loops with getCondition, getBody
- **WhileModifierExpr**: statement while condition
- **UntilExpr**: until loops with getCondition, getBody
- **UntilModifierExpr**: statement until condition
- **ForExpr**: for loops (desugared to each with blocks)

#### Flow Control

- **NextStmt**: next statement
- **BreakStmt**: break statement
- **ReturnStmt**: return statement
- **RedoStmt**: redo statement
- **RetryStmt**: retry statement

#### Block Statements

- **BeginExpr**: begin/rescue/ensure/end blocks
- **RescueClause**: rescue clauses
- **EnsureClause**: ensure clauses
- **EndBlock**: END {} blocks

#### Utility Statements

- **UndefStmt**: undef method_name
- **AliasStmt**: alias new_name old_name
- **StmtSequence**: Statement sequences

### Parameters

#### Basic Parameters

- **SimpleParameter**: Regular parameters with getDefiningAccess
- **OptionalParameter**: Parameters with default values, getDefaultValue
- **KeywordParameter**: Keyword parameters with optional getDefaultValue
- **SplatParameter**: \*args parameters with getDefiningAccess
- **HashSplatParameter**: \*\*kwargs parameters with getDefiningAccess
- **HashSplatNilParameter**: \*\*nil parameters
- **BlockParameter**: &block parameters with getDefiningAccess
- **DestructuredParameter**: (a, b) destructured parameters with getElement

### Control Flow

#### Conditional Expressions

- **IfExpr**: Complete if/elsif/else with getBranch structure
- **UnlessExpr**: unless statements with conditional logic
- **CaseExpr**: case/when/else with pattern matching
- **TernaryIfExpr**: Inline conditional expressions

#### Loop Constructs

- **WhileExpr**: while condition do body end
- **UntilExpr**: until condition do body end
- **ForExpr**: for var in collection (desugared to each)

#### Block Constructs

- **DoBlock**: do |params| body end blocks
- **BraceBlock**: { |params| body } blocks
- **Lambda**: -> { } and lambda { } constructs

#### Pattern Matching

- **ArrayPattern**: [a, b, *rest] array patterns
- **AlternativePattern**: pattern1 | pattern2
- **AsPattern**: pattern => variable
- **CapturePattern**: Variable capture patterns

#### Exception Handling

- **BeginExpr**: begin/rescue/ensure structure
- **RescueClause**: Exception rescue clauses
- **EnsureClause**: Cleanup ensure clauses

### Method Names and Identifiers

- **MethodName**: Method name identifiers in various contexts
- **Toplevel**: Top-level program scope

## Expected test results for local `PrintAst.ql` query

This repo contains a variant of the open-source `PrintAst.ql` query for `ruby` language, with modifications for local testing:

- [local ruby PrintAst.ql query](../src/PrintAST/PrintAST.ql)
- [local ruby PrintAst.expected results](../test/PrintAST/PrintAST.expected)

## Expected test results for open-source `PrintAst.ql` query

The following links can be fetched to get the expected results for different unit tests of the open-source `PrintAst.ql` query for the `ruby` language:

- https://github.com/github/codeql/blob/main/ruby/ql/test/library-tests/ast/Ast.expected
- https://github.com/github/codeql/blob/main/ruby/ql/test/library-tests/ast/AstDesugar.expected
