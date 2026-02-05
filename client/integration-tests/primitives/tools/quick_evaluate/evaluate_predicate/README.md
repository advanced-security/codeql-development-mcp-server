# `quick_evaluate` - evaluate_predicate

## Purpose

Tests the `quick_evaluate` tool by evaluating a predicate in a CodeQL query for debugging.

## Inputs

- **file**: Path to the `.ql` file containing the symbol (`server/ql/javascript/tools/src/PrintAST/PrintAST.ql`)
- **db**: Path to the CodeQL database
- **symbol**: Name of the class or predicate to evaluate (`getSelectedSourceFile`)

## Expected Behavior

The tool should locate and evaluate the specified symbol (class or predicate) in the query file.

## Static Files Referenced

- `server/ql/javascript/tools/src/PrintAST/PrintAST.ql` (query file with predicates)
- `server/ql/javascript/examples/test/ExampleQuery1/ExampleQuery1.testproj` (database)
