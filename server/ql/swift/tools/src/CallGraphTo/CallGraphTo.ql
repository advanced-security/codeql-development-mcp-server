/**
 * @name Call Graph To for swift
 * @description Displays calls made to a specified function, showing the call graph inbound to the target function.
 * @id swift/tools/call-graph-to
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import swift
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
string getCallerName(CallExpr call) {
  if exists(call.getEnclosingFunction())
  then result = call.getEnclosingFunction().getName()
  else result = "Top-level"
}

/**
 * Gets the name of the called function.
 */
string getCalleeName(CallExpr call) {
  if exists(call.getStaticTarget())
  then result = call.getStaticTarget().getName()
  else result = call.toString()
}

from CallExpr call
where call.getStaticTarget().getName() = getTargetFunctionName()
select call, "Call to `" + getCalleeName(call) + "` from `" + getCallerName(call) + "`"
