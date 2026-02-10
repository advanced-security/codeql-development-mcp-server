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
  exists(DataFlow::PropWrite pw |
    pw.getPropertyName() = ["innerHTML", "outerHTML"] and
    sink = pw.getRhs()
  )
  or
  exists(DataFlow::CallNode call |
    call = DataFlow::globalVarRef("document").getAMemberCall("write") and
    sink = call.getArgument(0)
  )
  or
  exists(DataFlow::CallNode call |
    call = DataFlow::globalVarRef("eval").getACall() and
    sink = call.getArgument(0)
  )
select sink, "Potential XSS sink"
