/**
 * @name Call Graph From for python
 * @description Displays calls made from a specified function, showing the call graph outbound from the source function.
 * @id python/tools/call-graph-from
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import python
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

from CallNode call, Function source
where
  call.getScope() = source and
  source = getSourceFunction()
select call.getNode(),
  "Call from `" + source.getName() + "` to `" + call.getNode().(Call).getFunc().(Name).getId() + "`"
