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
 * Holds if the node is an entry- or exit-related CFG node.
 * These nodes are excluded from the output because their ordering
 * is non-deterministic across CodeQL CLI versions and environments.
 */
private predicate isEntryOrExitNode(ControlFlowNode node) {
  node.toString().matches("%Exit") or
  node.toString() = "Entry"
}

/**
 * Configuration for PrintCFG that outputs all CFG nodes and edges,
 * excluding entry and exit nodes for deterministic output.
 */
query predicate nodes(ControlFlowNode node, string property, string value) {
  property = "semmle.label" and
  value = node.toString() and
  not isEntryOrExitNode(node)
}

query predicate edges(ControlFlowNode pred, ControlFlowNode succ) {
  pred.getASuccessor() = succ and
  not isEntryOrExitNode(pred) and
  not isEntryOrExitNode(succ)
}
