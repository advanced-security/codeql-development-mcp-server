/**
 * @name Basic XSS taint tracking
 * @description Track taint from user input to XSS sinks
 * @kind problem
 * @id js/workshop/xss-basic-taint
 * @problem.severity error
 */

import javascript

// TODO: Implement the XssConfig module using DataFlow::ConfigSig
// This module defines how taint flows from sources to sinks.
//
// Hint: You need two predicates:
//   - isSource(DataFlow::Node source): identify user-controlled inputs
//     (use RemoteFlowSource from Exercise 2)
//   - isSink(DataFlow::Node sink): identify dangerous DOM operations
//     (use the sink patterns from Exercise 1)
module XssConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) {
    // TODO: Implement - use RemoteFlowSource
    none()
  }

  predicate isSink(DataFlow::Node sink) {
    // TODO: Implement - reuse sink patterns from Exercise 1
    none()
  }
}

// Instantiate the taint-tracking analysis
module XssFlow = TaintTracking::Global<XssConfig>;

from DataFlow::Node source, DataFlow::Node sink
where XssFlow::flow(source, sink)
select sink, "XSS vulnerability from $@.", source, "user input"
