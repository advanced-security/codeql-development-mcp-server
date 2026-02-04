/**
 * @name Print AST for javascript
 * @description Outputs a representation of the Abstract Syntax Tree for specified source files.
 * @id javascript/tools/print-ast
 * @kind graph
 * @tags ast
 */

import javascript
import semmle.javascript.PrintAst

/**
 * Gets the source files to generate AST from.
 * Can be a single file path or comma-separated list of file paths.
 */
external string selectedSourceFiles();

/**
 * Gets a single source file from the comma-separated list.
 */
string getSelectedSourceFile() {
  result = selectedSourceFiles().splitAt(",").trim()
}

/**
 * Gets a file by matching against the selected source file paths.
 */
File getSelectedFile() {
  exists(string selectedFile |
    selectedFile = getSelectedSourceFile() and
    (
      // Match by exact relative path from source root
      result.getRelativePath() = selectedFile or
      // Match by file name if no path separators
      (not selectedFile.matches("%/%") and result.getBaseName() = selectedFile) or
      // Match by ending path component
      result.getAbsolutePath().suffix(result.getAbsolutePath().length() - selectedFile.length()) = selectedFile
    )
  )
}

/**
 * Configuration for PrintAST that uses external predicates to specify source files.
 * Falls back to test directory structure when external predicates are not available.
 */
class Cfg extends PrintAstConfiguration {
  override predicate shouldPrint(Locatable e, Location l) {
    super.shouldPrint(e, l) and
    (
      // Use external predicate if available
      l.getFile() = getSelectedFile()
      or
      // Fallback for unit tests: include test files
      (
        not exists(getSelectedFile()) and
        l.getFile().getParentContainer().getParentContainer().getBaseName() = "test"
      )
    )
  }
}
