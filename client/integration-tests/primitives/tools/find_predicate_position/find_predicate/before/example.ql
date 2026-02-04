/**
 * Test CodeQL query for find_predicate_position integration test
 * This query contains a predicate definition that can be found by the position finder tool
 */

import java

predicate testPredicate(Method m) {
  m.getName() = "test" and
  m.getNumberOfParameters() = 0
}

class TestClass extends RefType {
  TestClass() { 
    this.hasName("TestClass") 
  }
  
  predicate hasTestMethod() {
    exists(Method m | 
      m.getDeclaringType() = this and
      testPredicate(m)
    )
  }
}

from TestClass tc
where tc.hasTestMethod()
select tc, "This is a test class with a test method"