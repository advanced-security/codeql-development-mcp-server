/**
 * @id java/workshop/exercise4-method-testing-isolated-exception
 * @name Exercise 4: Detect Non-Isolated Exception Testing
 * @description Tests for checked exceptions should explicitly map a single method invocation 
 *              to expected exception type. When multiple methods in the same assertion can throw
 *              the same exception, the test is ambiguous.
 * @kind problem
 * @precision high
 * @problem.severity warning
 * @tags correctness
 *       maintainability
 *       readability
 *       workshop
 */

import java

// ============================================================
// PART 1: JUnit Test Method Identification
// ============================================================

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

// ============================================================
// PART 2: Exception-Throwing Method Calls
// ============================================================

/**
 * An exception type that can be thrown (checked exception).
 */
class ExceptionType extends RefType {
  ExceptionType() {
    this.getASupertype*().hasQualifiedName("java.lang", "Exception") and
    not this.getASupertype*().hasQualifiedName("java.lang", "RuntimeException")
  }
}

/**
 * A method call that may throw a checked exception
 */
class ThrowingMethodCall extends MethodCall {
  ExceptionType exceptionType;

  ThrowingMethodCall() {
    exceptionType = this.getMethod().getAnException().getType()
  }

  /** Gets an exception type this method call may throw */
  ExceptionType getAnExceptionType() { result = exceptionType }
}

// ============================================================
// PART 3: JUnit Exception Test Assertions
// ============================================================

/**
 * assertThrows() call pattern
 */
class JUnitAssertThrows extends MethodCall {
  TestMethod enclosingTest;

  JUnitAssertThrows() {
    this.getMethod().hasName("assertThrows") and
    (
      this.getEnclosingCallable() instanceof JUnit4TestMethod or
      this.getEnclosingCallable() instanceof JUnitJupiterTestMethod
    ) and
    enclosingTest = this.getEnclosingCallable()
  }

  TestMethod getEnclosingTestMethod() { result = enclosingTest }

  Expr getLambdaExprBody() {
    exists(LambdaExpr le |
      le = this.getAChildExpr() and
      result = le.getExprBody()
    )
  }
}

/**
 * fail() in try block pattern
 */
class JUnitAssertFail extends MethodCall {
  TryStmt tryBlock;
  TestMethod enclosingTest;

  JUnitAssertFail() {
    this.getMethod().hasName("fail") and
    tryBlock.getBlock().getAChild() = this.getEnclosingStmt() and
    (
      tryBlock.getEnclosingCallable() instanceof JUnit4TestMethod or
      tryBlock.getEnclosingCallable() instanceof JUnitJupiterTestMethod
    ) and
    enclosingTest = tryBlock.getEnclosingCallable()
  }

  TestMethod getEnclosingTestMethod() { result = enclosingTest }

  Stmt getEnclosingTryBlock() { result = tryBlock.getBlock() }

  MethodCall getAMethodCallUnderTest() {
    result != this and
    result.getAnEnclosingStmt() = tryBlock.getBlock().getAChild() and
    (
      result.getLocation().getStartLine() < this.getLocation().getStartLine()
      or
      result.getLocation().getStartLine() = this.getLocation().getStartLine() and
      result.getLocation().getStartColumn() < this.getLocation().getStartColumn()
    )
  }
}

// ============================================================
// PART 4: Method Calls Within Test Assertions
// ============================================================

/**
 * A method call that is part of an exception test assertion
 * and may throw a checked exception
 */
class ThrowingMethodCallInTestMethod extends ThrowingMethodCall {
  TestMethod tm;
  MethodCall testAssertion;

  ThrowingMethodCallInTestMethod() {
    // Pattern 1: Method call within assertThrows lambda
    exists(JUnitAssertThrows assertThrows |
      tm = this.getEnclosingCallable().getEnclosingCallable() and
      assertThrows = testAssertion and
      assertThrows.getEnclosingTestMethod() = tm and
      (
        assertThrows.getLambdaExprBody() = this or
        assertThrows.getLambdaExprBody() = this.getParent()
      )
    )
    or
    // Pattern 2: Method call within try block with fail()
    exists(JUnitAssertFail assertFail |
      tm = assertFail.getEnclosingTestMethod() and
      assertFail = testAssertion and
      assertFail.getAMethodCallUnderTest() = this
    )
  }

  MethodCall getEnclosingTestAssertion() { result = testAssertion }

  TestMethod getEnclosingTestMethod() { result = tm }
}

// ============================================================
// PART 5: Main Query - Find Non-Isolated Exception Tests
// ============================================================

from
  TestMethod tm, ExceptionType et, ThrowingMethodCallInTestMethod tmc1,
  ThrowingMethodCallInTestMethod tmc2
where
  // The throwing method calls under test are distinct calls
  tmc1 != tmc2 and
  // The method calls may throw the same checked exception type
  tmc1.getAnExceptionType() = et and
  tmc2.getAnExceptionType() = et and
  // Both calls are within the same test method
  tmc1.getEnclosingTestMethod() = tm and
  tmc2.getEnclosingTestMethod() = tm and
  // Both calls are associated with the same test assertion
  tmc1.getEnclosingTestAssertion() = tmc2.getEnclosingTestAssertion() and
  // Avoid duplicate results by ordering
  (
    tmc1.getLocation().getStartLine() < tmc2.getLocation().getStartLine()
    or
    tmc1.getLocation().getStartLine() = tmc2.getLocation().getStartLine() and
    tmc1.getLocation().getStartColumn() < tmc2.getLocation().getStartColumn()
  )
select tmc1,
  "$@ contains more than one $@ which may throw checked exception type '" + et.toString() + "'.",
  tm, "Test method", tmc2, "method call"
