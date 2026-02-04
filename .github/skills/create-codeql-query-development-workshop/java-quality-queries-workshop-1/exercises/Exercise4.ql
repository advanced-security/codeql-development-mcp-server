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
// PART 1: JUnit Test Method Identification (from Exercise 1)
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
// PART 2: Exception Types (checked exceptions only)
// ============================================================

/**
 * TODO: Create a class that represents checked exception types.
 * 
 * Hint: A checked exception extends java.lang.Exception but NOT java.lang.RuntimeException
 */
class ExceptionType extends RefType {
  ExceptionType() {
    // TODO: Check that this type is a checked exception
    none()
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

  ExceptionType getAnExceptionType() { result = exceptionType }
}

// ============================================================
// PART 3: JUnit Exception Test Assertions (from Exercise 3)
// ============================================================

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
 * TODO: Create a class that identifies throwing method calls within test assertions.
 * 
 * This should identify method calls that:
 * 1. Are inside an assertThrows() lambda body, OR
 * 2. Are inside a try block before a fail() call
 * 
 * Fields needed:
 * - tm: The enclosing TestMethod
 * - testAssertion: The assertion method call (assertThrows or fail)
 */
class ThrowingMethodCallInTestMethod extends ThrowingMethodCall {
  TestMethod tm;
  MethodCall testAssertion;

  ThrowingMethodCallInTestMethod() {
    // TODO: Pattern 1 - Method call within assertThrows lambda
    // Hint: Use JUnitAssertThrows and check getLambdaExprBody()
    
    // TODO: Pattern 2 - Method call within try block with fail()
    // Hint: Use JUnitAssertFail and check getAMethodCallUnderTest()
    
    none()
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
