/**
 * @name XSS with sanitizer barriers
 * @description Track taint with sanitizer functions as barriers
 * @kind problem
 * @id js/workshop/xss-barriers
 * @problem.severity error
 */

import javascript

module XssWithBarriersConfig implements DataFlow::ConfigSig {
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

  predicate isBarrier(DataFlow::Node node) {
    exists(DataFlow::CallNode sanitizeCall |
      sanitizeCall.getCalleeName() =
        ["sanitize", "encodeHTML", "escapeHtml", "encodeURIComponent"] and
      node = sanitizeCall
    )
  }
}

module XssWithBarriersFlow = TaintTracking::Global<XssWithBarriersConfig>;

from DataFlow::Node source, DataFlow::Node sink
where XssWithBarriersFlow::flow(source, sink)
select sink, "XSS vulnerability from $@.", source, "user input"
