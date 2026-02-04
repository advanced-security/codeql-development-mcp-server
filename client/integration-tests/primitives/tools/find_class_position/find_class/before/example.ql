/**
 * Test CodeQL query for find_class_position integration test
 * This query contains a class definition that can be found by the position finder tool
 */

import java

class TestClass extends RefType {
  TestClass() { 
    this.hasName("TestClass") 
  }
  
  predicate hasTestMethod() {
    exists(Method m | 
      m.getDeclaringType() = this and
      m.getName() = "testMethod"
    )
  }
}

from TestClass tc
where tc.hasTestMethod()
select tc, "This is a test class with a test method"