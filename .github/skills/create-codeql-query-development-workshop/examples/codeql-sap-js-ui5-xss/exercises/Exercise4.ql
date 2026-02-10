/**
 * @name XSS with sanitizer barriers
 * @description Track taint with sanitizer functions as barriers
 * @kind problem
 * @id js/workshop/xss-barriers
 * @problem.severity error
 */

import javascript

// TODO: Implement XssWithBarriersConfig
// This extends Exercise 3 by adding an isBarrier predicate that blocks
// taint flow through sanitizer functions.
//
// Hint: The isBarrier predicate identifies nodes where taint is neutralized.
//       Look for calls to functions with sanitizer-like names:
//       "sanitize", "encodeHTML", "escapeHtml", "encodeURIComponent"
//       Use DataFlow::CallNode and getCalleeName() to match function names.
module XssWithBarriersConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) {
    // TODO: Implement - same as Exercise 3
    none()
  }

  predicate isSink(DataFlow::Node sink) {
    // TODO: Implement - same as Exercise 3
    none()
  }

  predicate isBarrier(DataFlow::Node node) {
    // TODO: Implement - block taint flow through sanitizer calls
    // Hint: Find DataFlow::CallNode instances whose callee name matches
    //       known sanitizer function names. The call node itself is the barrier.
    none()
  }
}

module XssWithBarriersFlow = TaintTracking::Global<XssWithBarriersConfig>;

from DataFlow::Node source, DataFlow::Node sink
where XssWithBarriersFlow::flow(source, sink)
select sink, "XSS vulnerability from $@.", source, "user input"
