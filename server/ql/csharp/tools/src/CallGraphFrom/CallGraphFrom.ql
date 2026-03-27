/**
 * @name Call Graph From for csharp
 * @description Displays calls made from a specified method, showing the call graph outbound from the source method.
 * @id csharp/tools/call-graph-from
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import csharp
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
  call.getEnclosingCallable() = source and
  call.getTarget() = callee and
  source = getSourceFunction()
select call, "Call from `" + source.getName() + "` to `" + callee.getName() + "`"
