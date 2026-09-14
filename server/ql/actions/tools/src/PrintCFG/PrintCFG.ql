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
import ExternalPredicates

/**
 * Gets a single source file from the comma-separated list.
 */
string getSelectedSourceFile() {
  exists(string s | selectedSourceFiles(s) | result = s.splitAt(",").trim())
}

/**
 * Holds if this CFG node should be included in output.
 *
 * Unfiltered, this query emits every node in the database, which for a real repository is
 * unbounded rather than merely large. Matching is done on the location's own strings because
 * the actions library does not expose a `File` type the way the other languages' libraries do.
 */
predicate shouldPrintNode(Node node) {
  exists(string selectedFile | selectedFile = getSelectedSourceFile() |
    // Match by exact relative path from source root
    node.getLocation().getFile().getRelativePath() = selectedFile
    or
    // Match by file name if no path separators
    not selectedFile.matches("%/%") and
    node.getLocation().getFile().getBaseName() = selectedFile
    or
    // Match by ending path component
    exists(string absolute | absolute = node.getLocation().getFile().getAbsolutePath() |
      absolute = selectedFile
      or
      absolute.length() > selectedFile.length() and
      absolute.suffix(absolute.length() - selectedFile.length() - 1) = "/" + selectedFile
    )
  )
}

/**
 * Configuration for PrintCFG that outputs filtered CFG nodes and edges.
 */
query predicate nodes(Node node, string property, string value) {
  shouldPrintNode(node) and
  property = "semmle.label" and
  value = node.toString()
}

query predicate edges(Node pred, Node succ) {
  shouldPrintNode(pred) and
  shouldPrintNode(succ) and
  pred.getASuccessor() = succ
}
