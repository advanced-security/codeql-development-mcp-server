/**
 * @name Call Graph From for cpp
 * @description Displays calls made from a specified function, showing the call graph outbound from the source function.
 * @id cpp/tools/call-graph-from
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import cpp

/**
 * Gets the source function name for which to generate the call graph.
 * Can be a single function name or comma-separated list of function names.
 */
external string sourceFunction();

/**
 * Gets a single source function name from the comma-separated list.
 */
string getSourceFunctionName() {
  result = sourceFunction().splitAt(",").trim()
}

/**
 * Gets a function by matching against the selected source function names.
 */
Function getSourceFunction() {
  exists(string selectedFunc |
    selectedFunc = getSourceFunctionName() and
    (
      // Match by exact function name
      result.getName() = selectedFunc or
      // Match by qualified name
      result.getQualifiedName() = selectedFunc
    )
  )
}

from FunctionCall call, Function source, Function callee
where
  call.getTarget() = callee and
  call.getEnclosingFunction() = source and
  (
    // Use external predicate if available
    source = getSourceFunction()
    or
    // Fallback for unit tests: include test files
    (
      not exists(getSourceFunction()) and
      source.getFile().getParentContainer().getParentContainer().getBaseName() = "test"
    )
  )
select call,
  "Call from `" + source.getQualifiedName() + "` to `" + callee.getQualifiedName() + "`"
