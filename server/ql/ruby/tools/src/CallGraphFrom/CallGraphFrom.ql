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

/**
 * Gets the source method name for which to generate the call graph.
 * Can be a single method name or comma-separated list of method names.
 */
external string sourceFunction();

/**
 * Gets a single source method name from the comma-separated list.
 */
string getSourceFunctionName() {
  result = sourceFunction().splitAt(",").trim()
}

from MethodCall call, MethodBase source
where
  call.getEnclosingMethod() = source and
  (
    // Use external predicate if available
    source.getName() = getSourceFunctionName()
    or
    // Fallback for unit tests: include test files
    (
      not exists(getSourceFunctionName()) and
      source.getLocation().getFile().getParentContainer().getParentContainer().getBaseName() = "test"
    )
  )
select call,
  "Call from `" + source.getName() + "` to `" + call.getMethodName() + "`"
