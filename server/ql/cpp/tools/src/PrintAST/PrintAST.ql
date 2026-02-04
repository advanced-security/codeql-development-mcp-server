/**
 * @name Print AST for cpp
 * @description Outputs a representation of the Abstract Syntax Tree for specified source files.
 * @id cpp/tools/print-ast
 * @kind graph
 * @tags ast
 */

import cpp
import semmle.code.cpp.PrintAST

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
  override predicate shouldPrintDeclaration(Declaration decl) {
    // Use external predicate if available
    decl.getFile() = getSelectedFile()
    or
    // Fallback for unit tests: include test files
    (
      not exists(getSelectedFile()) and
      decl.getFile().getParentContainer().getParentContainer().getBaseName() = "test"
    )
  }
}
