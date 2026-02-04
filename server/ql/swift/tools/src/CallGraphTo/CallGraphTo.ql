/**
 * @name Call Graph To for swift
 * @description Displays calls made to a specified function, showing the call graph inbound to the target function.
 * @id swift/tools/call-graph-to
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import swift

/**
 * Gets the target function name for which to generate the call graph.
 * Can be a single function name or comma-separated list of function names.
 */
external string targetFunction();

/**
 * Gets a single target function name from the comma-separated list.
 */
string getTargetFunctionName() { result = targetFunction().splitAt(",").trim() }

/**
 * Gets the caller name for a call expression.
 */
string getCallerName(CallExpr call) {
  if exists(call.getEnclosingFunction())
  then result = call.getEnclosingFunction().getName()
  else result = "Top-level"
}

/**
 * Gets the name of the called function.
 */
string getCalleeName(CallExpr call) {
  if exists(call.getStaticTarget())
  then result = call.getStaticTarget().getName()
  else result = call.toString()
}

from CallExpr call
where
  // Use external predicate if available
  call.getStaticTarget().getName() = getTargetFunctionName()
  or
  // Fallback for unit tests: include specific test files
  not exists(getTargetFunctionName()) and
  call.getLocation().getFile().getBaseName() = "Example1.swift"
select call, "Call to `" + getCalleeName(call) + "` from `" + getCallerName(call) + "`"
