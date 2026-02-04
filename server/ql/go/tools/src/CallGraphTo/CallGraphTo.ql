/**
 * @name Call Graph To for go
 * @description Displays calls made to a specified function, showing the call graph inbound to the target function.
 * @id go/tools/call-graph-to
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import go

/**
 * Gets the target function name for which to generate the call graph.
 * Can be a single function name or comma-separated list of function names.
 */
external string targetFunction();

/**
 * Gets a single target function name from the comma-separated list.
 */
string getTargetFunctionName() {
  result = targetFunction().splitAt(",").trim()
}

/**
 * Gets the caller name for a call expression.
 */
string getCallerName(CallExpr call) {
  if exists(call.getEnclosingFunction())
  then result = call.getEnclosingFunction().getName()
  else result = "Top-level"
}

from CallExpr call
where
  (
    // Use external predicate if available
    call.getTarget().getName() = getTargetFunctionName()
    or
    // Fallback for unit tests: include test files
    (
      not exists(getTargetFunctionName()) and
      call.getFile().getParentContainer().getParentContainer().getBaseName() = "test"
    )
  )
select call,
  "Call to `" + call.getTarget().getName() + "` from `" + getCallerName(call) + "`"
