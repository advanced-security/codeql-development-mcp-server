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

/**
 * Configuration for PrintAST that uses test directory structure (maintains original behavior for unit tests).
 */
class Cfg extends PrintAstConfiguration {
  override predicate shouldPrintNode(PrintAstNode n) {
    super.shouldPrintNode(n) and
    // Only include source files with a `test` directory structure
    (
      // For a file located under some `test/*/.github/workflows` directory structure
      n.getLocation()
          .getFile()
          .getParentContainer()
          .getParentContainer()
          .getParentContainer()
          .getParentContainer()
          .getBaseName() = "test"
      or
      // For a file located under some `test/*/*/action.yml` directory structure
      n.getLocation()
          .getFile()
          .getParentContainer()
          .getParentContainer()
          .getParentContainer()
          .getBaseName() = "test" and
      n.getLocation().getFile().getBaseName() = "action.yml"
    )
  }
}
