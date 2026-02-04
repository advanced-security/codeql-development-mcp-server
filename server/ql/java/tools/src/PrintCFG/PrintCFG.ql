/**
 * @name Print CFG for java
 * @description Produces a representation of a file's Control Flow Graph for specified source files.
 * @id java/tools/print-cfg
 * @kind graph
 * @tags cfg
 */

import java
import semmle.code.java.ControlFlowGraph

/**
 * Configuration for PrintCFG that outputs all CFG nodes and edges.
 */
query predicate nodes(ControlFlow::Node node, string property, string value) {
  property = "semmle.label" and
  value = node.toString()
}

query predicate edges(ControlFlow::Node pred, ControlFlow::Node succ) {
  pred.getASuccessor() = succ
}
