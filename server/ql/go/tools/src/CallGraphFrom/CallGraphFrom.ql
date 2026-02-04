/**
 * @name Call Graph From for go
 * @description Displays calls made from a specified function, showing the call graph outbound from the source function.
 * @id go/tools/call-graph-from
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import go

/**
 * Gets the source function name for which to generate the call graph.
 * Can be a single function name or comma-separated list of function names.
 */
external string sourceFunction();

/**
 * Gets a single source function name from the comma-separated list.
 */
string getSourceFunctionName() {
  result = sourceFunction().splitAt(",").trim()
}

from CallExpr call, FuncDecl source
where
  call.getEnclosingFunction() = source and
  (
    // Use external predicate if available
    source.getName() = getSourceFunctionName()
    or
    // Fallback for unit tests: include test files
    (
      not exists(getSourceFunctionName()) and
      source.getFile().getParentContainer().getParentContainer().getBaseName() = "test"
    )
  )
select call,
  "Call from `" + source.getName() + "` to `" + call.getTarget().getName() + "`"
