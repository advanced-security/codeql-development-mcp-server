/**
 * @name Print CFG for actions
 * @description Produces a representation of a file's Control Flow Graph for specified source files.
 * @id actions/tools/print-cfg
 * @kind graph
 * @tags cfg
 */

import codeql.actions.Ast
private import codeql.actions.Cfg
import codeql.actions.controlflow.BasicBlocks

/**
 * Configuration for PrintCFG that outputs all CFG nodes and edges.
 */
query predicate nodes(Node node, string property, string value) {
  property = "semmle.label" and
  value = node.toString()
}

query predicate edges(Node pred, Node succ) {
  pred.getASuccessor() = succ
}
