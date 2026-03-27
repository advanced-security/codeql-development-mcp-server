/**
 * @name Print AST for ruby
 * @description Outputs a representation of the Abstract Syntax Tree for specified source files.
 * @id ruby/tools/print-ast
 * @kind graph
 * @tags ast
 */

private import codeql.ruby.AST
private import codeql.ruby.printAst
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
 * Configuration for PrintAST that uses external predicates to specify source files.
 * Falls back to all files when external predicates are not available (for unit tests).
 */
class Cfg extends PrintAstConfiguration {
  override predicate shouldPrintNode(AstNode n) {
    super.shouldPrintNode(n) and
    n.getLocation().getFile() = getSelectedFile()
  }
}
