/**
 * @name Print AST for actions
 * @description Outputs a representation of the Abstract Syntax Tree for specified source files.
 * @id actions/tools/print-ast
 * @kind graph
 * @tags ast
 */

private import codeql.actions.ideContextual.IDEContextual
import codeql.actions.ideContextual.printAst
private import codeql.actions.Ast
import ExternalPredicates

/**
 * Gets a single source file from the comma-separated list.
 */
string getSelectedSourceFile() {
  exists(string s | selectedSourceFiles(s) | result = s.splitAt(",").trim())
}

/**
 * Configuration for PrintAST that uses external predicates to specify source files.
 *
 * Matching is done on the location's own strings because the actions library does not expose a
 * `File` type the way the other languages' libraries do.
 */
class Cfg extends PrintAstConfiguration {
  override predicate shouldPrintNode(PrintAstNode n) {
    super.shouldPrintNode(n) and
    exists(string selectedFile | selectedFile = getSelectedSourceFile() |
      // Match by exact relative path from source root
      n.getLocation().getFile().getRelativePath() = selectedFile
      or
      // Match by file name if no path separators
      not selectedFile.matches("%/%") and n.getLocation().getFile().getBaseName() = selectedFile
      or
      // Match by ending path component
      exists(string absolute | absolute = n.getLocation().getFile().getAbsolutePath() |
        absolute = selectedFile
        or
        absolute.length() > selectedFile.length() and
        absolute.suffix(absolute.length() - selectedFile.length() - 1) = "/" + selectedFile
      )
    )
  }
}
