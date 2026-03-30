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
 * Gets a function by matching against the selected source function names.
 */
Function getSourceFunction() { result.getName().getText() = getSourceFunctionName() }

/**
 * Gets the name of the called function.
 */
string getCalleeName(CallExpr call) {
  if exists(call.getResolvedTarget().(Function).getName())
  then result = call.getResolvedTarget().(Function).getName().getText()
  else result = call.toString()
}

from CallExpr call, Function source
where
  call.getEnclosingCallable() = source and
  source = getSourceFunction()
select call, "Call from `" + source.getName().getText() + "` to `" + getCalleeName(call) + "`"
