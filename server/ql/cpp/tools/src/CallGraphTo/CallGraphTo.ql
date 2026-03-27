/**
 * @name Call Graph To for cpp
 * @description Displays calls made to a specified function, showing the call graph inbound to the target function.
 * @id cpp/tools/call-graph-to
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import cpp
import ExternalPredicates

/**
 * Gets a single target function name from the comma-separated list.
 */
string getTargetFunctionName() {
  exists(string s | targetFunction(s) | result = s.splitAt(",").trim())
}

/**
 * Gets a function by matching against the selected target function names.
 */
Function getTargetFunction() {
  exists(string selectedFunc |
    selectedFunc = getTargetFunctionName() and
    (
      // Match by exact function name
      result.getName() = selectedFunc
      or
      // Match by qualified name
      result.getQualifiedName() = selectedFunc
    )
  )
}

from FunctionCall call, Function target, Function caller
where
  call.getTarget() = target and
  call.getEnclosingFunction() = caller and
  target = getTargetFunction()
select call, "Call to `" + target.getQualifiedName() + "` from `" + caller.getQualifiedName() + "`"
