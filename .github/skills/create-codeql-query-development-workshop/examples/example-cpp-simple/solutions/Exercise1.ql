/**
 * @name Find Pointer Dereferences
 * @description Find all pointer dereference expressions
 * @kind problem
 * @id cpp/exercise1-deref
 * @problem.severity warning
 */

import cpp

from PointerDereferenceExpr deref
select deref, "Pointer dereference"
