/**
 * @name Print CFG for ruby
 * @description Produces a representation of a file's Control Flow Graph for specified source files.
 * @id ruby/tools/print-cfg
 * @kind graph
 * @tags cfg
 */

private import codeql.ruby.AST
private import codeql.ruby.controlflow.ControlFlowGraph

/**
 * Configuration for PrintCFG that outputs all CFG nodes and edges.
 */
query predicate nodes(CfgNode node, string property, string value) {
  property = "semmle.label" and
  value = node.toString()
}

query predicate edges(CfgNode pred, CfgNode succ) {
  pred.getASuccessor() = succ
}
