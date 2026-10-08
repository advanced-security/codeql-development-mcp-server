/**
 * @name Print AST for actions
 * @description Outputs a representation of the Abstract Syntax Tree for specified source files.
 * @id actions/tools/print-ast
 * @kind graph
 * @tags ast
 */

private import codeql.actions.ideContextual.IDEContextual
private import codeql.actions.ideContextual.printAst as ActionsAst
private import codeql.actions.Lock
private import codeql.actions.ast.internal.Yaml
private import codeql.Locations
import ExternalPredicates

/**
 * Gets a single source file from the comma-separated list.
 */
string getSelectedSourceFile() {
  exists(string s | selectedSourceFiles(s) | result = s.splitAt(",").trim())
}

predicate isSelectedFile(File file) {
  exists(string selectedFile | selectedFile = getSelectedSourceFile() |
    file.getRelativePath() = selectedFile
    or
    not selectedFile.matches("%/%") and file.getBaseName() = selectedFile
    or
    exists(string absolute | absolute = file.getAbsolutePath() |
      absolute = selectedFile
      or
      absolute.length() > selectedFile.length() and
      absolute.suffix(absolute.length() - selectedFile.length() - 1) = "/" + selectedFile
    )
  )
}

class Cfg extends ActionsAst::PrintAstConfiguration {
  override predicate shouldPrintNode(ActionsAst::PrintAstNode node) {
    super.shouldPrintNode(node) and
    isSelectedFile(node.getLocation().getFile()) and
    not exists(ActionsLock lock | lock.getFile() = node.getLocation().getFile())
  }
}

newtype TTreeNode =
  TActionNode(ActionsAst::PrintAstNode node) { any(Cfg config).shouldPrintNode(node) } or
  TLockNode(YamlNode node) {
    node.getDocument() instanceof ActionsLock and
    isSelectedFile(node.getFile())
  }

class TreeNode extends TTreeNode {
  Location getLocation() {
    exists(ActionsAst::PrintAstNode node | this = TActionNode(node) and result = node.getLocation())
    or
    exists(YamlNode node | this = TLockNode(node) and result = node.getLocation())
  }

  string getProperty(string key) {
    exists(ActionsAst::PrintAstNode node |
      this = TActionNode(node) and result = node.getProperty(key)
    )
    or
    exists(YamlNode node | this = TLockNode(node) |
      key = "semmle.label" and
      (
        node instanceof ActionsLock and
        result = "[ActionsLock] " + node.getFile().getRelativePath()
        or
        not node instanceof ActionsLock and
        exists(string label |
          if node instanceof YamlScalar
          then label = node.(YamlScalar).getValue()
          else label = node.toString()
        |
          result = "[" + concat(node.getAPrimaryQlClass(), ", ") + "] " + label
        )
      )
      or
      key = "semmle.order" and
      exists(int position |
        node =
          rank[position](YamlNode sibling |
            sibling.getDocument() = node.getDocument()
          |
            sibling
            order by
              sibling.getLocation().getStartLine(), sibling.getLocation().getStartColumn(),
              sibling.getLocation().getEndLine(), sibling.getLocation().getEndColumn()
          ) and
        result = position.toString()
      )
    )
  }

  TreeNode getChild(string name) {
    exists(ActionsAst::PrintAstNode parent, ActionsAst::PrintAstNode child |
      this = TActionNode(parent) and child = parent.getChild(name) and result = TActionNode(child)
    )
    or
    exists(YamlNode parent, YamlNode child, int index |
      this = TLockNode(parent) and
      child =
        rank[index](YamlNode candidate |
          candidate.getParentNode() = parent
        |
          candidate
          order by
            candidate.getLocation().getStartLine(), candidate.getLocation().getStartColumn(),
            candidate.getLocation().getEndLine(), candidate.getLocation().getEndColumn()
        ) and
      name = index.toString() and
      result = TLockNode(child)
    )
  }

  string toString() { result = this.getProperty("semmle.label") }
}

query predicate nodes(TreeNode node, string key, string value) { value = node.getProperty(key) }

query predicate edges(TreeNode source, TreeNode target, string key, string value) {
  target = source.getChild(_) and
  (
    key = "semmle.label" and
    value = strictconcat(string name | source.getChild(name) = target | name, "/")
    or
    key = "semmle.order" and value = target.getProperty("semmle.order")
  )
}

query predicate graphProperties(string key, string value) {
  key = "semmle.graphKind" and value = "tree"
}
