/**
 * @id java/workshop/exercise1-test-methods
 * @name Exercise 1: Find JUnit Test Methods
 * @description Identify test methods in JUnit 4 and JUnit 5 test classes.
 *              This is the foundation for analyzing test exception patterns.
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

from TestMethod tm
select tm, "Found test method: " + tm.getName()
