/**
 * @name Call Graph From To for rust
 * @description Displays calls on reachable paths from a source function to a target function, showing transitive call graph connectivity.
 * @id rust/tools/call-graph-from-to
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
 * Gets a single target function name from the comma-separated list.
 */
string getTargetFunctionName() {
  exists(string s | targetFunction(s) | result = s.splitAt(",").trim())
}

/**
 * Gets a function by matching against the selected source function names.
 */
Function getSourceFunction() { result.getName().getText() = getSourceFunctionName() }

/**
 * Gets a function by matching against the selected target function names.
 */
Function getTargetFunction() { result.getName().getText() = getTargetFunctionName() }

/**
 * Holds if function `caller` directly calls function `callee`.
 */
predicate calls(Function caller_, Function callee_) {
  exists(CallExpr c |
    c.getEnclosingCallable() = caller_ and
    c.getResolvedTarget().(Function) = callee_
  )
}

/**
 * Gets the name of the called function.
 */
string getCalleeName(CallExpr call) {
  if exists(call.getResolvedTarget().(Function).getName())
  then result = call.getResolvedTarget().(Function).getName().getText()
  else result = call.toString()
}

from CallExpr call, Function caller
where
  call.getEnclosingCallable() = caller and
  exists(Function source, Function target |
    source = getSourceFunction() and
    target = getTargetFunction() and
    calls*(source, caller) and
    exists(Function callee |
      call.getResolvedTarget().(Function) = callee and
      calls*(callee, target)
    )
  )
select call,
  "Reachable call from `" + caller.getName().getText() + "` to `" + getCalleeName(call) + "`"
