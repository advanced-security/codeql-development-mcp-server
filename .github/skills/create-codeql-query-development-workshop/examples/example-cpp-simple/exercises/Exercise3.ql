/**
 * @name Null Pointer Dereference
 * @description Find dereferences of null pointers using local data flow
 * @kind problem
 * @id cpp/exercise3-null-deref
 * @problem.severity error
 */

import cpp
import semmle.code.cpp.dataflow.DataFlow

from DataFlow::Node source, DataFlow::Node sink
where
  // TODO: Define source as null literal
  // TODO: Define sink as pointer dereference
  // TODO: Use DataFlow::localFlow to connect them
  none()
select sink, "Null pointer dereference"
