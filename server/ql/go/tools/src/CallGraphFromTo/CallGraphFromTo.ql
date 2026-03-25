/**
 * @name Call Graph From To for go
 * @description Displays calls on reachable paths from a source function to a target function, showing transitive call graph connectivity.
 * @id go/tools/call-graph-from-to
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

import go
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
  exists(
    // Use external predicates if available: show calls on paths from source to target
    FuncDecl source, FuncDecl target
  |
    source.getName() = getSourceFunctionName() and
    target.getName() = getTargetFunctionName() and
    calls*(source, caller) and
    exists(FuncDecl callee |
      call.getTarget().getName() = callee.getName() and
      calls*(callee, target)
    )
  )
select call,
  "Reachable call from `" + caller.getName() + "` to `" + call.getTarget().getName() + "`"
