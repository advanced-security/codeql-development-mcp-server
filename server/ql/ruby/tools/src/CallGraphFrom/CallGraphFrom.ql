/**
 * @name Call Graph From for ruby
 * @description Displays calls made from a specified method, showing the call graph outbound from the source method.
 * @id ruby/tools/call-graph-from
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

private import codeql.ruby.AST
private import codeql.ruby.DataFlow
import ExternalPredicates

/**
 * Gets a single source method name from the comma-separated list.
 */
string getSourceFunctionName() {
  exists(string s | sourceFunction(s) | result = s.splitAt(",").trim())
}

from MethodCall call, MethodBase source
where
  call.getEnclosingMethod() = source and
  source.getName() = getSourceFunctionName()
select call, "Call from `" + source.getName() + "` to `" + call.getMethodName() + "`"
