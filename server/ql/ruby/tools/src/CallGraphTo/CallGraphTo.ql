/**
 * @name Call Graph To for ruby
 * @description Displays calls made to a specified method, showing the call graph inbound to the target method.
 * @id ruby/tools/call-graph-to
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

private import codeql.ruby.AST
private import codeql.ruby.DataFlow
import ExternalPredicates

/**
 * Gets a single target method name from the comma-separated list.
 */
string getTargetFunctionName() {
  exists(string s | targetFunction(s) | result = s.splitAt(",").trim())
}

/**
 * Gets the caller name for a call expression.
 */
string getCallerName(MethodCall call) {
  if exists(call.getEnclosingMethod())
  then result = call.getEnclosingMethod().getName()
  else result = "Top-level"
}

from MethodCall call
where call.getMethodName() = getTargetFunctionName()
select call, "Call to `" + call.getMethodName() + "` from `" + getCallerName(call) + "`"
