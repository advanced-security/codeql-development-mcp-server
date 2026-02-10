/**
 * @name Client-side cross-site scripting
 * @description Writing user input directly to DOM properties allows for XSS
 * @kind path-problem
 * @id js/workshop/xss-path
 * @problem.severity error
 * @security-severity 7.8
 * @precision high
 * @tags security
 *       external/cwe/cwe-079
 */

import javascript

module XssFullConfig implements DataFlow::ConfigSig {
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

module XssFullFlow = TaintTracking::Global<XssFullConfig>;

import XssFullFlow::PathGraph

from XssFullFlow::PathNode source, XssFullFlow::PathNode sink
where XssFullFlow::flowPath(source, sink)
select sink.getNode(), source, sink, "XSS vulnerability due to $@.", source.getNode(),
  "user-provided value"
