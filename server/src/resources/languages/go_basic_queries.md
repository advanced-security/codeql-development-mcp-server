# Basic CodeQL Query Examples for Go

## Purpose

Minimal Go query examples in VS Code; variables, constraints, and results for concrete bug patterns. Demonstrates query structure and common Go programming pattern detection.

## Basic Query Structure

### Query Components (SQL-like analogy)

- **`import`**: Include standard Go library (`import go`)
- **`from`**: Declare typed variables to range over (`Method`, `Variable`, `Write`, `Field`)
- **`where`**: Constrain relationships among variables with predicates
- **`select`**: Emit results; message can concatenate strings and AST entities

### Template Structure

```ql
import go

from <Type1> var1, <Type2> var2, ...
where <conditions and relationships>
select <results>, "<message with " + var1 + " references>"
```

## Example 1: Value Receiver Method Modifications

### Target Pattern

Methods defined on value receivers that write to a field have no effect (receiver is copied). Should use pointer receiver instead.

### Query

```ql
import go

from Method m, Variable recv, Write w, Field f
where recv = m.getReceiver() and
      w.writesField(recv.getARead(), f, _) and
      not recv.getType() instanceof PointerType
select w, "This update to " + f + " has no effect, because " + recv + " is not a pointer."
```

### Key Predicates

- **`Method.getReceiver()`**: Receiver variable of a method
- **`Write.writesField(baseRead, field, idx)`**: Write whose LHS writes field of base expression
- **`Variable.getARead()`**: Read expression of the variable
- **`PointerType`**: Type test to exclude pointer receivers

## Example 2: Missing Error Handling

### Target Pattern

Function calls that return errors but the error is ignored.

### Query

```ql
import go

from CallExpr call, AssignStmt assign
where call.getType().toString().matches("%error%") and
      assign.getRhs() = call and
      assign.getLhs().(Ident).getName() = "_"
select call, "Error from " + call.getTarget().getName() + " is ignored"
```

## Example 3: Nil Pointer Dereference Risk

### Target Pattern

Pointer dereference without nil check.

### Query

```ql
import go

from StarExpr deref, Variable ptr
where deref.getExpr() = ptr.getARead() and
      not exists(IfStmt guard, NeqExpr check |
        check.getLeftOperand() = ptr.getARead() and
        check.getRightOperand().(Ident).getName() = "nil" and
        guard.getCondition() = check and
        deref.getParent*() = guard.getThen()
      )
select deref, "Potential nil pointer dereference of " + ptr
```

## Example 4: Goroutine Without Context

### Target Pattern

Goroutines launched without context cancellation mechanism.

### Query

```ql
import go

from GoStmt goStmt, FuncLit funcLit
where goStmt.getExpr() = funcLit and
      not exists(Parameter ctx |
        ctx = funcLit.getParameter(0) and
        ctx.getType().toString().matches("%context.Context%")
      )
select goStmt, "Goroutine launched without context parameter"
```

## Example 5: Unsafe Type Assertion

### Target Pattern

Type assertions without the "ok" idiom to check success.

### Query

```ql
import go

from TypeAssertExpr assert
where not exists(TupleExpr tuple, VariableName ok |
        tuple = assert.getParent() and
        tuple.getElement(1) = ok.getARead() and
        ok.getName() = "ok"
      )
select assert, "Type assertion without ok check: " + assert.toString()
```

## Example 6: Resource Leak - Missing Close

### Target Pattern

Files opened without corresponding defer close.

### Query

```ql
import go

from CallExpr open, VariableName file
where open.getTarget().hasQualifiedName("os", "Open") and
      open.getARead() = file.getARead() and
      not exists(DeferStmt defer, CallExpr close |
        close.getTarget().getName() = "Close" and
        close.getReceiver() = file.getARead() and
        defer.getExpr() = close
      )
select open, "File opened without defer close: " + file
```

## Example 7: SQL Injection Risk

### Target Pattern

String concatenation used to build SQL queries.

### Query

```ql
import go

from CallExpr dbCall, AddExpr concat, StringLit sqlPart
where dbCall.getTarget().hasQualifiedName("database/sql", ["Query", "Exec"]) and
      dbCall.getArgument(0) = concat and
      concat.getAnOperand() = sqlPart and
      sqlPart.getValue().matches("%SELECT%")
select concat, "SQL query built by concatenation, potential injection risk"
```

## Example 8: Command Injection Risk

### Target Pattern

User input used directly in command execution.

### Query

```ql
import go

from CallExpr execCall, CallExpr inputCall
where execCall.getTarget().hasQualifiedName("os/exec", "Command") and
      inputCall.getTarget().hasQualifiedName("os", "Getenv") and
      DataFlow::localFlow(DataFlow::exprNode(inputCall), DataFlow::exprNode(execCall.getAnArgument()))
select execCall, "Environment variable flows to command execution"
```

## Example 9: Range Over Map in Goroutine

### Target Pattern

Range over map in goroutine without copying the value (race condition risk).

### Query

```ql
import go

from GoStmt goStmt, RangeStmt rangeStmt, Variable mapVar
where goStmt.getExpr().(FuncLit).getBody().getAStmt*() = rangeStmt and
      rangeStmt.getDomain() = mapVar.getARead() and
      mapVar.getType().toString().matches("map[%")
select rangeStmt, "Range over map " + mapVar + " in goroutine may cause race condition"
```

## Example 10: Slice Bounds Check Missing

### Target Pattern

Slice access without bounds checking.

### Query

```ql
import go

from IndexExpr index, Variable slice
where index.getBase() = slice.getARead() and
      slice.getType().toString().matches("[]%") and
      not exists(IfStmt guard, CallExpr lenCall, RelationalComparisonExpr compare |
        lenCall.getTarget().getName() = "len" and
        lenCall.getArgument(0) = slice.getARead() and
        compare.getAnOperand() = index.getIndex() and
        compare.getAnOperand() = lenCall and
        guard.getCondition() = compare
      )
select index, "Slice access without bounds check: " + slice
```

## Usage Patterns

### Finding Specific Function Calls

```ql
// Find all calls to specific function
from CallExpr call
where call.getTarget().hasQualifiedName("fmt", "Printf")
select call

// Find method calls on specific type
from CallExpr call, SelectorExpr sel
where call.getCallee() = sel and
      sel.getBase().getType().toString() = "MyType" and
      sel.getSelector().getName() = "MyMethod"
select call
```

### Working with Control Flow

```ql
// Find if statements with specific conditions
from IfStmt ifStmt, EqlExpr eq
where ifStmt.getCondition() = eq and
      eq.getRightOperand().(Ident).getName() = "nil"
select ifStmt

// Find loops with range
from RangeStmt rangeStmt
where rangeStmt.getKey().getName() != "_" and
      rangeStmt.getValue().getName() != "_"
select rangeStmt
```

### Package and Import Analysis

```ql
// Find specific imports
from ImportSpec spec
where spec.getPath().getValue() = "unsafe"
select spec, "Unsafe package imported"

// Find package-level variables
from Variable v
where v.isPackageLevel() and
      v.getName().matches("debug%")
select v
```

## Testing and Refinement

### Running Queries in VS Code

1. Open VS Code with CodeQL extension
2. Paste query after `import go`
3. Click "Run Query" or use Ctrl+Shift+P → "CodeQL: Run Query"
4. Click results to jump to code locations

### Refining Results

```ql
// Add guards to exclude false positives
where not exists(CommentGroup comment |
    comment.getText().matches("%TODO%") and
    comment.getLocation().getStartLine() < result.getLocation().getStartLine()
  )

// Restrict to specific files or packages
where result.getFile().getBaseName().matches("%.go") and
      not result.getFile().getAbsolutePath().matches("%test%")
```

### Extensions and Improvements

- Add guards to exclude writes to temporary copies
- Restrict to exported methods/types
- Focus on specific packages with `hasQualifiedName`
- Convert to path queries to show data flow
- Add more specific type checking

These examples provide practical starting points for finding real Go programming issues and can be customized for specific codebases and requirements.
