/**
 * @name Basic XSS taint tracking
 * @description Track taint from user input to XSS sinks
 * @kind problem
 * @id js/workshop/xss-basic-taint
 * @problem.severity error
 */

import javascript

module XssConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) {
    source instanceof RemoteFlowSource
  }

  predicate isSink(DataFlow::Node sink) {
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
  }
}

module XssFlow = TaintTracking::Global<XssConfig>;

from DataFlow::Node source, DataFlow::Node sink
where XssFlow::flow(source, sink)
select sink, "XSS vulnerability from $@.", source, "user input"
