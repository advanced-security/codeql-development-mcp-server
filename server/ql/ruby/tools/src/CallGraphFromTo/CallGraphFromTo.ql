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
import ExternalPredicates

/**
 * Gets a single source method name from the comma-separated list.
 */
string getSourceFunctionName() {
  exists(string s | sourceFunction(s) | result = s.splitAt(",").trim())
}

/**
 * Gets a single target method name from the comma-separated list.
 */
string getTargetFunctionName() {
  exists(string s | targetFunction(s) | result = s.splitAt(",").trim())
}

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
  exists(MethodBase source, MethodBase target |
    source.getName() = getSourceFunctionName() and
    target.getName() = getTargetFunctionName() and
    calls*(source, caller) and
    exists(MethodBase callee |
      call.getMethodName() = callee.getName() and
      calls*(callee, target)
    )
  )
select call, "Reachable call from `" + caller.getName() + "` to `" + call.getMethodName() + "`"
