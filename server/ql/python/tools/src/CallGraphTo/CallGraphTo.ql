/**
 * @name Call Graph To for python
 * @description Displays calls made to a specified function, showing the call graph inbound to the target function.
 * @id python/tools/call-graph-to
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import python

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
string getCallerName(CallNode call) {
  if exists(call.getScope())
  then result = call.getScope().getName()
  else result = "Module"
}

from CallNode call
where
  (
    // Use external predicate if available
    call.getNode().(Call).getFunc().(Name).getId() = getTargetFunctionName()
    or
    // Fallback for unit tests: include test files
    (
      not exists(getTargetFunctionName()) and
      call.getLocation().getFile().getParentContainer().getParentContainer().getBaseName() = "test"
    )
  )
select call.getNode(),
  "Call to `" + call.getNode().(Call).getFunc().(Name).getId() + "` from `" + getCallerName(call) + "`"
