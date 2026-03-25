/**
 * @name Call Graph From To for go
 * @description Displays calls on reachable paths from a source function to a target function, showing transitive call graph connectivity.
 * @id go/tools/call-graph-from-to
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import go

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
 * Holds if function `caller` directly calls function `callee` by name.
 */
predicate calls(FuncDecl caller_, FuncDecl callee_) {
  exists(CallExpr c |
    c.getEnclosingFunction() = caller_ and
    c.getTarget().getName() = callee_.getName()
  )
}

from CallExpr call, FuncDecl caller
where
  call.getEnclosingFunction() = caller and
  (
    // Use external predicates if available: show calls on paths from source to target
    exists(FuncDecl source, FuncDecl target |
      source.getName() = getSourceFunctionName() and
      target.getName() = getTargetFunctionName() and
      calls*(source, caller) and
      exists(FuncDecl callee |
        call.getTarget().getName() = callee.getName() and
        calls*(callee, target)
      )
    )
    or
    // Fallback for unit tests: include test files
    not exists(getSourceFunctionName()) and
    not exists(getTargetFunctionName()) and
    caller.getFile().getParentContainer().getParentContainer().getBaseName() = "test"
  )
select call,
  "Reachable call from `" + caller.getName() + "` to `" + call.getTarget().getName() + "`"
