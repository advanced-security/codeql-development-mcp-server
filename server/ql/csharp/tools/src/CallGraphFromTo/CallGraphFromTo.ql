/**
 * @name Call Graph From To for csharp
 * @description Displays calls on reachable paths from a source method to a target method, showing transitive call graph connectivity.
 * @id csharp/tools/call-graph-from-to
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import csharp
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
 * Gets a method by matching against the selected source method names.
 */
Callable getSourceFunction() {
  exists(string selectedFunc |
    selectedFunc = getSourceFunctionName() and
    result.getName() = selectedFunc
  )
}

/**
 * Gets a method by matching against the selected target method names.
 */
Callable getTargetFunction() {
  exists(string selectedFunc |
    selectedFunc = getTargetFunctionName() and
    result.getName() = selectedFunc
  )
}

/**
 * Holds if callable `caller` directly calls callable `callee`.
 */
predicate calls(Callable caller_, Callable callee_) {
  exists(Call c | c.getEnclosingCallable() = caller_ and c.getTarget() = callee_)
}

from Call call, Callable caller, Callable callee
where
  call.getEnclosingCallable() = caller and
  call.getTarget() = callee and
  exists(Callable source, Callable target |
    source = getSourceFunction() and
    target = getTargetFunction() and
    calls*(source, caller) and
    calls*(callee, target)
  )
select call, "Reachable call from `" + caller.getName() + "` to `" + callee.getName() + "`"
