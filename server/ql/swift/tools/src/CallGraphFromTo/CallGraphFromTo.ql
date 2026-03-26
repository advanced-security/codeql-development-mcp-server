/**
 * @name Call Graph From To for swift
 * @description Displays calls on reachable paths from a source function to a target function, showing transitive call graph connectivity.
 * @id swift/tools/call-graph-from-to
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import swift
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
 * Supports both base names (e.g. "source") and full Swift signatures (e.g. "source()").
 */
Function getSourceFunction() {
  exists(string selectedFunc |
    selectedFunc = getSourceFunctionName() and
    (result.getName() = selectedFunc or result.getName().matches(selectedFunc + "(%"))
  )
}

/**
 * Gets a function by matching against the selected target function names.
 * Supports both base names (e.g. "target") and full Swift signatures (e.g. "target()").
 */
Function getTargetFunction() {
  exists(string selectedFunc |
    selectedFunc = getTargetFunctionName() and
    (result.getName() = selectedFunc or result.getName().matches(selectedFunc + "(%"))
  )
}

/**
 * Holds if function `caller` directly calls function `callee`.
 */
predicate calls(Function caller_, Function callee_) {
  exists(CallExpr c |
    c.getEnclosingFunction() = caller_ and
    c.getStaticTarget() = callee_
  )
}

/**
 * Gets the name of the called function.
 */
string getCalleeName(CallExpr call) {
  if exists(call.getStaticTarget())
  then result = call.getStaticTarget().getName()
  else result = call.toString()
}

from CallExpr call, Function caller
where
  call.getEnclosingFunction() = caller and
  exists(Function source, Function target |
    source = getSourceFunction() and
    target = getTargetFunction() and
    calls*(source, caller) and
    exists(Function callee |
      call.getStaticTarget() = callee and
      calls*(callee, target)
    )
  )
select call, "Reachable call from `" + caller.getName() + "` to `" + getCalleeName(call) + "`"
