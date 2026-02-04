/**
 * @name Call Graph From for csharp
 * @description Displays calls made from a specified method, showing the call graph outbound from the source method.
 * @id csharp/tools/call-graph-from
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import csharp

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

/**
 * Gets a method by matching against the selected source method names.
 */
Callable getSourceFunction() {
  exists(string selectedFunc |
    selectedFunc = getSourceFunctionName() and
    result.getName() = selectedFunc
  )
}

from Call call, Callable source, Callable callee
where
  call.getEnclosingCallable() = source and
  call.getTarget() = callee and
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
  "Call from `" + source.getName() + "` to `" + callee.getName() + "`"
