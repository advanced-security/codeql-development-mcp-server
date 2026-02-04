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

/**
 * Gets the target method name for which to generate the call graph.
 * Can be a single method name or comma-separated list of method names.
 */
external string targetFunction();

/**
 * Gets a single target method name from the comma-separated list.
 */
string getTargetFunctionName() {
  result = targetFunction().splitAt(",").trim()
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
where
  (
    // Use external predicate if available
    call.getMethodName() = getTargetFunctionName()
    or
    // Fallback for unit tests: include test files
    (
      not exists(getTargetFunctionName()) and
      call.getLocation().getFile().getParentContainer().getParentContainer().getBaseName() = "test"
    )
  )
select call,
  "Call to `" + call.getMethodName() + "` from `" + getCallerName(call) + "`"
