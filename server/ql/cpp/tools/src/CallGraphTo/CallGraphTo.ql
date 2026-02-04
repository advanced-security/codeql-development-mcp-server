/**
 * @name Call Graph To for cpp
 * @description Displays calls made to a specified function, showing the call graph inbound to the target function.
 * @id cpp/tools/call-graph-to
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import cpp

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
 * Gets a function by matching against the selected target function names.
 */
Function getTargetFunction() {
  exists(string selectedFunc |
    selectedFunc = getTargetFunctionName() and
    (
      // Match by exact function name
      result.getName() = selectedFunc or
      // Match by qualified name
      result.getQualifiedName() = selectedFunc
    )
  )
}

from FunctionCall call, Function target, Function caller
where
  call.getTarget() = target and
  call.getEnclosingFunction() = caller and
  (
    // Use external predicate if available
    target = getTargetFunction()
    or
    // Fallback for unit tests: include test files
    (
      not exists(getTargetFunction()) and
      target.getFile().getParentContainer().getParentContainer().getBaseName() = "test"
    )
  )
select call,
  "Call to `" + target.getQualifiedName() + "` from `" + caller.getQualifiedName() + "`"
