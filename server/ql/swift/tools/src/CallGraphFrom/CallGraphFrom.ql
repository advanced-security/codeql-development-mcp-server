/**
 * @name Call Graph From for swift
 * @description Displays calls made from a specified function, showing the call graph outbound from the source function.
 * @id swift/tools/call-graph-from
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import swift
import ExternalPredicates

/**
 * Gets a single source function name from the comma-separated list.
 */
string getSourceFunctionName() {
  exists(string s | sourceFunction(s) | result = s.splitAt(",").trim())
}

/**
 * Gets a function by matching against the selected source function names.
 * Supports both base names (e.g. "sourceFunc") and full Swift signatures (e.g. "sourceFunc()").
 */
Function getSourceFunction() {
  exists(string selectedFunc |
    selectedFunc = getSourceFunctionName() and
    (result.getName() = selectedFunc or result.getName().matches(selectedFunc + "(%"))
  )
}

/**
 * Gets the name of the called function.
 */
string getCalleeName(CallExpr call) {
  if exists(call.getStaticTarget())
  then result = call.getStaticTarget().getName()
  else result = call.toString()
}

from CallExpr call, Function source
where
  call.getEnclosingFunction() = source and
  source = getSourceFunction()
select call, "Call from `" + source.getName() + "` to `" + getCalleeName(call) + "`"
