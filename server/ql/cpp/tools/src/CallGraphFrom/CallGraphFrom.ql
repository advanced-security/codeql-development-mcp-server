/**
 * @name Call Graph From for cpp
 * @description Displays calls made from a specified function, showing the call graph outbound from the source function.
 * @id cpp/tools/call-graph-from
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import cpp
import ExternalPredicates

/**
 * Gets a single source function name from the comma-separated list.
 */
string getSourceFunctionName() {
  exists(string s | sourceFunction(s) | result = s.splitAt(",").trim())
}

/**
 * Gets a function by matching against the selected source function names.
 */
Function getSourceFunction() {
  exists(string selectedFunc |
    selectedFunc = getSourceFunctionName() and
    (
      // Match by exact function name
      result.getName() = selectedFunc
      or
      // Match by qualified name
      result.getQualifiedName() = selectedFunc
    )
  )
}

from FunctionCall call, Function source, Function callee
where
  call.getTarget() = callee and
  call.getEnclosingFunction() = source and
  source = getSourceFunction()
select call, "Call from `" + source.getQualifiedName() + "` to `" + callee.getQualifiedName() + "`"
