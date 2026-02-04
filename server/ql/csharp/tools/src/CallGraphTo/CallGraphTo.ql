/**
 * @name Call Graph To for csharp
 * @description Displays calls made to a specified method, showing the call graph inbound to the target method.
 * @id csharp/tools/call-graph-to
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import csharp

/**
 * Gets the target method name for which to generate the call graph.
 * Can be a single method name or comma-separated list of method names.
 */
external string targetFunction();

/**
 * Gets a single target method name from the comma-separated list.
 */
string getTargetFunctionName() {
  result = targetFunction().splitAt(",").trim()
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

from Call call, Callable target, Callable caller
where
  call.getTarget() = target and
  call.getEnclosingCallable() = caller and
  (
    // Use external predicate if available
    target = getTargetFunction()
    or
    // Fallback for unit tests: include test files
    (
      not exists(getTargetFunction()) and
      target.getFile().getParentContainer().getParentContainer().getBaseName() = "test"
    )
  )
select call,
  "Call to `" + target.getName() + "` from `" + caller.getName() + "`"
