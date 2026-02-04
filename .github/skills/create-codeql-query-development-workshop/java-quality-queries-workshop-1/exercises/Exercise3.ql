/**
 * @id java/workshop/exercise3-assert-throws-patterns
 * @name Exercise 3: Find assertThrows and fail() Test Assertions
 * @description Identify JUnit exception testing patterns including assertThrows() 
 *              calls and try-catch blocks with fail() assertions.
 * @kind problem
 * @precision high
 * @problem.severity recommendation
 * @tags correctness
 *       testing
 *       workshop
 */

import java

class JUnit4TestMethod extends Method {
  JUnit4TestMethod() {
    this.getAnAnnotation().getType().hasQualifiedName("org.junit", "Test")
  }
}

class JUnitJupiterTestMethod extends Method {
  JUnitJupiterTestMethod() {
    this.getAnAnnotation().getType().hasQualifiedName("org.junit.jupiter.api", "Test")
  }
}

class TestMethod extends Method {
  TestMethod() {
    this instanceof JUnit4TestMethod or
    this instanceof JUnitJupiterTestMethod
  }
}

/**
 * TODO: Create a class that identifies assertThrows() calls within test methods.
 * 
 * Hint: Check that the method name is "assertThrows" and it's inside a test method.
 * Also extract the lambda expression body using getAChildExpr() to find LambdaExpr.
 */
class AssertThrowsCall extends MethodCall {
  TestMethod enclosingTest;

  AssertThrowsCall() {
    // TODO: Check method name is "assertThrows"
    // TODO: Check enclosing callable is a test method
    none()
  }

  /** Gets the lambda expression body if present */
  Expr getLambdaExprBody() {
    exists(LambdaExpr le |
      le = this.getAChildExpr() and
      result = le.getExprBody()
    )
  }

  TestMethod getEnclosingTestMethod() { result = enclosingTest }
}

/**
 * TODO: Create a class that identifies fail() calls within try blocks.
 * 
 * Hint: 
 * - Check that the method name is "fail"
 * - Find the try statement that encloses this call
 * - Check that the try statement is within a test method
 */
class FailInTryBlock extends MethodCall {
  TryStmt tryStmt;
  TestMethod enclosingTest;

  FailInTryBlock() {
    // TODO: Check method name is "fail"
    // TODO: Check it's inside a try block
    // TODO: Check the try block is in a test method
    none()
  }

  TryStmt getTryStmt() { result = tryStmt }

  TestMethod getEnclosingTestMethod() { result = enclosingTest }
}

from MethodCall assertion, TestMethod tm, string kind
where
  (
    assertion instanceof AssertThrowsCall and
    assertion.(AssertThrowsCall).getEnclosingTestMethod() = tm and
    kind = "assertThrows"
  )
  or
  (
    assertion instanceof FailInTryBlock and
    assertion.(FailInTryBlock).getEnclosingTestMethod() = tm and
    kind = "fail() in try block"
  )
select assertion, "Test method '" + tm.getName() + "' uses " + kind + " pattern for exception testing"
