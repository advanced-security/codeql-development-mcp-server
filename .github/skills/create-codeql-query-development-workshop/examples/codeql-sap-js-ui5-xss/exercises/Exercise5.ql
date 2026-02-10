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

// TODO: Implement XssFullConfig
// This is the final, production-style query. It combines everything from
// Exercises 3 and 4, but uses @kind path-problem to show complete taint paths.
//
// Hint: The config is identical to Exercise 4's XssWithBarriersConfig.
//       The difference is in the query metadata (@kind path-problem) and
//       the from/where/select clause which uses PathNode instead of Node.
module XssFullConfig implements DataFlow::ConfigSig {
  predicate isSource(DataFlow::Node source) {
    // TODO: Implement - same as Exercise 4
    none()
  }

  predicate isSink(DataFlow::Node sink) {
    // TODO: Implement - same as Exercise 4
    none()
  }

  predicate isBarrier(DataFlow::Node node) {
    // TODO: Implement - same as Exercise 4
    none()
  }
}

module XssFullFlow = TaintTracking::Global<XssFullConfig>;

// TODO: Import the PathGraph module for path-problem visualization
// Hint: import XssFullFlow::PathGraph
import XssFullFlow::PathGraph

// TODO: Update the from/where/select to use PathNode
// Hint: Use XssFullFlow::PathNode instead of DataFlow::Node
//       Use XssFullFlow::flowPath(source, sink) instead of flow
//       Use source.getNode() and sink.getNode() for the select message
from XssFullFlow::PathNode source, XssFullFlow::PathNode sink
where XssFullFlow::flowPath(source, sink)
select sink.getNode(), source, sink, "XSS vulnerability due to $@.", source.getNode(),
  "user-provided value"
