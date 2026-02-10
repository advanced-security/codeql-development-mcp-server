/**
 * @name Find XSS sinks
 * @description Find DOM properties and methods that can introduce XSS
 * @kind problem
 * @id js/workshop/xss-sinks
 * @problem.severity warning
 */

import javascript

from DataFlow::Node sink
where
  // TODO: Implement - find nodes that write to innerHTML or outerHTML properties
  // Hint: Use DataFlow::PropWrite to find property writes.
  //       pw.getPropertyName() gives you the property name.
  //       pw.getRhs() gives you the right-hand side (the value being assigned).
  //
  // TODO: Implement - find calls to document.write()
  // Hint: Use DataFlow::globalVarRef("document").getAMemberCall("write")
  //       to find calls to document.write.
  //
  // TODO: Implement - find calls to eval()
  // Hint: Use DataFlow::globalVarRef("eval").getACall()
  //       to find calls to eval.
  none()
select sink, "Potential XSS sink"
