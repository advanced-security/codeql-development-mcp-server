/**
 * @name Print CFG for csharp
 * @description Produces a representation of a file's Control Flow Graph for specified source files.
 * @id csharp/tools/print-cfg
 * @kind graph
 * @tags cfg
 */

import csharp
import semmle.code.csharp.controlflow.ControlFlowGraph

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
