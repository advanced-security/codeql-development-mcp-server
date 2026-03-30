/**
 * @name Call Graph To for rust
 * @description Displays calls made to a specified function, showing the call graph inbound to the target function.
 * @id rust/tools/call-graph-to
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import rust
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
  if exists(call.getEnclosingCallable().(Function).getName())
  then result = call.getEnclosingCallable().(Function).getName()
  else result = "Top-level"
}

/**
 * Gets the name of the called function.
 */
string getCalleeName(CallExpr call) {
  if exists(call.getResolvedTarget().(Function).getName())
  then result = call.getResolvedTarget().(Function).getName()
  else result = call.toString()
}

from CallExpr call
where call.getResolvedTarget().(Function).getName() = getTargetFunctionName()
select call, "Call to `" + getCalleeName(call) + "` from `" + getCallerName(call) + "`"
