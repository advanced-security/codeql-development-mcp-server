/**
 * @name Call Graph From for rust
 * @description Displays calls made from a specified function, showing the call graph outbound from the source function.
 * @id rust/tools/call-graph-from
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import rust
import ExternalPredicates

/**
 * Gets a single source function name from the comma-separated list.
 */
string getSourceFunctionName() {
  exists(string s | sourceFunction(s) | result = s.splitAt(",").trim())
}

/**
 * Gets the name of the called function.
 */
string getCalleeName(CallExpr call) {
  if exists(call.getResolvedTarget().(Function).getName())
  then result = call.getResolvedTarget().(Function).getName()
  else result = call.toString()
}

from CallExpr call, Function source
where
  call.getEnclosingCallable() = source and
  source.getName() = getSourceFunctionName()
select call, "Call from `" + source.getName() + "` to `" + getCalleeName(call) + "`"
