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
 * TODO: Create a class that identifies JUnit 4 test methods.
 * 
 * Hint: JUnit 4 test methods are annotated with @Test from org.junit.Test
 * Use: this.getAnAnnotation().getType().hasQualifiedName("org.junit", "Test")
 */
class JUnit4TestMethod extends Method {
  JUnit4TestMethod() {
    // TODO: Implement the characteristic predicate
    none()
  }
}

/**
 * TODO: Create a class that identifies JUnit 5 (Jupiter) test methods.
 * 
 * Hint: JUnit 5 test methods are annotated with @Test from org.junit.jupiter.api.Test
 */
class JUnitJupiterTestMethod extends Method {
  JUnitJupiterTestMethod() {
    // TODO: Implement the characteristic predicate
    none()
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
