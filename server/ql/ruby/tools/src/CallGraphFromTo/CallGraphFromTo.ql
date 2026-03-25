/**
 * @name Call Graph From To for ruby
 * @description Displays calls on reachable paths from a source method to a target method, showing transitive call graph connectivity.
 * @id ruby/tools/call-graph-from-to
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

private import codeql.ruby.AST
private import codeql.ruby.DataFlow

/**
 * Gets the source method name for call graph reachability analysis.
 * Can be a single method name or comma-separated list of method names.
 */
external string sourceFunction();

/**
 * Gets the target method name for call graph reachability analysis.
 * Can be a single method name or comma-separated list of method names.
 */
external string targetFunction();

/**
 * Gets a single source method name from the comma-separated list.
 */
string getSourceFunctionName() { result = sourceFunction().splitAt(",").trim() }

/**
 * Gets a single target method name from the comma-separated list.
 */
string getTargetFunctionName() { result = targetFunction().splitAt(",").trim() }

/**
 * Holds if method `caller` directly calls method `callee` by name.
 */
predicate calls(MethodBase caller_, MethodBase callee_) {
  exists(MethodCall c |
    c.getEnclosingMethod() = caller_ and
    c.getMethodName() = callee_.getName()
  )
}

from MethodCall call, MethodBase caller
where
  call.getEnclosingMethod() = caller and
  (
    // Use external predicates if available: show calls on paths from source to target
    exists(MethodBase source, MethodBase target |
      source.getName() = getSourceFunctionName() and
      target.getName() = getTargetFunctionName() and
      calls*(source, caller) and
      exists(MethodBase callee |
        call.getMethodName() = callee.getName() and
        calls*(callee, target)
      )
    )
    or
    // Fallback for unit tests: include test files
    not exists(getSourceFunctionName()) and
    not exists(getTargetFunctionName()) and
    caller.getLocation().getFile().getParentContainer().getParentContainer().getBaseName() = "test"
  )
select call, "Reachable call from `" + caller.getName() + "` to `" + call.getMethodName() + "`"
