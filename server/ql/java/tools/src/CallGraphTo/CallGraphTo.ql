/**
 * @name Call Graph To for java
 * @description Displays calls made to a specified method, showing the call graph inbound to the target method.
 * @id java/tools/call-graph-to
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import java
import ExternalPredicates

/**
 * Gets a single target method name from the comma-separated list.
 */
string getTargetFunctionName() {
  exists(string s | targetFunction(s) | result = s.splitAt(",").trim())
}

/**
 * Gets a method by matching against the selected target method names.
 */
Callable getTargetFunction() {
  exists(string selectedFunc |
    selectedFunc = getTargetFunctionName() and
    result.getName() = selectedFunc
  )
}

from Call call, Callable target, Callable caller
where
  call.getCallee() = target and
  call.getCaller() = caller and
  target = getTargetFunction()
select call, "Call to `" + target.getName() + "` from `" + caller.getName() + "`"
