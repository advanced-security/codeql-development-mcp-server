/**
 * @name Call Graph From for javascript
 * @description Displays calls made from a specified function, showing the call graph outbound from the source function.
 * @id javascript/tools/call-graph-from
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import javascript

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
    result.getName() = selectedFunc
  )
}

from CallExpr call, Function source
where
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
  "Call from `" + source.getName() + "` to `" + call.getCalleeName() + "`"
