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
 * Holds if the node is an exit-related CFG node.
 * These nodes are excluded from the output because their ordering
 * is non-deterministic across CodeQL CLI versions.
 */
private predicate isExitNode(ControlFlow::Node node) {
  node.toString().matches("%Exit")
}

/**
 * Configuration for PrintCFG that outputs all CFG nodes and edges,
 * excluding exit nodes for deterministic output.
 */
query predicate nodes(ControlFlow::Node node, string property, string value) {
  property = "semmle.label" and
  value = node.toString() and
  not isExitNode(node)
}

query predicate edges(ControlFlow::Node pred, ControlFlow::Node succ) {
  pred.getASuccessor() = succ and
  not isExitNode(pred) and
  not isExitNode(succ)
}
