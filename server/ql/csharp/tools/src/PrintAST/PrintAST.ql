/**
 * @name Print AST for csharp
 * @description Outputs a representation of the Abstract Syntax Tree for specified source files.
 * @id csharp/tools/print-ast
 * @kind graph
 * @tags ast
 */

import csharp
import semmle.code.csharp.PrintAst

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
 * Falls back to all files when external predicates are not available (for unit tests).
 */
class Cfg extends PrintAstConfiguration {
  override predicate shouldPrint(Element e, Location l) {
    super.shouldPrint(e, l) and
    (
      // Use external predicate if available
      l.getFile() = getSelectedFile()
      or
      // Fallback for unit tests: include all files
      not exists(getSelectedFile())
    )
  }
}
