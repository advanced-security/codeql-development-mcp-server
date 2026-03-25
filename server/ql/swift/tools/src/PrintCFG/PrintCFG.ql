/**
 * @name Print CFG for swift
 * @description Produces a representation of a file's Control Flow Graph for specified source files.
 * @id swift/tools/print-cfg
 * @kind graph
 * @tags cfg
 */

import swift
import codeql.swift.controlflow.ControlFlowGraph
import ExternalPredicates

/**
 * Gets a single source file from the comma-separated list.
 */
string getSelectedSourceFile() {
  exists(string s | selectedSourceFiles(s) | result = s.splitAt(",").trim())
}

/**
 * Gets a file by matching against the selected source file paths.
 */
File getSelectedFile() {
  exists(string selectedFile |
    selectedFile = getSelectedSourceFile() and
    (
      // Match by exact relative path from source root
      result.getRelativePath() = selectedFile
      or
      // Match by file name if no path separators
      not selectedFile.matches("%/%") and result.getBaseName() = selectedFile
      or
      // Match by ending path component
      result.getAbsolutePath().suffix(result.getAbsolutePath().length() - selectedFile.length()) =
        selectedFile
    )
  )
}

/**
 * Holds if this CFG node should be included in output.
 */
predicate shouldPrintNode(ControlFlowNode node) { node.getLocation().getFile() = getSelectedFile() }

/**
 * Configuration for PrintCFG that outputs filtered CFG nodes and edges.
 */
query predicate nodes(ControlFlowNode node, string property, string value) {
  shouldPrintNode(node) and
  property = "semmle.label" and
  value = node.toString()
}

query predicate edges(ControlFlowNode pred, ControlFlowNode succ) {
  shouldPrintNode(pred) and
  shouldPrintNode(succ) and
  pred.getASuccessor() = succ
}
