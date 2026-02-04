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
 * Gets the exception types that a method declares it may throw
 */
class ThrowingMethod extends Method {
  ThrowingMethod() {
    exists(this.getAnException())
  }

  /** Gets an exception type from the throws clause */
  RefType getDeclaredExceptionType() {
    result = this.getAnException().getType()
  }
}

from MethodCall mc, TestMethod tm, ThrowingMethod target
where
  // The method call is within a test method (directly or in a lambda)
  mc.getEnclosingCallable().getEnclosingCallable*() = tm and
  // The called method declares exceptions
  mc.getMethod() = target
select mc, "Method call to " + target.getName() + " may throw: " + target.getDeclaredExceptionType().getName()
