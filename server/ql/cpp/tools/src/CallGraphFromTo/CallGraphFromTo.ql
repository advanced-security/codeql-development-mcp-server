/**
 * @name Call Graph From To for cpp
 * @description Displays calls on reachable paths from a source function to a target function, showing transitive call graph connectivity.
 * @id cpp/tools/call-graph-from-to
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import cpp

/**
 * Gets the source function name for call graph reachability analysis.
 * Can be a single function name or comma-separated list of function names.
 */
external string sourceFunction();

/**
 * Gets the target function name for call graph reachability analysis.
 * Can be a single function name or comma-separated list of function names.
 */
external string targetFunction();

/**
 * Gets a single source function name from the comma-separated list.
 */
string getSourceFunctionName() { result = sourceFunction().splitAt(",").trim() }

/**
 * Gets a single target function name from the comma-separated list.
 */
string getTargetFunctionName() { result = targetFunction().splitAt(",").trim() }

/**
 * Gets a function by matching against the selected source function names.
 */
Function getSourceFunction() {
  exists(string selectedFunc |
    selectedFunc = getSourceFunctionName() and
    (
      // Match by exact function name
      result.getName() = selectedFunc
      or
      // Match by qualified name
      result.getQualifiedName() = selectedFunc
    )
  )
}

/**
 * Gets a function by matching against the selected target function names.
 */
Function getTargetFunction() {
  exists(string selectedFunc |
    selectedFunc = getTargetFunctionName() and
    (
      // Match by exact function name
      result.getName() = selectedFunc
      or
      // Match by qualified name
      result.getQualifiedName() = selectedFunc
    )
  )
}

/**
 * Holds if function `caller` directly calls function `callee`.
 */
predicate calls(Function caller_, Function callee_) {
  exists(FunctionCall c | c.getEnclosingFunction() = caller_ and c.getTarget() = callee_)
}

from FunctionCall call, Function caller, Function callee
where
  call.getTarget() = callee and
  call.getEnclosingFunction() = caller and
  (
    // Use external predicates if available: show calls on paths from source to target
    exists(Function source, Function target |
      source = getSourceFunction() and
      target = getTargetFunction() and
      calls*(source, caller) and
      calls*(callee, target)
    )
    or
    // Fallback for unit tests: include test files
    not exists(getSourceFunctionName()) and
    not exists(getTargetFunctionName()) and
    caller.getFile().getParentContainer().getParentContainer().getBaseName() = "test"
  )
select call,
  "Reachable call from `" + caller.getQualifiedName() + "` to `" + callee.getQualifiedName() + "`"
