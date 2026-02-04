/**
 * @name Find Pointer Dereferences
 * @description Find all pointer dereference expressions
 * @kind problem
 * @id cpp/exercise1-deref
 * @problem.severity warning
 */

import cpp

from Expr deref
where
  // TODO: Identify pointer dereference expressions
  // Hint: Use PointerDereferenceExpr
  none()
select deref, "Pointer dereference"
