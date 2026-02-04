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

/**
 * A JUnit 4 test method annotated with @Test from org.junit.Test
 */
class JUnit4TestMethod extends Method {
  JUnit4TestMethod() {
    this.getAnAnnotation().getType().hasQualifiedName("org.junit", "Test")
  }
}

/**
 * A JUnit 5 (Jupiter) test method annotated with @Test from org.junit.jupiter.api.Test
 */
class JUnitJupiterTestMethod extends Method {
  JUnitJupiterTestMethod() {
    this.getAnAnnotation().getType().hasQualifiedName("org.junit.jupiter.api", "Test")
  }
}

/**
 * A test method from either JUnit 4 or JUnit 5
 */
class TestMethod extends Method {
  TestMethod() {
    this instanceof JUnit4TestMethod or
    this instanceof JUnitJupiterTestMethod
  }
}

/**
 * A call to assertThrows() in JUnit 4 or JUnit 5 within a test method
 */
class AssertThrowsCall extends MethodCall {
  TestMethod enclosingTest;

  AssertThrowsCall() {
    this.getMethod().hasName("assertThrows") and
    this.getEnclosingCallable() = enclosingTest
  }

  /** Gets the lambda expression body if present */
  Expr getLambdaExprBody() {
    exists(LambdaExpr le |
      le = this.getAChildExpr() and
      result = le.getExprBody()
    )
  }

  /** Gets the enclosing test method */
  TestMethod getEnclosingTestMethod() { result = enclosingTest }
}

/**
 * A call to fail() within a try block, used to assert expected exceptions
 */
class FailInTryBlock extends MethodCall {
  TryStmt tryStmt;
  TestMethod enclosingTest;

  FailInTryBlock() {
    this.getMethod().hasName("fail") and
    tryStmt.getBlock().getAChild() = this.getEnclosingStmt() and
    tryStmt.getEnclosingCallable() = enclosingTest
  }

  /** Gets the try statement containing this fail() call */
  TryStmt getTryStmt() { result = tryStmt }

  /** Gets the enclosing test method */
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
