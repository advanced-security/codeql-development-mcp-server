/**
 * @name Call Graph From for go
 * @description Displays calls made from a specified function, showing the call graph outbound from the source function.
 * @id go/tools/call-graph-from
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import go
import ExternalPredicates

/**
 * Gets a single source function name from the comma-separated list.
 */
string getSourceFunctionName() {
  exists(string s | sourceFunction(s) | result = s.splitAt(",").trim())
}

from CallExpr call, FuncDecl source
where
  call.getEnclosingFunction() = source and
  source.getName() = getSourceFunctionName()
select call, "Call from `" + source.getName() + "` to `" + call.getTarget().getName() + "`"
