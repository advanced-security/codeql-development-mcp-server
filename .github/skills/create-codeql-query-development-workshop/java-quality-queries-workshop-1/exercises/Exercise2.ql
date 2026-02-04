/**
 * @id java/workshop/exercise2-exception-throwing-methods
 * @name Exercise 2: Find Methods That Throw Checked Exceptions
 * @description Identify method calls within test methods that declare checked exceptions
 *              in their throws clause. These are candidates for exception testing analysis.
 * @kind problem
 * @precision high
 * @problem.severity recommendation
 * @tags correctness
 *       testing
 *       workshop
 */

import java

// Re-use the test method classes from Exercise 1
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
 * TODO: Create a class that identifies methods which declare checked exceptions.
 * 
 * Hint: Use this.getAnException() to get declared exceptions
 */
class ThrowingMethod extends Method {
  ThrowingMethod() {
    // TODO: Check if the method has any declared exceptions
    none()
  }

  /** 
   * TODO: Implement this predicate to get an exception type from the throws clause
   * 
   * Hint: Use this.getAnException().getType()
   */
  RefType getDeclaredExceptionType() {
    // TODO: Return the exception type
    none()
  }
}

from MethodCall mc, TestMethod tm, ThrowingMethod target
where
  // The method call is within a test method (directly or in a lambda)
  mc.getEnclosingCallable().getEnclosingCallable*() = tm and
  // The called method declares exceptions
  mc.getMethod() = target
select mc, "Method call to " + target.getName() + " may throw: " + target.getDeclaredExceptionType().getName()
