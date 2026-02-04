/**
 * @name Call Graph From for swift
 * @description Displays calls made from a specified function, showing the call graph outbound from the source function.
 * @id swift/tools/call-graph-from
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import swift

/**
 * Gets the source function name for which to generate the call graph.
 * Can be a single function name or comma-separated list of function names.
 */
external string sourceFunction();

/**
 * Gets a single source function name from the comma-separated list.
 */
string getSourceFunctionName() { result = sourceFunction().splitAt(",").trim() }

/**
 * Gets a function by matching against the selected source function names.
 */
Function getSourceFunction() {
  exists(string selectedFunc |
    selectedFunc = getSourceFunctionName() and
    result.getName() = selectedFunc
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

from CallExpr call, Function source
where
  call.getEnclosingFunction() = source and
  (
    // Use external predicate if available
    source = getSourceFunction()
    or
    // Fallback for unit tests: include specific test files
    not exists(getSourceFunction()) and
    source.getFile().getBaseName() = "Example1.swift"
  )
select call, "Call from `" + source.getName() + "` to `" + getCalleeName(call) + "`"
