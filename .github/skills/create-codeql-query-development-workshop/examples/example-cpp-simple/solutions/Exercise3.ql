/**
 * @name Null Pointer Dereference
 * @description Find dereferences of null pointers using local data flow
 * @kind problem
 * @id cpp/exercise3-null-deref
 * @problem.severity error
 */

import cpp
import semmle.code.cpp.dataflow.DataFlow

predicate isNullLiteral(Literal lit) {
  lit.getValue() = "0" or lit.toString() = "nullptr"
}

from DataFlow::Node source, DataFlow::Node sink, PointerDereferenceExpr deref
where
  isNullLiteral(source.asExpr()) and
  sink.asExpr() = deref.getOperand() and
  DataFlow::localFlow(source, sink)
select deref, "Null pointer dereference"
