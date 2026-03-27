/**
 * @name Call Graph To for python
 * @description Displays calls made to a specified function, showing the call graph inbound to the target function.
 * @id python/tools/call-graph-to
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import python
import ExternalPredicates

/**
 * Gets a single target function name from the comma-separated list.
 */
string getTargetFunctionName() {
  exists(string s | targetFunction(s) | result = s.splitAt(",").trim())
}

/**
 * Gets the caller name for a call expression.
 */
string getCallerName(CallNode call) {
  if exists(call.getScope()) then result = call.getScope().getName() else result = "Module"
}

from CallNode call
where call.getNode().(Call).getFunc().(Name).getId() = getTargetFunctionName()
select call.getNode(),
  "Call to `" + call.getNode().(Call).getFunc().(Name).getId() + "` from `" + getCallerName(call) +
    "`"
