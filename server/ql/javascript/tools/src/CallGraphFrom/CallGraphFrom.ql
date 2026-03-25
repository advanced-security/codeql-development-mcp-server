/**
 * @name Call Graph From for javascript
 * @description Displays calls made from a specified function, showing the call graph outbound from the source function.
 * @id javascript/tools/call-graph-from
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import javascript
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
    result.getName() = selectedFunc
  )
}

from CallExpr call, Function source
where
  call.getEnclosingFunction() = source and
  source = getSourceFunction()
select call, "Call from `" + source.getName() + "` to `" + call.getCalleeName() + "`"
