/**
 * @name Print AST for go
 * @description Outputs a representation of the Abstract Syntax Tree for specified source files.
 * @id go/tools/print-ast
 * @kind graph
 * @tags ast
 */

import go
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
 * Holds if the given file should be printed.
 * Uses the external predicate if available, otherwise falls back to test files.
 */
private predicate isSelectedFile(File file) { file = getSelectedFile() }

// Standalone PrintAST implementation for Go.
//
// This avoids extending the library's `PrintAstConfiguration` (which is inside
// an `overlay[local]` module in `go-all`) by directly using the Go AST API.
// File filtering is applied at the source level for efficiency.
/** Gets the enclosing function declaration for `n`, if any. */
private FuncDecl getEnclosingFunctionDecl(AstNode n) { result = n.getParent*() }

/**
 * Holds if `ast` should be included in the printed AST.
 * Restricts to selected files and excludes comments for deterministic output.
 */
private predicate shouldPrint(AstNode ast) {
  isSelectedFile(ast.getFile()) and
  // Print nodes without an enclosing function (e.g. file headers)
  forall(FuncDecl f | f = getEnclosingFunctionDecl(ast) | isSelectedFile(f.getFile())) and
  // Exclude comments for deterministic output
  not ast instanceof Comment and
  not ast instanceof CommentGroup and
  exists(ast.getLocation())
}

/** Gets the QL class label for an AST node. */
private string qlClass(AstNode el) { result = "[" + concat(el.getAPrimaryQlClass(), ", ") + "] " }

/** Gets the default string representation for an AST node. */
private string nodeToString(AstNode ast) {
  if ast instanceof File
  then result = qlClass(ast) + ast.(File).getRelativePath()
  else result = qlClass(ast) + ast.toString()
}

/**
 * Gets the child at `childIndex` for `ast`, with special handling
 * for `File` nodes (package name expression is moved to index 0).
 * Comments are excluded from the child list.
 */
private AstNode getChild(AstNode ast, int childIndex) {
  if ast instanceof File and exists(ast.(File).getPackageNameExpr())
  then
    exists(AstNode packageNode, int oldPackageIndex |
      ast.getUniquelyNumberedChild(oldPackageIndex) = packageNode and
      packageNode = ast.(File).getPackageNameExpr() and
      (
        childIndex = 0 and result = packageNode
        or
        result =
          rank[childIndex](AstNode node, int i |
            node = ast.getUniquelyNumberedChild(i) and
            i != oldPackageIndex and
            not node instanceof Comment and
            not node instanceof CommentGroup
          |
            node order by i
          )
      )
    )
  else
    result =
      rank[childIndex](AstNode node, int i |
        node = ast.getUniquelyNumberedChild(i) and
        not node instanceof Comment and
        not node instanceof CommentGroup
      |
        node order by i
      )
}

/** Gets the edge label from `ast` to its child at `childIndex`. */
private string getChildEdgeLabel(AstNode ast, int childIndex) {
  exists(getChild(ast, childIndex)) and
  if
    ast instanceof File and
    exists(ast.(File).getPackageNameExpr()) and
    getChild(ast, childIndex) = ast.(File).getPackageNameExpr()
  then result = "package"
  else result = childIndex.toString()
}

/** Holds if `node` belongs to the output tree, and its property `key` has the given `value`. */
query predicate nodes(AstNode node, string key, string value) {
  shouldPrint(node) and
  (
    key = "semmle.label" and value = nodeToString(node)
    or
    node instanceof Expr and
    (
      key = "Value" and
      value = qlClass(node) + node.(Expr).getExactValue()
      or
      key = "Type" and
      not node.(Expr).getType() instanceof InvalidType and
      value = node.(Expr).getType().pp()
    )
    or
    node instanceof File and
    key = "semmle.order" and
    value =
      any(int i |
        node = rank[i](File fn | isSelectedFile(fn) | fn order by fn.getRelativePath())
      |
        i
      ).toString()
  )
}

/** Holds if `target` is a child of `source` in the AST. */
query predicate edges(AstNode source, AstNode target, string key, string value) {
  shouldPrint(source) and
  shouldPrint(target) and
  exists(int childIndex |
    target = getChild(source, childIndex) and
    (
      key = "semmle.label" and value = getChildEdgeLabel(source, childIndex)
      or
      key = "semmle.order" and value = childIndex.toString()
    )
  )
}

/** Holds if property `key` of the graph has the given `value`. */
query predicate graphProperties(string key, string value) {
  key = "semmle.graphKind" and value = "tree"
}
