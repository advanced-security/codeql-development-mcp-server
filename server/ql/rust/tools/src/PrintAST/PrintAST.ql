/**
 * @name Print AST for rust
 * @description Outputs a representation of the Abstract Syntax Tree for specified source files.
 * @id rust/tools/print-ast
 * @kind graph
 * @tags ast
 */

import rust
private import codeql.rust.printast.PrintAst
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
 * Holds if a locatable element should be printed in the AST output.
 * Restricts output to elements from the selected file.
 */
predicate shouldPrint(Locatable e) { e.getLocation().getFile() = getSelectedFile() }

import PrintAst<shouldPrint/1>
