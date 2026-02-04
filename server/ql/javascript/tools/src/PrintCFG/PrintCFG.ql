/**
 * @name Print CFG for javascript
 * @description Produces a representation of a file's Control Flow Graph for specified source files.
 * @id javascript/tools/print-cfg
 * @kind graph
 * @tags cfg
 */

import javascript

/**
 * Configuration for PrintCFG that outputs all CFG nodes and edges.
 */
query predicate nodes(ControlFlowNode node, string property, string value) {
  property = "semmle.label" and
  value = node.toString()
}

query predicate edges(ControlFlowNode pred, ControlFlowNode succ) {
  pred.getASuccessor() = succ
}
