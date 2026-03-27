/**
 * @name Call Graph From for java
 * @description Displays calls made from a specified method, showing the call graph outbound from the source method.
 * @id java/tools/call-graph-from
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import java
import ExternalPredicates

/**
 * Gets a single source method name from the comma-separated list.
 */
string getSourceFunctionName() {
  exists(string s | sourceFunction(s) | result = s.splitAt(",").trim())
}

/**
 * Gets a method by matching against the selected source method names.
 */
Callable getSourceFunction() {
  exists(string selectedFunc |
    selectedFunc = getSourceFunctionName() and
    result.getName() = selectedFunc
  )
}

from Call call, Callable source, Callable callee
where
  call.getCaller() = source and
  call.getCallee() = callee and
  source = getSourceFunction()
select call, "Call from `" + source.getName() + "` to `" + callee.getName() + "`"
